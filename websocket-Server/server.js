/**
 * Standalone WebSocket Server for Arkiv Entity Events
 * Subscribes to Arkiv Network and broadcasts events to connected clients via Socket.io
 */

import { createServer } from 'http'
import { Server } from 'socket.io'
import { createWalletClient, createPublicClient, http } from '@arkiv-network/sdk'
import { mendoza } from '@arkiv-network/sdk/chains'
import { privateKeyToAccount } from '@arkiv-network/sdk/accounts'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const PORT = process.env.PORT || 3001
const ARKIV_PRIVATE_KEY = process.env.ARKIV_PRIVATE_KEY || process.env.NEXT_PUBLIC_ARKIV_PRIVATE_KEY

// Validate environment
if (!ARKIV_PRIVATE_KEY) {
  console.error('❌ Error: ARKIV_PRIVATE_KEY not found in environment variables')
  console.error('   Please create a .env file with ARKIV_PRIVATE_KEY=0x...')
  process.exit(1)
}

console.log('🚀 Starting Arkiv WebSocket Server...')
console.log('📋 Configuration:')
console.log(`   Port: ${PORT}`)
console.log(`   Private Key: ${ARKIV_PRIVATE_KEY.substring(0, 10)}...`)
console.log()

// Create HTTP server
const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ 
      status: 'healthy',
      uptime: process.uptime(),
      clients: io.engine.clientsCount,
      arkivConnected: !!unsubscribe
    }))
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Arkiv WebSocket Server - Connect via Socket.io client')
  }
})

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
})

// Track connected clients
let connectedClients = 0
let unsubscribe = null
let publicClientGlobal = null // Store for reconnection

// Initialize Arkiv clients
async function initializeArkiv() {
  try {
    console.log('🔄 Initializing Arkiv client...')
    
    // Create account from private key
    const account = privateKeyToAccount(ARKIV_PRIVATE_KEY)
    console.log(`✅ Account: ${account.address}`)

    // Create public client for reading
    const publicClient = createPublicClient({
      chain: mendoza,
      transport: http(),
    })
    console.log('✅ Public client created')

    // Create wallet client for write operations (if needed)
    const walletClient = createWalletClient({
      chain: mendoza,
      transport: http(),
      account: account,
    })
    console.log('✅ Wallet client created')
    console.log()

    return { publicClient, walletClient }
  } catch (error) {
    console.error('❌ Failed to initialize Arkiv:', error)
    throw error
  }
}

// Subscribe to Arkiv entity events with auto-reconnect
let reconnectTimer = null
let reconnectAttempts = 0
let isReconnecting = false
let shouldSuppressErrors = false
const MAX_RECONNECT_DELAY = 60000 // 1 minute max

// Store original console.error for restoration
const originalConsoleError = console.error

// Suppress viem/SDK filter errors during reconnection
function suppressFilterErrors() {
  console.error = function(...args) {
    // Convert all arguments to a single string for checking
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg
      if (arg && typeof arg === 'object') return JSON.stringify(arg)
      return String(arg)
    }).join(' ')
    
    // Suppress ANY filter-related errors
    if (message.includes('filter not found') || 
        message.includes('error from subscribeEntityEvents') ||
        message.includes('InvalidInputRpcError') ||
        message.includes('eth_getFilterChanges')) {
      return // Silently ignore all filter errors
    }
    
    // Pass through all other errors
    originalConsoleError.apply(console, args)
  }
}

// Restore normal error logging
function restoreErrorLogging() {
  console.error = originalConsoleError
}

