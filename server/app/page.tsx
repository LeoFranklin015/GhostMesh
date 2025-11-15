'use client'

import { useEffect, useState, useRef } from 'react'
import Dexie from 'dexie'

export default function ServerPage() {
  const [status, setStatus] = useState('🔄 Initializing...')
  const [credentials, setCredentials] = useState<{token: number, publicKey: string} | null>(null)
  const [messages, setMessages] = useState<Array<{timestamp: string, from: string, message: string}>>([])
  const [error, setError] = useState<string | null>(null)
  const dmDB = useRef<Dexie | null>(null)
  const cipherRef = useRef<any>(null)

  useEffect(() => {
    initializeServer()
  }, [])

  const initializeServer = async () => {
    try {
      setStatus('🔄 Loading xxdk-wasm...')
      
      // Dynamically import xxdk-wasm (symlinked)
      const xxdk = await import('xxdk-wasm')
      setStatus('✅ xxdk-wasm loaded successfully')

      setStatus('🔄 Initializing XXDK...')
      // Set the base path for WASM files BEFORE InitXXDK
      if (typeof window !== 'undefined') {
        xxdk.setXXDKBasePath(window.location.href + 'xxdk-wasm')
      }
      const xx = await xxdk.InitXXDK()
      setStatus('✅ XXDK initialized')

      setStatus('🔄 Loading NDF file...')
      const ndfResponse = await fetch('/ndf.json')
      const ndfJSON = await ndfResponse.json()
      const ndf = JSON.stringify(ndfJSON)
      setStatus('✅ NDF loaded')

      setStatus('🔄 Setting up CMix...')
      const statePath = 'xxServerState'
      const secret = Buffer.from('ServerPassword123')
      const cMixParamsJSON = Buffer.from('')
      
      // Try to load existing state, if it fails, create new
      let xxNet
      try {
        console.log('Attempting to load existing CMix state...')
        xxNet = await xx.LoadCmix(statePath, secret, cMixParamsJSON)
        console.log('✅ Loaded existing CMix state')
      } catch (loadError: any) {
        console.log('No existing state found, creating new CMix...', loadError.message)
        await xx.NewCmix(ndf, statePath, secret, '')
        xxNet = await xx.LoadCmix(statePath, secret, cMixParamsJSON)
        console.log('✅ Created and loaded new CMix state')
      }
      
      setStatus('✅ CMix client loaded')
      
      setStatus('🔄 Setting up Direct Messaging...')
      
      // Generate DM identity
      let dmIDStr = localStorage.getItem('serverDMID')
      if (dmIDStr === null) {
        console.log('Generating DM Identity...')
        dmIDStr = Buffer.from(xx.GenerateChannelIdentity(xxNet.GetID())).toString('base64')
        localStorage.setItem('serverDMID', dmIDStr)
      }
      console.log('Server DM ID: ' + dmIDStr)
      const dmID = new Uint8Array(Buffer.from(dmIDStr, 'base64'))

      // Setup notifications and cipher
      const notifications = xx.LoadNotificationsDummy(xxNet.GetID())
      const cipher = xx.NewDatabaseCipher(
        xxNet.GetID(),
        Buffer.from('MessageStoragePassword'),
        725
      )
      
      // Store cipher in ref for use in callback
      cipherRef.current = cipher

      setStatus('🔄 Creating DM client...')
      
      // Setup message receiver callback
      const onDmEvent = (eventType: number, data: Uint8Array) => {
        const msg = Buffer.from(data)
        console.log('📨 onDmEvent called -> EventType: ' + eventType + ', data: ' + msg.toString('utf-8'))
        
        try {
          const e = JSON.parse(msg.toString('utf-8'))
          console.log('📋 Parsed event:', e)
          
          // Skip notification filter updates
          if (e.notificationFilter) {
            console.log('ℹ️ Notification filter update, skipping...')
            return
          }
          
          // Try to decrypt the message from IndexedDB
          const db = dmDB.current
          const cipherInstance = cipherRef.current
          
          if (db !== null && cipherInstance !== null && e.uuid !== undefined) {
            console.log('🔍 Looking up message UUID:', e.uuid, 'in IndexedDB...')
            
            // Add a small delay to ensure IndexedDB has written the message
            const attemptDecrypt = (attempt = 1, maxAttempts = 3) => {
              setTimeout(() => {
                Promise.all([
                  db.table('messages')
                    .where('id')
                    .equals(e.uuid)
                    .first(),
                  db.table('conversations')
                    .filter((c: any) => c.pub_key === e.pubKey)
                    .last()
                ]).then(([message, conversation]: [any, any]) => {
                  console.log('🔍 Database lookup result:', { message, conversation })
                  
                  if (!conversation) {
                    console.error('❌ Could not find conversation for pubKey:', e.pubKey)
                    if (attempt < maxAttempts) {
                      console.log(`⏳ Retry attempt ${attempt + 1}/${maxAttempts}...`)
                      attemptDecrypt(attempt + 1, maxAttempts)
                    }
                    return
                  }
                  if (!message) {
                    console.error('❌ Could not find message with UUID:', e.uuid)
                    if (attempt < maxAttempts) {
                      console.log(`⏳ Retry attempt ${attempt + 1}/${maxAttempts}...`)
                      attemptDecrypt(attempt + 1, maxAttempts)
                    }
                    return
                  }
                  
                  // Decrypt the message text
                  console.log('🔓 Decrypting message text:', message.text)
                  const plaintext = Buffer.from(cipherInstance.Decrypt(message.text))
                  const decryptedText = plaintext.toString('utf-8')
                  
                  console.log('✅ Decrypted message:', decryptedText)
                  
                  setMessages(prev => [...prev, {
                    timestamp: new Date().toISOString(),
                    from: e.pubKey ? e.pubKey.substring(0, 20) + '...' : 'unknown',
                    message: `📩 ${decryptedText}`
                  }])
                }).catch((err) => {
                  console.error('❌ Error querying/decrypting message:', err)
                  if (attempt < maxAttempts) {
                    console.log(`⏳ Retry attempt ${attempt + 1}/${maxAttempts} after error...`)
                    attemptDecrypt(attempt + 1, maxAttempts)
                  }
                })
              }, attempt * 500) // 500ms, 1000ms, 1500ms delays
            }
            
            attemptDecrypt()
          } else {
            console.log('⚠️ Cannot decrypt - DB:', db !== null, 'Cipher:', cipherInstance !== null, 'UUID:', e.uuid)
          }
        } catch (err) {
          console.error('❌ Error parsing message event:', err)
          setMessages(prev => [...prev, {
            timestamp: new Date().toISOString(),
            from: 'unknown',
            message: msg.toString('utf-8')
          }])
        }
      }

      // Get worker path and create DM client
      const workerPath = await xxdk.dmIndexedDbWorkerPath()
      const workerStr = workerPath.toString()
      console.log('DM Worker Path: ' + workerStr)
      
      const dmClient = await xx.NewDMClientWithIndexedDb(
        xxNet.GetID(),
        notifications.GetID(),
        cipher.GetID(),
        workerStr,
        dmID,
        { EventUpdate: onDmEvent }
      )

      // Get credentials
      const token = dmClient.GetToken()
      const publicKey = Buffer.from(dmClient.GetPublicKey()).toString('base64')
      
      console.log('DMTOKEN: ' + token)
      console.log('DMPUBKEY: ' + publicKey)

      setCredentials({ token, publicKey })
      
      // Open IndexedDB database for message decryption
      const dbName = Buffer.from(dmClient.GetPublicKey()).toString('base64').replace(/={1,2}$/, '')
      console.log('📦 Opening IndexedDB with name:', dbName + '_speakeasy_dm')
      const db = new Dexie(dbName + '_speakeasy_dm')
      
      try {
        await db.open()
        dmDB.current = db
        console.log('✅ IndexedDB opened successfully')
        console.log('📊 Available tables:', db.tables.map(t => t.name))
        
        // Log all messages in the database for debugging
        const allMessages = await db.table('messages').toArray()
        const allConversations = await db.table('conversations').toArray()
        console.log('💬 Messages in DB:', allMessages.length, allMessages)
        console.log('🗨️ Conversations in DB:', allConversations.length, allConversations)
      } catch (dbErr) {
        console.error('⚠️ Could not open IndexedDB:', dbErr)
      }
      
      // IMPORTANT: Start network follower AFTER DM client is created
      setStatus('🔄 Starting network follower...')
      xxNet.StartNetworkFollower(10000)
      
      setStatus('⏳ Connecting to XX Network (usually takes 20-30 seconds)...')
      await xxNet.WaitForNetwork(30000)
      
      setStatus('✅ SERVER READY! Listening for messages...')

      console.log('🟢 ============================================')
      console.log('🟢 XX NETWORK SERVER INITIALIZED')
      console.log('🟢 Token:', token)
      console.log('🟢 Public Key:', publicKey)
      console.log('🟢 ============================================')

    } catch (err: any) {
      console.error('❌ Initialization failed:', err)
      setError(err.message || String(err))
      setStatus(`❌ Error: ${err.message || String(err)}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            🟢 XX Network Server
          </h1>
          <p className="text-slate-400">Powered by xxdk-wasm in Next.js</p>
        </div>

        {/* Status Card */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📊 Server Status</h2>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              status.includes('✅ SERVER READY') ? 'bg-green-500' :
              status.includes('❌') ? 'bg-red-500' :
              'bg-yellow-500'
            }`} />
            <p className="font-mono text-sm">{status}</p>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Credentials Card */}
        {credentials && (
          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur border border-purple-500 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🔑 Server Credentials</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Token:</p>
                <p className="font-mono text-lg bg-slate-900/50 p-3 rounded border border-slate-700">
                  {credentials.token}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Public Key:</p>
                <p className="font-mono text-sm bg-slate-900/50 p-3 rounded border border-slate-700 break-all">
                  {credentials.publicKey}
                </p>
              </div>
              <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4">
                <p className="text-blue-300 text-sm">
                  ℹ️ <strong>Use these credentials</strong> in your client at{' '}
                  <code className="bg-blue-950 px-2 py-1 rounded">http://localhost:3000</code>{' '}
                  to send messages to this server
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages Card */}
        {messages.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              📨 Received Messages ({messages.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((msg, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs text-slate-500">
                      {new Date(msg.timestamp).toLocaleString()}
                    </p>
                    <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded">
                      New
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">From: {msg.from.substring(0, 20)}...</p>
                  <p className="font-mono text-sm">{msg.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions Card */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📖 How to Use</h2>
          <ol className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start">
              <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0">1</span>
              <span>Wait for server to initialize (shows credentials above)</span>
            </li>
            <li className="flex items-start">
              <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0">2</span>
              <span>Copy the <strong>Token</strong> and <strong>Public Key</strong></span>
            </li>
            <li className="flex items-start">
              <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0">3</span>
              <span>Open your client at <code className="bg-slate-900 px-2 py-1 rounded">http://localhost:3000</code></span>
            </li>
            <li className="flex items-start">
              <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0">4</span>
              <span>Paste the credentials and send messages</span>
            </li>
            <li className="flex items-start">
              <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0">5</span>
              <span>Messages will appear in the "Received Messages" section above</span>
            </li>
          </ol>
        </div>

        {/* API Info */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🔌 API Endpoints</h2>
          <div className="space-y-2 text-sm font-mono">
            <p><span className="text-green-400">GET</span> <span className="text-purple-400">/api/status</span> - Check server status</p>
            <p><span className="text-green-400">GET</span> <span className="text-purple-400">/api/credentials</span> - Get server credentials</p>
            <p><span className="text-green-400">GET</span> <span className="text-purple-400">/api/messages</span> - Get received messages</p>
          </div>
        </div>
      </div>
    </div>
  )
}
