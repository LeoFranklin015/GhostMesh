/**
 * Arkiv Storage Utility
 * Handles storing received messages to Arkiv decentralized storage
 * Uses the same API as demo.ts
 * Includes encryption layer before storing to Arkiv
 */

import { createClient, Annotation, Tagged } from 'arkiv-sdk'

// Default expiration: 7 days (604800 seconds)
const DEFAULT_EXPIRATION = 604800

// Default chain ID for Mendoza testnet
const DEFAULT_CHAIN_ID = 60138453056

let arkivClient: any = null
let isInitialized = false

// Encryption key (will be generated or loaded from env)
let encryptionKey: CryptoKey | null = null
let encryptionKeyString: string | null = null

/**
 * Generate a random encryption key
 * @returns Base64 encoded key string
 */
export async function generateEncryptionKey(): Promise<string> {
  try {
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // extractable
      ['encrypt', 'decrypt']
    )

    // Export key as raw bytes
    const exportedKey = await crypto.subtle.exportKey('raw', key)
    const keyArray = Array.from(new Uint8Array(exportedKey))
    const keyString = Buffer.from(keyArray).toString('base64')
    
    encryptionKey = key
    encryptionKeyString = keyString
    
    return keyString
  } catch (error: any) {
    console.error('❌ Failed to generate encryption key:', error)
    throw error
  }
}

/**
 * Import encryption key from base64 string
 * @param keyString - Base64 encoded key
 */
export async function importEncryptionKey(keyString: string): Promise<void> {
  try {
    console.log('🔑 [IMPORT] Importing encryption key...')
    console.log('🔑 [IMPORT] Key string length:', keyString.length)
    console.log('🔑 [IMPORT] Key string (first 30 chars):', keyString.substring(0, 30) + '...')
    
    // Remove any whitespace
    const cleanKey = keyString.trim()
    
    const keyBuffer = Buffer.from(cleanKey, 'base64')
    console.log('🔑 [IMPORT] Key buffer length:', keyBuffer.length, 'bytes')
    
    if (keyBuffer.length !== 32) {
      throw new Error(`Invalid key length: expected 32 bytes (256 bits) for AES-256, got ${keyBuffer.length} bytes. Key may be invalid base64.`)
    }
    
    const keyArray = new Uint8Array(keyBuffer)
    
    encryptionKey = await crypto.subtle.importKey(
      'raw',
      keyArray,
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // extractable
      ['encrypt', 'decrypt']
    )
    
    encryptionKeyString = cleanKey
    console.log('✅ [IMPORT] Encryption key imported successfully')
    
    // Test encryption to verify key works (direct test without calling encryptData to avoid circular issues)
    try {
      const testData = 'test-encryption-verification'
      const testDataBuffer = new TextEncoder().encode(testData)
      const testIV = crypto.getRandomValues(new Uint8Array(12))
      const testEncrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: testIV },
        encryptionKey,
        testDataBuffer
      )
      if (testEncrypted.byteLength === 0) {
        throw new Error('Key import verification failed - encryption test returned empty result')
      }
      console.log('✅ [IMPORT] Key verification passed - encryption test successful')
    } catch (testError: any) {
      console.error('❌ [IMPORT] Key verification failed:', testError)
      throw new Error(`Key import verification failed: ${testError.message}`)
    }
  } catch (error: any) {
    console.error('❌ [IMPORT] Failed to import encryption key:', error)
    console.error('❌ [IMPORT] Error details:', error.message)
    throw error
  }
}

/**
 * Get or initialize encryption key
 * @returns The encryption key string
 */
export async function getEncryptionKey(): Promise<string> {
  // Check if key is already loaded
  if (encryptionKeyString) {
    return encryptionKeyString
  }

  // Try to get from environment variable
  const envKey = process.env.NEXT_PUBLIC_MESSAGE_ENCRYPTION_KEY
  
  if (envKey) {
    try {
      console.log('🔑 [KEY] Loading encryption key from environment variable...')
      console.log('🔑 [KEY] Key value (first 20 chars):', envKey.substring(0, 20) + '...')
      await importEncryptionKey(envKey)
      console.log('✅ [KEY] Encryption key loaded from environment successfully')
      console.log('🔑 [KEY] Key string length:', encryptionKeyString?.length || 0)
      if (!encryptionKey) {
        throw new Error('Key imported but encryptionKey is null')
      }
      return encryptionKeyString!
    } catch (error: any) {
      console.error('❌ [KEY] Failed to load encryption key from env:', error.message)
      console.warn('⚠️ Failed to load encryption key from env, generating new one')
    }
  } else {
    console.warn('⚠️ [KEY] NEXT_PUBLIC_MESSAGE_ENCRYPTION_KEY not found in environment')
  }

  // Generate new key if not found
  const newKey = await generateEncryptionKey()
  console.log('🔑 Generated new encryption key')
  return newKey
}