async function subscribeToArkiv(publicClient) {
  try {
    console.log('🔄 Subscribing to Arkiv entity events...')
    shouldSuppressErrors = false // Reset error suppression
    // DON'T restore error logging yet - old filter may still be polling
    
    const stop = await publicClient.subscribeEntityEvents({
      onEntityCreated: async (e) => {
        console.log('🔄 [Arkiv] Entity created:', e)
        try {
          
          // Reset reconnect attempts on successful event
          reconnectAttempts = 0
          
          // Get full entity details
          const entity = await publicClient.getEntity(e.entityKey)
          const attributes = Object.fromEntries(
            entity.attributes.map(a => [a.key, a.value])
          )
          
          // Extract entity type from attributes (dynamic: Weather, ETH, BTC, etc.)
          const entityType = attributes.type || 'unknown'
          
          // Parse payload to get data (content is encrypted in operations.ts)
          let payloadData = null
          let encryptedContent = null
          let metadata = {}
          
          try {
            if (entity.payload) {
              let rawPayload
              if (typeof entity.payload === 'string') {
                rawPayload = JSON.parse(entity.payload)
              } else if (entity.payload instanceof Uint8Array) {
                const decoder = new TextDecoder()
                rawPayload = JSON.parse(decoder.decode(entity.payload))
              } else {
                rawPayload = entity.payload
              }
              
              // Structure from operations.ts: { encrypted: true, data: { type, content, from, timestamp, ... } }
              if (rawPayload.encrypted && rawPayload.data) {
                payloadData = rawPayload.data
                encryptedContent = rawPayload.data.content // This is encrypted
                metadata = {
                  from: rawPayload.data.from,
                  timestamp: rawPayload.data.timestamp,
                  uuid: rawPayload.data.uuid,
                  source: rawPayload.data.source
                }
              }
            }
          } catch (err) {
            console.log('⚠️ Could not parse entity payload:', err.message)
          }

          // Log the entity creation with its type
          console.log(`[${entityType} created]`, {
            key: e.entityKey,
            from: metadata.from?.substring(0, 20) || 'N/A',
            timestamp: metadata.timestamp || 'N/A',
            hasEncryptedContent: !!encryptedContent
          })

          // Prepare event data for clients
          const eventData = {
            type: 'entityCreated',
            entityKey: e.entityKey,
            entityType: entityType,
            attributes: attributes,
            metadata: metadata,
            encrypted: !!encryptedContent,
            timestamp: new Date().toISOString()
          }
          
          // Broadcast to all connected clients
          io.emit('arkiv:entity:created', eventData)
          console.log(`📡 Broadcasted to ${connectedClients} client(s)`)
          console.log()
        } catch (err) {
          console.error('❌ Error in onEntityCreated:', err)
        }
      },

      onEntityUpdated: async (e) => {
        try {
          console.log('🔄 [Arkiv] Entity updated:', e.entityKey)
          reconnectAttempts = 0
          
          // Get updated entity details
          const entity = await publicClient.getEntity(e.entityKey)
          const attributes = Object.fromEntries(
            entity.attributes.map(a => [a.key, a.value])
          )
          
          const entityType = attributes.type || 'unknown'
          console.log(`[${entityType} updated]`, { key: e.entityKey })
          
          io.emit('arkiv:entity:updated', {
            type: 'entityUpdated',
            entityKey: e.entityKey,
            entityType: entityType,
            attributes: attributes,
            timestamp: new Date().toISOString()
          })
        } catch (err) {
          console.error('❌ Error in onEntityUpdated:', err)
          // Send basic event even if details fetch fails
          io.emit('arkiv:entity:updated', {
            type: 'entityUpdated',
            entityKey: e.entityKey,
            timestamp: new Date().toISOString()
          })
        }
      },

      onEntityDeleted: async (e) => {
        console.log('🗑️ [Arkiv] Entity deleted:', e.entityKey)
        reconnectAttempts = 0
        
        io.emit('arkiv:entity:deleted', {
          type: 'entityDeleted',
          entityKey: e.entityKey,
          timestamp: new Date().toISOString()
        })
      },

      onEntityExpiresInExtended: (e) => {
        console.log('[Extended]', e.entityKey, '→', e.newExpirationBlock)
        reconnectAttempts = 0
        
        io.emit('arkiv:entity:extended', {
          type: 'entityExtended',
          entityKey: e.entityKey,
          newExpirationBlock: e.newExpirationBlock,
          timestamp: new Date().toISOString()
        })
      },

      onError: (err) => {
        const errorMsg = err.message || String(err)
        
        // Check if it's a filter error (filter expired)
        if (errorMsg.includes('filter not found') || errorMsg.includes('InvalidInputRpcError')) {
          // Only trigger reconnect if not already reconnecting
          if (!isReconnecting && !shouldSuppressErrors) {
            // IMMEDIATELY suppress console errors BEFORE logging anything
            suppressFilterErrors()
            shouldSuppressErrors = true
            
            // Now we can safely log our own message
            originalConsoleError('⚠️ [Arkiv] Filter expired, initiating reconnect...')
            
            scheduleReconnect(publicClient)
          }
          // Always suppress these errors from being processed further
          return
        }
        
        // Only process non-filter errors
        if (!shouldSuppressErrors) {
          console.error('❌ [Arkiv] Subscription error:', err)
          
          io.emit('arkiv:error', {
            type: 'error',
            message: 'Arkiv subscription error',
            error: errorMsg,
            timestamp: new Date().toISOString()
          })
        }
      }
    })

    console.log('✅ Subscribed to Arkiv entity events')
    console.log('🔊 Watching for entity creations, updates, deletions, and extensions...')
    console.log('🎯 Supported entity types: Weather, ETH, BTC, and any custom types')
    console.log()

    return stop
  } catch (error) {
    console.error('❌ Failed to subscribe to Arkiv:', error)
    throw error
  }
}

