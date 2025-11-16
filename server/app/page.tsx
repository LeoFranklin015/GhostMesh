'use client'

import { useEffect, useState, useRef } from 'react'
import Dexie from 'dexie'
import { 
  initializeArkivClient,
  storeMessageToArkiv,
  readMessagesFromArkiv,
  updateMessageInArkiv,
  deleteMessageFromArkiv,
  extendMessageInArkiv,
  getEncryptionKey
} from '../lib/arkiv'

export default function ServerPage() {
  const [status, setStatus] = useState('🔄 Initializing...')
  const [credentials, setCredentials] = useState<{token: number, publicKey: string} | null>(null)
  const [messages, setMessages] = useState<Array<{
    timestamp: string
    from: string
    message: string
    arkivStatus?: 'storing' | 'stored' | 'failed'
    arkivEntityKey?: string
    arkivError?: string
  }>>([])
  const [arkivStatus, setArkivStatus] = useState<'initializing' | 'ready' | 'not-configured' | 'error'>('initializing')
  const [testInput, setTestInput] = useState<string>('')
  const [testOutput, setTestOutput] = useState<string>('')
  const [testStatus, setTestStatus] = useState<string>('')
  const [testEntityKey, setTestEntityKey] = useState<string | null>(null)
  const [testEntityData, setTestEntityData] = useState<any>(null)
  const [testEncryptedData, setTestEncryptedData] = useState<string | null>(null)
  const [testDecryptedData, setTestDecryptedData] = useState<string | null>(null)
  const [readMessages, setReadMessages] = useState<Array<{
    entityKey: string
    data: any
    encrypted: boolean
    encryptedData?: string
    decryptedData?: string
    timestamp: string
  }>>([])
  const [crudLogs, setCrudLogs] = useState<Array<{
    timestamp: string
    operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXTEND'
    status: 'success' | 'error'
    message: string
    entityKey?: string
    details?: any
  }>>([])
  const [error, setError] = useState<string | null>(null)
  const dmDB = useRef<Dexie | null>(null)
  const cipherRef = useRef<any>(null)

  // Helper to add CRUD log
  const addCrudLog = (
    operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXTEND',
    status: 'success' | 'error',
    message: string,
    entityKey?: string,
    details?: any
  ) => {
    setCrudLogs(prev => [{
      timestamp: new Date().toISOString(),
      operation,
      status,
      message,
      entityKey,
      details
    }, ...prev].slice(0, 50)) // Keep last 50 logs
  }

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
      
      // Initialize encryption key and Arkiv client (non-blocking)
      setStatus('🔄 Initializing encryption and Arkiv storage...')
      
      // Initialize encryption key (silently, key is already in env)
      getEncryptionKey().then((key) => {
        console.log('🔑 Encryption key ready')
      }).catch((err) => {
        console.error('⚠️ Encryption key initialization error:', err)
      })
      
      // Initialize Arkiv client with private key
      initializeArkivClient().then((success) => {
        if (success) {
          setArkivStatus('ready')
          console.log('✅ Arkiv client initialized with private key')
        } else {
          setArkivStatus('not-configured')
          console.warn('⚠️ Arkiv client not initialized. Please check ARKIV_PRIVATE_KEY environment variable.')
        }
      }).catch((err) => {
        console.error('⚠️ Arkiv client initialization error:', err)
        setArkivStatus('error')
      })
      
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
                  
                  const timestamp = new Date().toISOString()
                  const fromPublicKey = e.pubKey ? e.pubKey.substring(0, 20) + '...' : 'unknown'
                  
                  // Store message in state with Arkiv status (existing functionality + new)
                  setMessages(prev => [...prev, {
                    timestamp,
                    from: fromPublicKey,
                    message: `📩 ${decryptedText}`,
                    arkivStatus: 'storing'
                  }])
                  
                  // Encrypt and store message to Arkiv (new functionality - non-blocking)
                  // storeMessageToArkiv automatically encrypts with key from env before storing
                  console.log('🔒 [MAIN] XX Network message will be encrypted with key before storing to Arkiv...')
                  storeMessageToArkiv({
                    content: decryptedText,
                    from: e.pubKey || 'unknown',
                    timestamp,
                    uuid: e.uuid
                  }).then((result) => {
                    // Update message with Arkiv storage result (find by timestamp)
                    setMessages(prev => {
                      return prev.map(msg => {
                        if (msg.timestamp === timestamp && msg.arkivStatus === 'storing') {
                          return {
                            ...msg,
                            arkivStatus: result.success ? 'stored' : 'failed',
                            arkivEntityKey: result.entityKey,
                            arkivError: result.error
                          }
                        }
                        return msg
                      })
                    })
                    
                    if (result.success) {
                      console.log('✅ Message stored to Arkiv in UI:', result.entityKey)
                      addCrudLog('CREATE', 'success', `Message stored to Arkiv`, result.entityKey)
                    } else {
                      console.warn('⚠️ Arkiv storage failed in UI:', result.error)
                      addCrudLog('CREATE', 'error', `Storage failed: ${result.error}`)
                    }
                  }).catch((err) => {
                    // Update message with error status (find by timestamp)
                    setMessages(prev => {
                      return prev.map(msg => {
                        if (msg.timestamp === timestamp && msg.arkivStatus === 'storing') {
                          return {
                            ...msg,
                            arkivStatus: 'failed',
                            arkivError: err.message || String(err)
                          }
                        }
                        return msg
                      })
                    })
                    console.error('⚠️ Arkiv storage failed (non-critical):', err)
                    addCrudLog('CREATE', 'error', `Storage failed: ${err.message || String(err)}`)
                  })
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
        {/* Navigation */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-4 mb-6">
          <div className="flex gap-4">
            <a
              href="/"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm"
            >
              🏠 Server Dashboard
            </a>
            <a
              href="/alldatas"
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded text-white text-sm"
            >
              📊 View All Data (API)
            </a>
          </div>
        </div>

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
          
          {/* Arkiv Status */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                arkivStatus === 'ready' ? 'bg-green-500' :
                arkivStatus === 'not-configured' ? 'bg-yellow-500' :
                arkivStatus === 'error' ? 'bg-red-500' :
                'bg-gray-500 animate-pulse'
              }`} />
              <p className="text-sm text-slate-300">
                Arkiv Storage (Private Key): {
                  arkivStatus === 'ready' ? '✅ Ready' :
                  arkivStatus === 'not-configured' ? '⚠️ Not configured' :
                  arkivStatus === 'error' ? '❌ Error' :
                  '🔄 Initializing...'
                }
              </p>
            </div>
            
            {arkivStatus === 'not-configured' && (
              <div className="ml-6 text-xs text-yellow-400 space-y-1">
                <div>⚠️ Please set <code className="bg-yellow-900/50 px-1 rounded">NEXT_PUBLIC_ARKIV_PRIVATE_KEY</code> in your <code className="bg-yellow-900/50 px-1 rounded">.env.local</code> file.</div>
                <div className="text-yellow-500/80 mt-1">Note: Since this runs in the browser, you must use the <code className="bg-yellow-900/50 px-1 rounded">NEXT_PUBLIC_</code> prefix.</div>
              </div>
            )}
            
            {arkivStatus === 'error' && (
              <div className="ml-6 text-xs text-red-400">
                ❌ Failed to initialize Arkiv client. Check console for details.
              </div>
            )}
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Testing Section */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🧪 Test Encryption/Decryption & Arkiv Storage</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Test Message:</label>
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Enter text to test encryption/decryption and Arkiv storage..."
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white font-mono text-sm resize-none"
                rows={3}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  if (!testInput.trim()) {
                    setTestStatus('❌ Please enter some text first')
                    return
                  }
                  try {
                    setTestStatus('🔄 Storing to Arkiv...')
                    const testMessageData = {
                      content: testInput,
                      from: 'test-user',
                      timestamp: new Date().toISOString(),
                      uuid: 'test-' + Date.now()
                    }
                    // storeMessageToArkiv will automatically encrypt before storing
                    // Only encrypted data will be stored in Arkiv (no plaintext)
                    console.log('🔒 [TEST] Message will be encrypted and only encrypted data stored in Arkiv...')
                    const result = await storeMessageToArkiv(testMessageData)
                    if (result.success) {
                      setTestEntityKey(result.entityKey || null)
                      // Note: We don't store plaintext data in state - only encrypted data is in Arkiv
                      setTestEntityData({
                        entityKey: result.entityKey,
                        storedAt: new Date().toISOString(),
                        encrypted: true,
                        note: 'Only encrypted data is stored in Arkiv'
                      })
                      setTestStatus(`✅ Message encrypted and stored to Arkiv! Only encrypted data is stored.`)
                      addCrudLog('CREATE', 'success', 'Test message encrypted and stored to Arkiv (only encrypted data stored)', result.entityKey)
                    } else {
                      setTestStatus(`❌ Storage failed: ${result.error}`)
                      addCrudLog('CREATE', 'error', `Test storage failed: ${result.error}`)
                    }
                  } catch (error: any) {
                    setTestStatus(`❌ Storage failed: ${error.message}`)
                    addCrudLog('CREATE', 'error', `Test storage failed: ${error.message}`)
                  }
                }}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded text-sm"
              >
                💾 Store to Arkiv
              </button>
              
              <button
                onClick={async () => {
                  try {
                    setTestStatus('🔄 Reading from Arkiv...')
                    const result = await readMessagesFromArkiv('type = "xx-network-message"')
                    if (result.success) {
                      const allMessages = result.entities || []
                      const testMessages = allMessages.filter((e: any) => 
                        e.data?.from === 'test-user'
                      )
                      
                      // Update read messages state for UI display
                      const formattedMessages = allMessages.map((e: any) => ({
                        entityKey: e.entityKey,
                        data: e.data,
                        encrypted: e.encrypted,
                        encryptedData: e.encryptedData, // Full encrypted data
                        decryptedData: e.decryptedData, // Full decrypted data
                        timestamp: e.data?.timestamp || new Date().toISOString()
                      }))
                      setReadMessages(formattedMessages)
                      
                      // Log encryption/decryption info
                      console.log('📖 [READ] Retrieved messages from Arkiv:')
                      formattedMessages.forEach((msg, idx) => {
                        console.log(`  Message ${idx + 1}:`)
                        console.log(`    Entity Key: ${msg.entityKey}`)
                        console.log(`    Encrypted: ${msg.encrypted}`)
                        if (msg.encrypted) {
                          console.log(`    Encrypted Data Length: ${msg.encryptedData?.length || 0}`)
                          console.log(`    Decrypted Content: ${msg.data?.content || 'N/A'}`)
                        }
                      })
                      
                      if (testMessages.length > 0) {
                        const latest = testMessages[0]
                        // Decrypted content is now available after reading from Arkiv
                        setTestInput(latest.data?.content || '')
                        setTestEntityKey(latest.entityKey)
                        setTestEntityData(latest)
                        
                        // Show encrypted content (what was stored) and decrypted content (after decryption)
                        if (latest.encryptedData) {
                          console.log('🔒 [TEST] Retrieved encrypted content from Arkiv (this is what was stored)')
                          setTestEncryptedData(latest.encryptedData)
                        }
                        if (latest.decryptedData) {
                          console.log('🔓 [TEST] Decrypted content with key (this is the original message)')
                          setTestDecryptedData(latest.decryptedData)
                        }
                        
                        setTestStatus(`✅ Found ${testMessages.length} test message(s) and ${allMessages.length} total message(s). Retrieved encrypted data from Arkiv, decrypted with key.`)
                        addCrudLog('READ', 'success', `Found ${allMessages.length} total messages (${testMessages.length} test). Retrieved encrypted data from Arkiv and decrypted.`, latest.entityKey)
                      } else {
                        setTestStatus(`ℹ️ Found ${allMessages.length} total message(s) but no test messages. All messages displayed below.`)
                        addCrudLog('READ', 'success', `Found ${allMessages.length} messages (no test messages)`)
                      }
                    } else {
                      setTestStatus(`❌ Read failed: ${result.error}`)
                      addCrudLog('READ', 'error', `Test read failed: ${result.error}`)
                    }
                  } catch (error: any) {
                    setTestStatus(`❌ Read failed: ${error.message}`)
                    addCrudLog('READ', 'error', `Test read failed: ${error.message}`)
                  }
                }}
                className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 rounded text-sm"
              >
                📖 Read from Arkiv
              </button>
              
              <button
                onClick={() => {
                  setTestInput('')
                  setTestOutput('')
                  setTestStatus('')
                  setTestEntityKey(null)
                  setTestEntityData(null)
                  setTestEncryptedData(null)
                  setTestDecryptedData(null)
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                🗑️ Clear
              </button>
            </div>
            
            {/* Entity Key and Data Display */}
            {testEntityKey && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Full Entity Key:</label>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs bg-slate-900/50 p-3 rounded border border-slate-700 break-all flex-1">
                      {testEntityKey}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(testEntityKey)
                        setTestStatus('✅ Entity key copied to clipboard')
                      }}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
                
                {testEntityData && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">All Entity Data:</label>
                    <pre className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-300 font-mono text-xs overflow-auto max-h-60">
                      {JSON.stringify(testEntityData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            {/* Encrypted/Decrypted Content Display */}
            {(testEncryptedData || testDecryptedData) && (
              <div className="space-y-3">
                {testEncryptedData && (
                  <div>
                    <label className="block text-sm text-blue-400 mb-2">🔒 Encrypted Content (stored in Arkiv):</label>
                    <textarea
                      value={testEncryptedData}
                      readOnly
                      className="w-full bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 text-blue-300 font-mono text-xs resize-none break-all"
                      rows={4}
                    />
                  </div>
                )}
                
                {testDecryptedData && (
                  <div>
                    <label className="block text-sm text-green-400 mb-2">🔓 Decrypted Content (after decryption with key):</label>
                    <textarea
                      value={testDecryptedData}
                      readOnly
                      className="w-full bg-green-900/20 border border-green-700/50 rounded-lg p-3 text-green-300 font-mono text-xs resize-none break-all"
                      rows={4}
                    />
                  </div>
                )}
              </div>
            )}
            
            {testOutput && !testEncryptedData && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Encrypted Output:</label>
                <textarea
                  value={testOutput}
                  readOnly
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-300 font-mono text-xs resize-none break-all"
                  rows={4}
                />
              </div>
            )}
            
            {testStatus && (
              <div className={`p-3 rounded-lg ${
                testStatus.includes('✅') ? 'bg-green-900/30 border border-green-700/50' :
                testStatus.includes('❌') ? 'bg-red-900/30 border border-red-700/50' :
                'bg-blue-900/30 border border-blue-700/50'
              }`}>
                <p className={`text-sm ${
                  testStatus.includes('✅') ? 'text-green-300' :
                  testStatus.includes('❌') ? 'text-red-300' :
                  'text-blue-300'
                }`}>
                  {testStatus}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Read Messages from Arkiv Display */}
        {readMessages.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              📖 Messages Read from Arkiv ({readMessages.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {readMessages.map((msg, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs text-slate-500">
                      {new Date(msg.timestamp).toLocaleString()}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      msg.encrypted ? 'bg-blue-900/30 text-blue-400' : 'bg-yellow-900/30 text-yellow-400'
                    }`}>
                      {msg.encrypted ? '🔒 Encrypted' : '⚠️ Not Encrypted'}
                    </span>
                  </div>
                  
                  <div className="mb-2">
                    <p className="text-xs text-slate-400 mb-1">Full Entity Key:</p>
                    <p className="font-mono text-xs bg-slate-800/50 p-2 rounded border border-slate-700 break-all">
                      {msg.entityKey}
                    </p>
                  </div>
                  
                  {msg.encrypted && msg.encryptedData && (
                    <div className="mb-2">
                      <p className="text-xs text-blue-400 mb-1">🔒 Encrypted Content (stored in Arkiv):</p>
                      <textarea
                        value={msg.encryptedData}
                        readOnly
                        className="w-full bg-blue-900/20 border border-blue-700/50 rounded-lg p-2 text-blue-300 font-mono text-xs resize-none break-all"
                        rows={3}
                      />
                    </div>
                  )}
                  
                  {msg.encrypted && msg.decryptedData && (
                    <div className="mb-2">
                      <p className="text-xs text-green-400 mb-1">🔓 Decrypted Content (after decryption with key):</p>
                      <textarea
                        value={msg.decryptedData}
                        readOnly
                        className="w-full bg-green-900/20 border border-green-700/50 rounded-lg p-2 text-green-300 font-mono text-xs resize-none break-all"
                        rows={3}
                      />
                    </div>
                  )}
                  
                  <div className="mb-2">
                    <p className="text-xs text-slate-400 mb-1">Message Content (Decrypted):</p>
                    <p className="font-mono text-sm text-white bg-slate-800/50 p-2 rounded border border-slate-700">
                      {msg.data?.content || 'N/A'}
                    </p>
                  </div>
                  
                  <details className="mt-2">
                    <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                      View All Data
                    </summary>
                    <pre className="mt-2 p-2 bg-slate-800/50 rounded text-xs overflow-auto max-h-40 border border-slate-700">
                      {JSON.stringify(msg.data, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
            <button
              onClick={() => setReadMessages([])}
              className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
            >
              Clear Read Messages
            </button>
          </div>
        )}

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
                    <div className="flex items-center space-x-2">
                    <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded">
                      New
                    </span>
                      {/* Arkiv Storage Status Badge */}
                      {msg.arkivStatus === 'storing' && (
                        <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded flex items-center">
                          <span className="w-2 h-2 bg-blue-400 rounded-full mr-1 animate-pulse"></span>
                          Storing...
                        </span>
                      )}
                      {msg.arkivStatus === 'stored' && (
                        <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded flex items-center">
                          ✅ Stored
                        </span>
                      )}
                      {msg.arkivStatus === 'failed' && (
                        <span className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded flex items-center">
                          ❌ Storage Failed
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">From: {msg.from.substring(0, 20)}...</p>
                  <p className="font-mono text-sm mb-2">{msg.message}</p>
                  
                  {/* Arkiv Storage Details */}
                  {msg.arkivStatus === 'stored' && msg.arkivEntityKey && (
                    <div className="mt-2 p-2 bg-green-900/20 border border-green-700/50 rounded text-xs">
                      <p className="text-green-400 mb-2">
                        <strong>Arkiv:</strong> Stored successfully
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-green-300 font-mono text-xs break-all flex-1">
                          <strong>Entity Key:</strong> {msg.arkivEntityKey}
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.arkivEntityKey || '')
                            addCrudLog('READ', 'success', 'Entity key copied to clipboard', msg.arkivEntityKey)
                          }}
                          className="px-2 py-1 bg-green-700/50 hover:bg-green-700 rounded text-xs"
                          title="Copy entity key"
                        >
                          📋 Copy
                        </button>
                      </div>
                      
                      {/* CRUD Operation Buttons */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={async () => {
                            if (!msg.arkivEntityKey) return
                            addCrudLog('READ', 'success', 'Reading all messages from Arkiv...', msg.arkivEntityKey)
                            const result = await readMessagesFromArkiv('type = "xx-network-message"')
                            if (result.success) {
                              const foundEntity = result.entities?.find((e: any) => e.entityKey === msg.arkivEntityKey)
                              if (foundEntity) {
                                addCrudLog('READ', 'success', `Found entity in Arkiv`, msg.arkivEntityKey, foundEntity)
                              } else {
                                addCrudLog('READ', 'success', `Found ${result.entities?.length || 0} total messages. This entity not found.`, msg.arkivEntityKey, result.entities)
                              }
                            } else {
                              addCrudLog('READ', 'error', result.error || 'Read failed', msg.arkivEntityKey)
                            }
                          }}
                          className="px-2 py-1 bg-blue-700/50 hover:bg-blue-700 rounded text-xs"
                          title="Read entity from Arkiv"
                        >
                          📖 Read
                        </button>
                        <button
                          onClick={async () => {
                            if (!msg.arkivEntityKey) return
                            const newContent = prompt('Enter updated message content:', msg.message.replace('📩 ', ''))
                            if (newContent) {
                              addCrudLog('UPDATE', 'success', 'Updating entity...', msg.arkivEntityKey)
                              // Create content as JSON string with type and data
                              const contentJson = JSON.stringify({
                                type: "xx-network-message",
                                data: newContent
                              })
                              const result = await updateMessageInArkiv(msg.arkivEntityKey, {
                                content: contentJson,
                                from: msg.from,
                                timestamp: msg.timestamp,
                                source: 'ghostmesh-server'
                              })
                              if (result.success) {
                                addCrudLog('UPDATE', 'success', 'Entity updated successfully', result.entityKey)
                                setMessages(prev => prev.map(m => 
                                  m.arkivEntityKey === msg.arkivEntityKey 
                                    ? { ...m, message: `📩 ${newContent}` }
                                    : m
                                ))
                              } else {
                                addCrudLog('UPDATE', 'error', result.error || 'Update failed', msg.arkivEntityKey)
                              }
                            }
                          }}
                          className="px-2 py-1 bg-yellow-700/50 hover:bg-yellow-700 rounded text-xs"
                          title="Update entity in Arkiv"
                        >
                          ✏️ Update
                        </button>
                        <button
                          onClick={async () => {
                            if (!msg.arkivEntityKey) return
                            if (confirm('Are you sure you want to delete this entity from Arkiv?')) {
                              addCrudLog('DELETE', 'success', 'Deleting entity...', msg.arkivEntityKey)
                              const result = await deleteMessageFromArkiv(msg.arkivEntityKey)
                              if (result.success) {
                                addCrudLog('DELETE', 'success', 'Entity deleted successfully', result.entityKey)
                                setMessages(prev => prev.map(m => 
                                  m.arkivEntityKey === msg.arkivEntityKey 
                                    ? { ...m, arkivStatus: 'failed', arkivError: 'Deleted from Arkiv' }
                                    : m
                                ))
                              } else {
                                addCrudLog('DELETE', 'error', result.error || 'Delete failed', msg.arkivEntityKey)
                              }
                            }
                          }}
                          className="px-2 py-1 bg-red-700/50 hover:bg-red-700 rounded text-xs"
                          title="Delete entity from Arkiv"
                        >
                          🗑️ Delete
                        </button>
                        <button
                          onClick={async () => {
                            if (!msg.arkivEntityKey) return
                            const hours = prompt('Extend by how many hours? (default: 12)', '12')
                            if (hours) {
                              const hoursNum = parseInt(hours) || 12
                              addCrudLog('EXTEND', 'success', `Extending entity by ${hoursNum} hours...`, msg.arkivEntityKey)
                              const result = await extendMessageInArkiv(msg.arkivEntityKey, hoursNum)
                              if (result.success) {
                                addCrudLog('EXTEND', 'success', `Entity extended successfully by ${hoursNum} hours`, result.entityKey)
                              } else {
                                addCrudLog('EXTEND', 'error', result.error || 'Extend failed', msg.arkivEntityKey)
                              }
                            }
                          }}
                          className="px-2 py-1 bg-purple-700/50 hover:bg-purple-700 rounded text-xs"
                          title="Extend entity lifetime in Arkiv"
                        >
                          ⏰ Extend
                        </button>
                      </div>
                    </div>
                  )}
                  {msg.arkivStatus === 'failed' && msg.arkivError && (
                    <div className="mt-2 p-2 bg-red-900/20 border border-red-700/50 rounded text-xs">
                      <p className="text-red-400">
                        <strong>Arkiv:</strong> Storage failed
                      </p>
                      <p className="text-red-300 text-xs mt-1">
                        {msg.arkivError}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CRUD Operations Log */}
        {crudLogs.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              📋 Arkiv CRUD Operations Log ({crudLogs.length})
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {crudLogs.map((log, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded-lg border text-xs ${
                    log.status === 'success' 
                      ? 'bg-green-900/20 border-green-700/50' 
                      : 'bg-red-900/20 border-red-700/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        log.operation === 'CREATE' ? 'bg-blue-900/50 text-blue-300' :
                        log.operation === 'READ' ? 'bg-cyan-900/50 text-cyan-300' :
                        log.operation === 'UPDATE' ? 'bg-yellow-900/50 text-yellow-300' :
                        log.operation === 'DELETE' ? 'bg-red-900/50 text-red-300' :
                        'bg-purple-900/50 text-purple-300'
                      }`}>
                        {log.operation}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        log.status === 'success' 
                          ? 'bg-green-900/50 text-green-300' 
                          : 'bg-red-900/50 text-red-300'
                      }`}>
                        {log.status === 'success' ? '✅ Success' : '❌ Error'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <p className={`text-sm mb-1 ${
                    log.status === 'success' ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {log.message}
                  </p>
                  {log.entityKey && (
                    <p className="text-slate-400 font-mono text-xs break-all">
                      Entity Key: {log.entityKey}
                    </p>
                  )}
                  {log.details && (
                    <details className="mt-2">
                      <summary className="text-slate-400 cursor-pointer text-xs">View Details</summary>
                      <pre className="mt-2 p-2 bg-slate-900/50 rounded text-xs overflow-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setCrudLogs([])}
              className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
            >
              Clear Logs
            </button>
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