/**
 * Encrypt data using AES-GCM
 * @param data - Data to encrypt (string)
 * @returns Encrypted data as base64 string with IV prepended
 */
export async function encryptData(data: string): Promise<string> {
  try {
    // Ensure we have an encryption key
    const keyString = await getEncryptionKey()
    console.log('🔑 [ENCRYPT] Using encryption key (length):', keyString.length)
    
    if (!encryptionKey) {
      throw new Error('Encryption key not available - key was not loaded properly')
    }

    if (!data || data.trim() === '') {
      throw new Error('Cannot encrypt empty data')
    }

    console.log('🔒 [ENCRYPT] Encrypting data (length):', data.length)
    
    // Generate random IV (12 bytes for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    // Convert data to ArrayBuffer
    const dataBuffer = new TextEncoder().encode(data)
    
    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      encryptionKey,
      dataBuffer
    )
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encryptedBuffer), iv.length)
    
    // Convert to base64
    const encryptedBase64 = Buffer.from(combined).toString('base64')
    console.log('✅ [ENCRYPT] Data encrypted successfully (encrypted length):', encryptedBase64.length)
    console.log('🔒 [ENCRYPT] Encrypted data preview (first 50 chars):', encryptedBase64.substring(0, 50) + '...')
    
    return encryptedBase64
  } catch (error: any) {
    console.error('❌ [ENCRYPT] Encryption failed:', error)
    console.error('❌ [ENCRYPT] Error details:', error.message, error.stack)
    throw error
  }
}

/**
 * Decrypt data using AES-GCM
 * @param encryptedData - Encrypted data as base64 string (with IV prepended)
 * @returns Decrypted data as string
 */
export async function decryptData(encryptedData: string): Promise<string> {
  try {
    // Ensure we have an encryption key
    await getEncryptionKey()
    
    if (!encryptionKey) {
      throw new Error('Encryption key not available')
    }

    // Convert from base64
    const combined = Buffer.from(encryptedData, 'base64')
    
    // Extract IV (first 12 bytes) and encrypted data
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)
    
    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      encryptionKey,
      encrypted
    )
    
    // Convert to string
    return new TextDecoder().decode(decryptedBuffer)
  } catch (error: any) {
    console.error('❌ Decryption failed:', error)
    throw error
  }
}

/**
 * Initialize Arkiv client
 * Returns true if successful, false otherwise
 */
export async function initializeArkivClient(): Promise<boolean> {
  if (isInitialized && arkivClient) {
    return true
  }

  try {
    // Get environment variables (client-side access requires NEXT_PUBLIC_ prefix)
    const privateKey = process.env.NEXT_PUBLIC_ARKIV_PRIVATE_KEY
    const rpcUrl = process.env.NEXT_PUBLIC_ARKIV_RPC_URL || 'https://mendoza.hoodi.arkiv.network/rpc'
    const wsUrl = process.env.NEXT_PUBLIC_ARKIV_WS_URL || 'wss://mendoza.hoodi.arkiv.network/rpc/ws'
    const chainIdStr = process.env.NEXT_PUBLIC_ARKIV_CHAIN_ID || String(DEFAULT_CHAIN_ID)

    if (!privateKey) {
      console.warn('⚠️ Arkiv: Private key not configured. Messages will not be stored to Arkiv.')
      return false
    }

    // Parse chain ID
    const chainId = Number(chainIdStr)
    if (!Number.isFinite(chainId) || chainId <= 0) {
      console.error(`❌ Invalid CHAIN_ID value: ${chainIdStr}`)
      return false
    }

    // Remove 0x prefix from private key if present for hex conversion
    const privateKeyHex = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey

    // Create Arkiv client using the same API as demo.ts
    arkivClient = await createClient(
      chainId,
      new Tagged("privatekey", Buffer.from(privateKeyHex, "hex")),
      rpcUrl,
      wsUrl
    )

    isInitialized = true
    console.log('✅ Arkiv client initialized successfully')
    return true
  } catch (error: any) {
    console.error('❌ Failed to initialize Arkiv client:', error.message)
    return false
  }
}