// Schedule reconnection with exponential backoff
function scheduleReconnect(publicClient) {
  // Prevent multiple simultaneous reconnections
  if (isReconnecting) {
    return
  }
  
  isReconnecting = true
  
  // Clear existing timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
  }
  
  // Calculate delay with exponential backoff
  const delay = Math.min(
    1000 * Math.pow(2, reconnectAttempts), // 1s, 2s, 4s, 8s, 16s, 32s...
    MAX_RECONNECT_DELAY
  )
  
  reconnectAttempts++
  
  console.log(`🔄 Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts})...`)
  
  reconnectTimer = setTimeout(async () => {
    try {
      // Step 1: Unsubscribe old subscription
      if (unsubscribe) {
        try {
          console.log('🛑 Stopping old subscription...')
          await unsubscribe() // Make sure to await
        } catch (err) {
          console.log('⚠️ Error stopping old subscription (will continue anyway)')
        }
      }
      
      // Step 2: Wait a bit to ensure old filter is cleaned up
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Step 3: Create new subscription
      unsubscribe = await subscribeToArkiv(publicClient)
      
      // Step 4: Wait for old filter to fully die (give it 5 seconds to be safe)
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // Step 5: Success! Now restore error logging
      originalConsoleError('✅ Reconnected successfully')
      restoreErrorLogging()
      isReconnecting = false
      
    } catch (error) {
      console.error('❌ Reconnection failed:', error)
      isReconnecting = false
      shouldSuppressErrors = false
      restoreErrorLogging() // Restore on failure
      // Try again
      scheduleReconnect(publicClient)
    }
  }, delay)
}

// Socket.io connection handling
io.on('connection', (socket) => {
  connectedClients++
  console.log(`✅ Client connected: ${socket.id} (${connectedClients} total)`)

  // Send welcome message
  socket.emit('connected', {
    message: 'Connected to Arkiv WebSocket Server',
    arkivActive: !!unsubscribe,
    timestamp: new Date().toISOString()
  })

  // Handle ping for keepalive
  socket.on('ping', () => {
    socket.emit('pong', { 
      timestamp: new Date().toISOString(),
      clients: connectedClients
    })
  })

  // Handle disconnect
  socket.on('disconnect', () => {
    connectedClients--
    console.log(`🔌 Client disconnected: ${socket.id} (${connectedClients} remaining)`)
  })
})

// Main startup
async function main() {
  try {
    // Suppress filter errors during initial startup too
    suppressFilterErrors()
    
    // Initialize Arkiv
    const { publicClient, walletClient } = await initializeArkiv()
    publicClientGlobal = publicClient // Store for reconnection
    
    // Subscribe to events
    unsubscribe = await subscribeToArkiv(publicClient)
    
    // Wait a moment then restore error logging for normal operation
    setTimeout(() => {
      restoreErrorLogging()
      originalConsoleError('🔓 Error logging restored - server ready')
    }, 3000)
    
    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log('=' .repeat(60))
      console.log('✅ Arkiv WebSocket Server is running!')
      console.log('=' .repeat(60))
      console.log(`🌐 HTTP Server: http://localhost:${PORT}`)
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`)
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`)
      console.log()
      console.log('📡 Clients can connect using Socket.io client')
      console.log('🎯 Events: arkiv:entity:created, arkiv:entity:updated, etc.')
      console.log()
      console.log('Press Ctrl+C to stop')
      console.log('=' .repeat(60))
    })
  } catch (error) {
    console.error('❌ Fatal error during startup:', error)
    process.exit(1)
  }
}

// Graceful shutdown
function shutdown() {
  console.log('\n🔄 Shutting down gracefully...')
  
  // Restore error logging
  restoreErrorLogging()
  
  // Clear reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    console.log('✅ Reconnect timer cleared')
  }
  
  if (unsubscribe) {
    try {
      unsubscribe()
      console.log('✅ Unsubscribed from Arkiv events')
    } catch (err) {
      console.log('⚠️ Error unsubscribing:', err.message)
    }
  }
  
  io.close(() => {
    console.log('✅ Socket.io server closed')
  })
  
  httpServer.close(() => {
    console.log('✅ HTTP server closed')
    process.exit(0)
  })

  // Force exit after 5 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout')
    process.exit(1)
  }, 5000)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Start the server
main()

