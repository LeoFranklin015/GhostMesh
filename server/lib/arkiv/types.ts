/**
 * Shared types and constants for Arkiv module
 */

// Default expiration: 30 days (2592000 seconds = 720 hours)
export const DEFAULT_EXPIRATION_HOURS = 720

// Client state (shared across modules)
export let walletClient: any = null
export let publicClient: any = null
export let isInitialized = false

// Encryption key state
export let encryptionKey: CryptoKey | null = null
export let encryptionKeyString: string | null = null

// Transaction queue to prevent "replacement transaction underpriced" errors
type QueueItem = {
  fn: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: any) => void
}

let transactionQueue: QueueItem[] = []
let isProcessingQueue = false
let lastTransactionTime = 0
const MIN_TRANSACTION_DELAY = 2000 // 2 seconds between transactions

// Process transaction queue with delays
async function processQueue() {
  if (isProcessingQueue || transactionQueue.length === 0) {
    return
  }

  isProcessingQueue = true

  while (transactionQueue.length > 0) {
    const item = transactionQueue.shift()
    if (!item) break

    try {
      // Wait for minimum delay since last transaction
      const timeSinceLastTx = Date.now() - lastTransactionTime
      if (timeSinceLastTx < MIN_TRANSACTION_DELAY) {
        await new Promise(resolve => setTimeout(resolve, MIN_TRANSACTION_DELAY - timeSinceLastTx))
      }

      // Execute transaction with retry logic
      let retries = 3
      let lastError: any = null

      while (retries > 0) {
        try {
          const result = await item.fn()
          lastTransactionTime = Date.now()
          item.resolve(result)
          break
        } catch (error: any) {
          lastError = error
          const errorMsg = error.message || String(error)
          
          // Check if it's a transaction pricing error
          if (errorMsg.includes('replacement transaction underpriced') || 
              errorMsg.includes('nonce too low') ||
              errorMsg.includes('already known')) {
            retries--
            if (retries > 0) {
              // Wait longer before retry (exponential backoff)
              const waitTime = (4 - retries) * 1000 // 1s, 2s, 3s
              console.log(`⏳ [QUEUE] Transaction conflict, retrying in ${waitTime}ms... (${4 - retries}/3)`)
              await new Promise(resolve => setTimeout(resolve, waitTime))
              continue
            }
          } else {
            // Other errors, don't retry
            throw error
          }
        }
      }

      if (retries === 0 && lastError) {
        throw lastError
      }
    } catch (error) {
      item.reject(error)
    }
  }

  isProcessingQueue = false
}

// Add transaction to queue
export function queueTransaction<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    transactionQueue.push({ fn, resolve, reject })
    processQueue()
  })
}

// Setters for state (allows other modules to update)
export function setWalletClient(client: any) {
  walletClient = client
}

export function setPublicClient(client: any) {
  publicClient = client
}

export function setIsInitialized(value: boolean) {
  isInitialized = value
}

export function setEncryptionKey(key: CryptoKey | null) {
  encryptionKey = key
}

export function setEncryptionKeyString(keyString: string | null) {
  encryptionKeyString = keyString
}