/**
 * Generate UUID for browser environment (replacement for crypto.randomUUID)
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Store a received message to Arkiv
 * Uses the same API pattern as demo.ts
 * @param messageData - The message data to store
 * @returns Object with success status and entityKey or error message
 */
export async function storeMessageToArkiv(
  messageData: {
    content: string
    from: string
    timestamp: string
    uuid?: string
  }
): Promise<{ success: boolean; entityKey?: string; error?: string }> {
  try {
    // Initialize client if not already done
    if (!isInitialized || !arkivClient) {
      const initialized = await initializeArkivClient()
      if (!initialized) {
        const errorMsg = '⚠️ Arkiv: Client not initialized, skipping storage'
        console.warn(errorMsg)
        return { success: false, error: 'Arkiv client not initialized' }
      }
    }

    // Prepare message data for storage - encrypt ONLY the content field
    console.log('🔒 [CREATE] Encrypting message content before storing to Arkiv...')
    console.log('🔒 [CREATE] Original content to encrypt:', messageData.content)
    
    // Encrypt only the content field - THIS IS CRITICAL
    // DO NOT STORE PLAINTEXT - encryption must succeed
    let encryptedContent: string
    try {
      console.log('🔒 [CREATE] Calling encryptData with content:', messageData.content)
      encryptedContent = await encryptData(messageData.content)
      console.log('✅ [CREATE] Message content encrypted successfully')
      console.log('🔒 [CREATE] Encrypted content length:', encryptedContent.length)
      console.log('🔒 [CREATE] Encrypted content preview:', encryptedContent.substring(0, 50) + '...')
      
      // CRITICAL: Verify encryption worked - encrypted content MUST be different from original
      if (encryptedContent === messageData.content) {
        console.error('❌ [CREATE] CRITICAL ERROR: Encrypted content matches original!')
        console.error('❌ [CREATE] Original:', messageData.content)
        console.error('❌ [CREATE] Encrypted:', encryptedContent)
        throw new Error('Encryption failed - encrypted content matches original (encryption did not occur). Will not store plaintext.')
      }
      
      // Verify encrypted content looks like base64 (should be much longer than original)
      if (encryptedContent.length < messageData.content.length * 2) {
        console.warn('⚠️ [CREATE] Encrypted content seems too short. Original:', messageData.content.length, 'Encrypted:', encryptedContent.length)
      }
      
    } catch (error: any) {
      console.error('❌ [CREATE] CRITICAL: Failed to encrypt content:', error)
      console.error('❌ [CREATE] Will NOT store plaintext to Arkiv')
      return { success: false, error: `Encryption failed - cannot store plaintext: ${error.message}` }
    }
    
    console.log('🔒 [CREATE] Only encrypted content will be stored in Arkiv (no plaintext content)')
    
    // Store data structure with encrypted content field
    const messagePayload = {
      type: "xx-network-message",
      content: encryptedContent,  // ONLY encrypted content is stored here - NOT plaintext
      from: messageData.from,
      timestamp: messageData.timestamp,
      uuid: messageData.uuid || null,
      source: 'ghostmesh-server'
    }
    
    // FINAL VERIFICATION: Ensure we're storing encrypted content, not plaintext
    if (messagePayload.content === messageData.content) {
      console.error('❌ [CREATE] CRITICAL: Payload content matches original - encryption failed!')
      console.error('❌ [CREATE] Original content:', messageData.content)
      console.error('❌ [CREATE] Payload content:', messagePayload.content)
      return { success: false, error: 'CRITICAL: Cannot store plaintext content. Encryption verification failed.' }
    }
    
    // Verify the payload has encrypted content
    console.log('✅ [CREATE] Verification: Payload content is encrypted (different from original):', messagePayload.content !== messageData.content)
    console.log('🔒 [CREATE] Original content:', messageData.content)
    console.log('🔒 [CREATE] Encrypted content (first 50 chars):', messagePayload.content.substring(0, 50) + '...')
    console.log('🔒 [CREATE] Encrypted content length:', messagePayload.content.length)
    
    // The payload to store in Arkiv - ONLY encrypted content in the content field
    const encryptedPayload = {
      encrypted: true,
      data: messagePayload  // Contains encrypted content in content field, other fields are plaintext metadata
    }
    
    // Final check before encoding
    const payloadToStore = JSON.stringify(encryptedPayload)
    console.log('🔒 [CREATE] Final payload to store (first 200 chars):', payloadToStore.substring(0, 200) + '...')
    console.log('🔒 [CREATE] Verifying encrypted content is in payload...')
    const parsedCheck = JSON.parse(payloadToStore)
    if (parsedCheck.data.content === messageData.content) {
      console.error('❌ [CREATE] CRITICAL: Final payload still contains plaintext!')
      return { success: false, error: 'CRITICAL: Final payload verification failed - plaintext detected' }
    }
    console.log('✅ [CREATE] Final verification passed - encrypted content confirmed in payload')

    // Generate entity ID (matching demo.ts pattern)
    const entityId = generateUUID()

    // Create entity using createEntities (plural) with Annotation objects (matching demo.ts)
    const receipt = await arkivClient.createEntities([{
      data: new TextEncoder().encode(payloadToStore),
      expiresIn: DEFAULT_EXPIRATION, // 7 days in seconds
      stringAnnotations: [
        new Annotation("type", messagePayload.type),
        new Annotation("source", messagePayload.source),
        new Annotation("id", entityId),
        ...(messageData.uuid ? [new Annotation("uuid", messageData.uuid)] : []),
        ...(messageData.from ? [new Annotation("from", messageData.from.substring(0, 20))] : [])
      ],
      numericAnnotations: [
        new Annotation("timestamp", new Date(messageData.timestamp).getTime()),
        new Annotation("created", Date.now())
      ]
    }])

    const entityKey = receipt[0].entityKey
    console.log('✅ [CREATE] Message stored to Arkiv:', entityKey)
    return { success: true, entityKey }
  } catch (error: any) {
    // Log error but don't throw - we don't want to break message receiving
    const errorMsg = error.message || String(error)
    console.error('❌ [CREATE] Failed to store message to Arkiv:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * READ: Query entities from Arkiv
 * @param query - Query string (e.g., 'type = "xx-network-message"')
 * @returns Array of entities matching the query
 */
export async function readMessagesFromArkiv(
  query: string = 'type = "xx-network-message"'
): Promise<{ success: boolean; entities?: any[]; error?: string }> {
  try {
    if (!isInitialized || !arkivClient) {
      const initialized = await initializeArkivClient()
      if (!initialized) {
        return { success: false, error: 'Arkiv client not initialized' }
      }
    }

    const entities = await arkivClient.queryEntities(query)
    console.log(`✅ [READ] Found ${entities.length} entity/entities`)

    const results = await Promise.all(entities.map(async (entity: any) => {
      const rawData = JSON.parse(new TextDecoder().decode(entity.storageValue))
      
      // Check if data has encrypted content field
      let decryptedData = rawData.data || rawData
      let encryptedContentString = null
      let decryptedContentString = null
      
      if (rawData.encrypted && rawData.data && rawData.data.content) {
        try {
          console.log('🔓 [READ] Decrypting content for entity:', entity.entityKey)
          encryptedContentString = rawData.data.content  // Store encrypted content for display
          
          // Decrypt only the content field
          const decryptedContent = await decryptData(rawData.data.content)
          decryptedContentString = decryptedContent
          
          // Replace encrypted content with decrypted content
          decryptedData = {
            ...rawData.data,
            content: decryptedContent  // Decrypted content
          }
          
          console.log('✅ [READ] Successfully decrypted content for entity:', entity.entityKey)
        } catch (error: any) {
          console.error('❌ [READ] Failed to decrypt content:', error)
          decryptedData = { ...rawData.data, decryptionError: error.message }
        }
      } else {
        // No encryption, use data as-is
        encryptedContentString = null
        decryptedContentString = rawData.data?.content || null
      }
      
      return {
        entityKey: entity.entityKey,
        data: decryptedData,
        encrypted: rawData.encrypted || false,
        encryptedData: encryptedContentString, // Encrypted content field for display
        decryptedData: decryptedContentString // Decrypted content field for display
      }
    }))

    console.log('✅ [READ] Query results:', results)
    return { success: true, entities: results }
  } catch (error: any) {
    const errorMsg = error.message || String(error)
    console.error('❌ [READ] Failed to query entities:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * UPDATE: Update an existing entity in Arkiv
 * @param entityKey - The entity key to update
 * @param newData - New data to store
 * @param expiresIn - New expiration time in seconds
 * @returns Updated entity receipt
 */
export async function updateMessageInArkiv(
  entityKey: string,
  newData: any,
  expiresIn: number = DEFAULT_EXPIRATION
): Promise<{ success: boolean; entityKey?: string; error?: string }> {
  try {
    if (!isInitialized || !arkivClient) {
      const initialized = await initializeArkivClient()
      if (!initialized) {
        return { success: false, error: 'Arkiv client not initialized' }
      }
    }

    console.log('🔄 [UPDATE] Updating entity...', { entityKey, newData, expiresIn })

    // Encrypt only the content field before storing
    const encryptedContent = await encryptData(newData.content || '')
    
    // Store data structure with encrypted content field
    const updatedPayload = {
      type: newData.type || "xx-network-message",
      content: encryptedContent,  // Only encrypted content
      from: newData.from || '',
      timestamp: newData.timestamp || new Date().toISOString(),
      uuid: newData.uuid || null,
      source: newData.source || 'ghostmesh-server'
    }
    
    const encryptedPayload = {
      encrypted: true,
      data: updatedPayload
    }

    const updateReceipt = await arkivClient.updateEntities([{
      entityKey: entityKey,
      data: new TextEncoder().encode(JSON.stringify(encryptedPayload)),
      expiresIn: expiresIn,
      stringAnnotations: [
        new Annotation("type", newData.type || "xx-network-message")
      ],
      numericAnnotations: [
        new Annotation("updated", Date.now())
      ]
    }])

    console.log('✅ [UPDATE] Entity updated successfully:', updateReceipt[0].entityKey)
    return { success: true, entityKey: updateReceipt[0].entityKey }
  } catch (error: any) {
    const errorMsg = error.message || String(error)
    console.error('❌ [UPDATE] Failed to update entity:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * DELETE: Delete an entity from Arkiv
 * @param entityKey - The entity key to delete
 * @returns Deletion receipt
 */
export async function deleteMessageFromArkiv(
  entityKey: string
): Promise<{ success: boolean; entityKey?: string; error?: string }> {
  try {
    if (!isInitialized || !arkivClient) {
      const initialized = await initializeArkivClient()
      if (!initialized) {
        return { success: false, error: 'Arkiv client not initialized' }
      }
    }

    console.log('🗑️ [DELETE] Deleting entity...', { entityKey })

    const deleteReceipt = await arkivClient.deleteEntities([entityKey])
    console.log('✅ [DELETE] Entity deleted successfully:', deleteReceipt[0].entityKey)
    return { success: true, entityKey: deleteReceipt[0].entityKey }
  } catch (error: any) {
    const errorMsg = error.message || String(error)
    console.error('❌ [DELETE] Failed to delete entity:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * EXTEND: Extend entity lifetime in Arkiv
 * @param entityKey - The entity key to extend
 * @param numberOfBlocks - Number of blocks to extend (seconds)
 * @returns Extended entity receipt
 */
export async function extendMessageInArkiv(
  entityKey: string,
  numberOfBlocks: number = 43200 // 12 hours default
): Promise<{ success: boolean; entityKey?: string; newExpirationBlock?: number; error?: string }> {
  try {
    if (!isInitialized || !arkivClient) {
      const initialized = await initializeArkivClient()
      if (!initialized) {
        return { success: false, error: 'Arkiv client not initialized' }
      }
    }

    console.log('⏰ [EXTEND] Extending entity lifetime...', { entityKey, numberOfBlocks })

    const extendReceipt = await arkivClient.extendEntities([{
      entityKey: entityKey,
      numberOfBlocks: numberOfBlocks
    }])

    console.log('✅ [EXTEND] Entity lifetime extended successfully:', {
      entityKey: extendReceipt[0].entityKey,
      newExpirationBlock: extendReceipt[0].newExpirationBlock
    })

    return {
      success: true,
      entityKey: extendReceipt[0].entityKey,
      newExpirationBlock: extendReceipt[0].newExpirationBlock
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error)
    console.error('❌ [EXTEND] Failed to extend entity lifetime:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

