/**
 * CRUD operations for Arkiv
 * CREATE, READ, UPDATE, DELETE, EXTEND operations
 */

import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils"
import { eq } from "@arkiv-network/sdk/query"
import { initializeArkivClient } from './client'
import { encryptData, decryptData } from './encryption'
import { generateUUID } from './utils'
import {
  DEFAULT_EXPIRATION_HOURS,
  isInitialized,
  walletClient,
  publicClient,
  queueTransaction
} from './types'

/**
 * Store a received message to Arkiv
 * Uses the same API pattern as demo.ts
 * @param messageData - The message data to store
 * @returns Object with success status and entityKey or error message
 */
export async function storeMessageToArkiv(
  messageData: {
    content: string   // JSON string like '{"type": "Weather", "data": 40}'
    from: string
    timestamp: string
    uuid?: string
  }
): Promise<{ success: boolean; entityKey?: string; error?: string }> {
  try {
    // Initialize client if not already done
    if (!isInitialized || !walletClient) {
      const initialized = await initializeArkivClient()
      if (!initialized) {
        const errorMsg = '⚠️ Arkiv: Client not initialized, skipping storage'
        console.warn(errorMsg)
        return { success: false, error: 'Arkiv client not initialized' }
      }
    }

    console.log('🔒 [CREATE] Processing message content...')
    console.log('🔒 [CREATE] Raw content received:', messageData.content)
    
    // Parse the content as JSON to extract type and data
    let parsedContent: { type: string; data: any }
    try {
      parsedContent = JSON.parse(messageData.content)
      console.log('✅ [CREATE] Content parsed as JSON:', parsedContent)
      
      if (!parsedContent.type || parsedContent.data === undefined) {
        throw new Error('Content JSON must have "type" and "data" fields')
      }
    } catch (parseError: any) {
      console.error('❌ [CREATE] Failed to parse content as standard JSON:', parseError)
      console.error('❌ [CREATE] Content value:', messageData.content)
      
      // Try fallback parser for malformed JSON like: { type: "Weather" data: "40" } or { type: "Weather" data: 40 }
      try {
        console.log('🔄 [CREATE] Attempting fallback parser for malformed JSON...')
        const content = messageData.content.trim()
        
        // Extract type using regex
        const typeMatch = content.match(/type:\s*"([^"]+)"/)
        // Try to match data with quotes first, then without quotes (for numbers)
        let dataMatch = content.match(/data:\s*"([^"]+)"/)
        let dataValue: any
        
        if (dataMatch) {
          // Data has quotes: data: "40"
          dataValue = dataMatch[1]
        } else {
          // Try to match data without quotes: data: 40
          const numericMatch = content.match(/data:\s*([0-9.]+)/)
          if (numericMatch) {
            dataValue = numericMatch[1]
          }
        }
        
        if (!typeMatch || !dataValue) {
          throw new Error('Could not extract type and data from malformed JSON')
        }
        
        parsedContent = {
          type: typeMatch[1],
          data: dataValue
        }
        
        console.log('✅ [CREATE] Fallback parser succeeded:', parsedContent)
        console.log('⚠️ [CREATE] Warning: Received malformed JSON. Please send valid JSON like: {"type":"Weather","data":"40"}')
      } catch (fallbackError: any) {
        console.error('❌ [CREATE] Fallback parser also failed:', fallbackError)
        return { 
          success: false, 
          error: `Content must be valid JSON like {"type":"Weather","data":"40"}. Received: ${messageData.content}. Error: ${parseError.message}` 
        }
      }
    }

    // Extract type and data from parsed content
    const messageType = parsedContent.type
    const messageDataToEncrypt = parsedContent.data
    
    console.log('🔒 [CREATE] Extracted type:', messageType)
    console.log('🔒 [CREATE] Extracted data to encrypt:', messageDataToEncrypt)
    
    // Convert data to string for encryption (if not already a string)
    const dataString = typeof messageDataToEncrypt === 'string' 
      ? messageDataToEncrypt 
      : JSON.stringify(messageDataToEncrypt)
    
    // Encrypt the data field - THIS IS CRITICAL
    // DO NOT STORE PLAINTEXT - encryption must succeed
    let encryptedContent: string
    try {
      console.log('🔒 [CREATE] Calling encryptData with data:', dataString)
      encryptedContent = await encryptData(dataString)
      console.log('✅ [CREATE] Message data encrypted successfully')
      console.log('🔒 [CREATE] Encrypted content length:', encryptedContent.length)
      console.log('🔒 [CREATE] Encrypted content preview:', encryptedContent.substring(0, 50) + '...')
      
      // CRITICAL: Verify encryption worked - encrypted content MUST be different from original
      if (encryptedContent === dataString) {
        console.error('❌ [CREATE] CRITICAL ERROR: Encrypted content matches original!')
        console.error('❌ [CREATE] Original:', dataString)
        console.error('❌ [CREATE] Encrypted:', encryptedContent)
        throw new Error('Encryption failed - encrypted content matches original (encryption did not occur). Will not store plaintext.')
      }
      
      // Verify encrypted content looks like base64 (should be much longer than original)
      if (encryptedContent.length < dataString.length * 2) {
        console.warn('⚠️ [CREATE] Encrypted content seems too short. Original:', dataString.length, 'Encrypted:', encryptedContent.length)
      }
      
    } catch (error: any) {
      console.error('❌ [CREATE] CRITICAL: Failed to encrypt data:', error)
      console.error('❌ [CREATE] Will NOT store plaintext to Arkiv')
      return { success: false, error: `Encryption failed - cannot store plaintext: ${error.message}` }
    }
    
    console.log('🔒 [CREATE] Only encrypted content will be stored in Arkiv (no plaintext data)')
    
    // Store data structure with encrypted content field
    const messagePayload = {
      type: messageType,           // Dynamic type extracted from content JSON
      content: encryptedContent,   // Encrypted data stored as content
      from: messageData.from,
      timestamp: messageData.timestamp,
      uuid: messageData.uuid || null,
      source: 'ghostmesh-server'
    }
    
    // FINAL VERIFICATION: Ensure we're storing encrypted content, not plaintext
    if (messagePayload.content === dataString) {
      console.error('❌ [CREATE] CRITICAL: Payload content matches original - encryption failed!')
      console.error('❌ [CREATE] Original data:', dataString)
      console.error('❌ [CREATE] Payload content:', messagePayload.content)
      return { success: false, error: 'CRITICAL: Cannot store plaintext content. Encryption verification failed.' }
    }
    
    // Verify the payload has encrypted content
    console.log('✅ [CREATE] Verification: Payload content is encrypted (different from original):', messagePayload.content !== dataString)
    console.log('🔒 [CREATE] Original data:', dataString)
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
    if (parsedCheck.data.content === dataString) {
      console.error('❌ [CREATE] CRITICAL: Final payload still contains plaintext!')
      return { success: false, error: 'CRITICAL: Final payload verification failed - plaintext detected' }
    }
    console.log('✅ [CREATE] Final verification passed - encrypted content confirmed in payload')

    // Ensure wallet client is properly initialized
    if (!walletClient) {
      return { success: false, error: 'Wallet client not initialized. Please check ARKIV_PRIVATE_KEY environment variable.' }
    }

    // Verify account is set on wallet client
    if (!walletClient.account) {
      return { success: false, error: 'Account not set on wallet client. Please check ARKIV_PRIVATE_KEY environment variable.' }
    }
    
    console.log('✅ Using account for storage:', walletClient.account.address)

    // Generate entity ID
    const entityId = generateUUID()

    // Queue the transaction to prevent "replacement transaction underpriced" errors
    console.log('⏳ [CREATE] Queuing transaction to prevent conflicts...')
    const { entityKey } = await queueTransaction(async () => {
      // Create entity using new SDK API
      return await walletClient.createEntity({
        payload: jsonToPayload(encryptedPayload),
        contentType: 'application/json',
        attributes: [
          { key: 'type', value: messagePayload.type },
          { key: 'source', value: messagePayload.source },
          { key: 'id', value: entityId },
          ...(messageData.uuid ? [{ key: 'uuid', value: String(messageData.uuid) }] : []),
          ...(messageData.from ? [{ key: 'from', value: messageData.from.substring(0, 20) }] : []),
          { key: 'timestamp', value: String(new Date(messageData.timestamp).getTime()) },
          { key: 'created', value: String(Date.now()) }
        ],
        expiresIn: ExpirationTime.fromHours(DEFAULT_EXPIRATION_HOURS),
      })
    })

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
 * Store sensor data to Arkiv with encrypted temperature and humidity fields
 * @param sensorData - The sensor data object with type, timestamp, temperature, humidity, pin, sensorType
 * @param from - Sender public key
 * @param uuid - Optional message UUID
 * @returns Object with success status and entityKey or error message
 */
export async function storeSensorDataToArkiv(
  sensorData: {
    type: string
    timestamp: string
    temperature: string
    humidity: string
    pin: number
    sensorType: string
  },
  from: string,
  uuid?: string
): Promise<{ success: boolean; entityKey?: string; error?: string }> {
  try {
    // Initialize client if not already done
    if (!isInitialized || !walletClient) {
      const initialized = await initializeArkivClient()
      if (!initialized) {
        const errorMsg = '⚠️ Arkiv: Client not initialized, skipping storage'
        console.warn(errorMsg)
        return { success: false, error: 'Arkiv client not initialized' }
      }
    }

    console.log('🔒 [SENSOR] Processing sensor data...')
    console.log('🔒 [SENSOR] Raw sensor data:', sensorData)
    
    // Encrypt temperature and humidity fields individually
    let encryptedTemperature: string
    let encryptedHumidity: string
    
    try {
      console.log('🔒 [SENSOR] Encrypting temperature:', sensorData.temperature)
      encryptedTemperature = await encryptData(sensorData.temperature)
      console.log('✅ [SENSOR] Temperature encrypted successfully')
      
      console.log('🔒 [SENSOR] Encrypting humidity:', sensorData.humidity)
      encryptedHumidity = await encryptData(sensorData.humidity)
      console.log('✅ [SENSOR] Humidity encrypted successfully')
    } catch (encryptError: any) {
      console.error('❌ [SENSOR] Failed to encrypt sensor data:', encryptError)
      return { success: false, error: `Encryption failed: ${encryptError.message}` }
    }
    
    // Create payload with encrypted temperature and humidity
    const sensorPayload = {
      type: sensorData.type,
      timestamp: sensorData.timestamp,
      temperature: encryptedTemperature,  // Encrypted
      humidity: encryptedHumidity,         // Encrypted
      pin: sensorData.pin,
      sensorType: sensorData.sensorType,
      encrypted: true,
      source: 'ghostmesh-server'
    }
    
    // Wrap in encrypted payload structure
    const encryptedPayload = {
      encrypted: true,
      data: sensorPayload
    }
    
    // Verify we're storing encrypted values
    if (sensorPayload.temperature === sensorData.temperature || sensorPayload.humidity === sensorData.humidity) {
      console.error('❌ [SENSOR] CRITICAL: Encrypted values match original - encryption failed!')
      return { success: false, error: 'CRITICAL: Encryption verification failed - plaintext detected' }
    }
    
    console.log('✅ [SENSOR] Verification passed - encrypted values confirmed')
    console.log('🔒 [SENSOR] Original temperature:', sensorData.temperature)
    console.log('🔒 [SENSOR] Encrypted temperature (first 50 chars):', encryptedTemperature.substring(0, 50) + '...')
    console.log('🔒 [SENSOR] Original humidity:', sensorData.humidity)
    console.log('🔒 [SENSOR] Encrypted humidity (first 50 chars):', encryptedHumidity.substring(0, 50) + '...')

    // Ensure wallet client is properly initialized
    if (!walletClient) {
      return { success: false, error: 'Wallet client not initialized. Please check ARKIV_PRIVATE_KEY environment variable.' }
    }

    // Verify account is set on wallet client
    if (!walletClient.account) {
      return { success: false, error: 'Account not set on wallet client. Please check ARKIV_PRIVATE_KEY environment variable.' }
    }
    
    console.log('✅ Using account for storage:', walletClient.account.address)

    // Generate entity ID
    const entityId = generateUUID()

    // Queue the transaction to prevent "replacement transaction underpriced" errors
    console.log('⏳ [SENSOR] Queuing transaction to prevent conflicts...')
    const { entityKey } = await queueTransaction(async () => {
      // Create entity using new SDK API
      return await walletClient.createEntity({
        payload: jsonToPayload(encryptedPayload),
        contentType: 'application/json',
        attributes: [
          { key: 'type', value: sensorData.type },
          { key: 'source', value: 'ghostmesh-server' },
          { key: 'id', value: entityId },
          { key: 'sensorType', value: sensorData.sensorType },
          { key: 'pin', value: String(sensorData.pin) },
          ...(uuid ? [{ key: 'uuid', value: String(uuid) }] : []),
          ...(from ? [{ key: 'from', value: from.substring(0, 20) }] : []),
          { key: 'timestamp', value: String(new Date(sensorData.timestamp).getTime()) },
          { key: 'created', value: String(Date.now()) }
        ],
        expiresIn: ExpirationTime.fromHours(DEFAULT_EXPIRATION_HOURS),
      })
    })

    console.log('✅ [SENSOR] Sensor data stored to Arkiv:', entityKey)
    return { success: true, entityKey }
  } catch (error: any) {
    const errorMsg = error.message || String(error)
    console.error('❌ [SENSOR] Failed to store sensor data to Arkiv:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * READ: Query entities from Arkiv
 * @param typeFilter - Optional type filter (e.g., "Weather", "xx-network-message"). If not provided, fetches all types.
 * @returns Array of entities matching the query
 */
export async function readMessagesFromArkiv(
  typeFilter?: string  // Optional type filter
): Promise<{ success: boolean; entities?: any[]; error?: string }> {
  try {
    console.log('📖 [READ] Starting read operation...')
    console.log('📖 [READ] Type filter:', typeFilter || 'all types')
    console.log('📖 [READ] Client status:', { isInitialized, hasPublicClient: !!publicClient, hasWalletClient: !!walletClient })
    
    if (!isInitialized || !publicClient) {
      console.log('📖 [READ] Client not initialized, initializing now...')
      const initialized = await initializeArkivClient()
      console.log('📖 [READ] Initialization result:', initialized)
      
      if (!initialized) {
        const errorMsg = 'Arkiv client not initialized. Please check ARKIV_PRIVATE_KEY environment variable.'
        console.error('❌ [READ]', errorMsg)
        return { success: false, error: errorMsg }
      }
      
      // Double check after initialization
      if (!publicClient) {
        const errorMsg = 'Public client not available after initialization'
        console.error('❌ [READ]', errorMsg)
        return { success: false, error: errorMsg }
      }
    }
    
    console.log('✅ [READ] Client ready, proceeding with query...')

    // Build query using new SDK API
    const queryBuilder = publicClient.buildQuery()
    
    // Apply type filter if provided
    let query = queryBuilder.withAttributes(true).withPayload(true)
    if (typeFilter) {
      query = query.where(eq('type', typeFilter))
    }
    
    const queryResult = await query.fetch()
    
    // Handle different return types - ensure we have an array
    let entities: any[] = []
    if (Array.isArray(queryResult)) {
      entities = queryResult
    } else if (queryResult && typeof queryResult === 'object') {
      // If it's an object, check if it has an entities property or convert it
      if (Array.isArray(queryResult.entities)) {
        entities = queryResult.entities
      } else if (queryResult.data && Array.isArray(queryResult.data)) {
        entities = queryResult.data
      } else {
        // If it's a single entity object, wrap it in an array
        entities = [queryResult]
      }
    }
    
    console.log(`✅ [READ] Found ${entities.length} entity/entities`)
    console.log('✅ [READ] Query result type:', typeof queryResult, Array.isArray(queryResult) ? 'array' : 'object')

    const results = await Promise.all(entities.map(async (entity: any) => {
      // Parse payload from new SDK format
      let rawData: any
      
      // Log entity structure for debugging
      console.log('🔍 [READ] Entity structure:', {
        hasPayload: !!entity.payload,
        hasStorageValue: !!entity.storageValue,
        hasData: !!entity.data,
        entityKeys: Object.keys(entity)
      })
      
      if (entity.payload) {
        // New SDK returns payload as Uint8Array or string
        if (typeof entity.payload === 'string') {
          rawData = JSON.parse(entity.payload)
        } else if (entity.payload instanceof Uint8Array) {
          rawData = JSON.parse(new TextDecoder().decode(entity.payload))
        } else if (entity.payload instanceof ArrayBuffer) {
          rawData = JSON.parse(new TextDecoder().decode(new Uint8Array(entity.payload)))
        } else if (typeof entity.payload === 'object') {
          // Payload might already be parsed
          rawData = entity.payload
        } else {
          rawData = entity.payload
        }
      } else if (entity.data) {
        // Check if data is already parsed
        rawData = entity.data
      } else if (entity.storageValue) {
        // Fallback for old format
        if (typeof entity.storageValue === 'string') {
          rawData = JSON.parse(entity.storageValue)
        } else if (entity.storageValue instanceof Uint8Array) {
          rawData = JSON.parse(new TextDecoder().decode(entity.storageValue))
        } else {
          rawData = JSON.parse(new TextDecoder().decode(new Uint8Array(entity.storageValue)))
        }
      } else {
        // If no payload/data found, use entity as-is
        console.warn('⚠️ [READ] No payload/data found in entity, using entity as-is')
        rawData = entity
      }
      
      // Check if data has encrypted content field or sensor data fields
      let decryptedData = rawData.data || rawData
      let encryptedContentString = null
      let decryptedContentString = null
      
      if (rawData.encrypted && rawData.data) {
        // Check if this is sensor data with encrypted temperature and humidity
        if (rawData.data.type === 'sensor_data' && rawData.data.temperature && rawData.data.humidity) {
          try {
            console.log('🔓 [READ] Decrypting sensor data (temperature & humidity) for entity:', entity.entityKey)
            
            // Decrypt temperature and humidity fields
            const decryptedTemperature = await decryptData(rawData.data.temperature)
            const decryptedHumidity = await decryptData(rawData.data.humidity)
            
            // Replace encrypted fields with decrypted values
            decryptedData = {
              ...rawData.data,
              temperature: decryptedTemperature,  // Decrypted
              humidity: decryptedHumidity          // Decrypted
            }
            
            console.log('✅ [READ] Successfully decrypted sensor data for entity:', entity.entityKey)
          } catch (error: any) {
            console.error('❌ [READ] Failed to decrypt sensor data:', error)
            decryptedData = { ...rawData.data, decryptionError: error.message }
          }
        } else if (rawData.data.content) {
          // Regular message with encrypted content field
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
          // Encrypted but no known encrypted fields, use as-is
          decryptedData = rawData.data
        }
      } else {
        // No encryption, use data as-is
        encryptedContentString = null
        decryptedContentString = rawData.data?.content || null
      }
      
      // Extract entity key from various possible locations
      const entityKey = entity.entityKey || entity.key || entity.id || entity.entityKey || null
      
      return {
        entityKey: entityKey,
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
 * @param newData - New data to store (content should be JSON string with type and data)
 * @param expiresIn - New expiration time in hours
 * @returns Updated entity receipt
 */
export async function updateMessageInArkiv(
  entityKey: string,
  newData: {
    content: string   // JSON string like '{"type": "Weather", "data": 40}'
    from?: string
    timestamp?: string
    uuid?: string
    source?: string
  },
  expiresInHours: number = DEFAULT_EXPIRATION_HOURS
): Promise<{ success: boolean; entityKey?: string; error?: string }> {
  try {
    if (!isInitialized || !walletClient) {
      const initialized = await initializeArkivClient()
      if (!initialized) {
        return { success: false, error: 'Arkiv client not initialized' }
      }
    }

    console.log('🔄 [UPDATE] Updating entity...', { entityKey, newData, expiresInHours })

    // Parse the content as JSON to extract type and data
    let parsedContent: { type: string; data: any }
    try {
      parsedContent = JSON.parse(newData.content)
      console.log('✅ [UPDATE] Content parsed as JSON:', parsedContent)
      
      if (!parsedContent.type || parsedContent.data === undefined) {
        throw new Error('Content JSON must have "type" and "data" fields')
      }
    } catch (parseError: any) {
      console.error('❌ [UPDATE] Failed to parse content as standard JSON:', parseError)
      console.error('❌ [UPDATE] Content value:', newData.content)
      
      // Try fallback parser for malformed JSON like: { type: "Weather" data: "40" } or { type: "Weather" data: 40 }
      try {
        console.log('🔄 [UPDATE] Attempting fallback parser for malformed JSON...')
        const content = newData.content.trim()
        
        // Extract type using regex
        const typeMatch = content.match(/type:\s*"([^"]+)"/)
        // Try to match data with quotes first, then without quotes (for numbers)
        let dataMatch = content.match(/data:\s*"([^"]+)"/)
        let dataValue: any
        
        if (dataMatch) {
          // Data has quotes: data: "40"
          dataValue = dataMatch[1]
        } else {
          // Try to match data without quotes: data: 40
          const numericMatch = content.match(/data:\s*([0-9.]+)/)
          if (numericMatch) {
            dataValue = numericMatch[1]
          }
        }
        
        if (!typeMatch || !dataValue) {
          throw new Error('Could not extract type and data from malformed JSON')
        }
        
        parsedContent = {
          type: typeMatch[1],
          data: dataValue
        }
        
        console.log('✅ [UPDATE] Fallback parser succeeded:', parsedContent)
        console.log('⚠️ [UPDATE] Warning: Received malformed JSON. Please send valid JSON like: {"type":"Weather","data":"40"}')
      } catch (fallbackError: any) {
        console.error('❌ [UPDATE] Fallback parser also failed:', fallbackError)
        return { 
          success: false, 
          error: `Content must be valid JSON like {"type":"Weather","data":"40"}. Received: ${newData.content}. Error: ${parseError.message}` 
        }
      }
    }

    // Extract type and data from parsed content
    const messageType = parsedContent.type
    const messageDataToEncrypt = parsedContent.data
    
    // Convert data to string for encryption (if not already a string)
    const dataString = typeof messageDataToEncrypt === 'string' 
      ? messageDataToEncrypt 
      : JSON.stringify(messageDataToEncrypt)
    
    // Encrypt the data field before storing
    const encryptedContent = await encryptData(dataString)
    
    // Store data structure with encrypted content field
    const updatedPayload = {
      type: messageType,
      content: encryptedContent,  // Encrypted data stored as content
      from: newData.from || '',
      timestamp: newData.timestamp || new Date().toISOString(),
      uuid: newData.uuid || null,
      source: newData.source || 'ghostmesh-server'
    }
    
    const encryptedPayload = {
      encrypted: true,
      data: updatedPayload
    }

    // Queue the transaction to prevent "replacement transaction underpriced" errors
    console.log('⏳ [UPDATE] Queuing transaction to prevent conflicts...')
    const { entityKey: updatedKey } = await queueTransaction(async () => {
      // Update entity using new SDK API
      return await walletClient.updateEntity({
        entityKey: entityKey as `0x${string}`,
        payload: jsonToPayload(encryptedPayload),
        contentType: 'application/json',
        attributes: [
          { key: 'type', value: messageType },
          { key: 'updated', value: String(Date.now()) }
        ],
        expiresIn: ExpirationTime.fromHours(expiresInHours),
      })
    })

    console.log('✅ [UPDATE] Entity updated successfully:', updatedKey)
    return { success: true, entityKey: updatedKey }
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
    if (!isInitialized || !walletClient) {
      const initialized = await initializeArkivClient()
      if (!initialized) {
        return { success: false, error: 'Arkiv client not initialized' }
      }
    }

    console.log('🗑️ [DELETE] Deleting entity...', { entityKey })

    // Queue the transaction to prevent "replacement transaction underpriced" errors
    console.log('⏳ [DELETE] Queuing transaction to prevent conflicts...')
    await queueTransaction(async () => {
      // Delete entity using new SDK API
      return await walletClient.deleteEntity({
        entityKey: entityKey as `0x${string}`,
      })
    })
    
    console.log('✅ [DELETE] Entity deleted successfully:', entityKey)
    return { success: true, entityKey }
  } catch (error: any) {
    const errorMsg = error.message || String(error)
    console.error('❌ [DELETE] Failed to delete entity:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * EXTEND: Extend entity lifetime in Arkiv
 * @param entityKey - The entity key to extend
 * @param additionalHours - Number of hours to extend (default 12)
 * @returns Extended entity receipt
 */
export async function extendMessageInArkiv(
  entityKey: string,
  additionalHours: number = 12
): Promise<{ success: boolean; entityKey?: string; newExpirationBlock?: number; error?: string }> {
  try {
    if (!isInitialized || !walletClient) {
      const initialized = await initializeArkivClient()
      if (!initialized) {
        return { success: false, error: 'Arkiv client not initialized' }
      }
    }

    console.log('⏰ [EXTEND] Extending entity lifetime...', { entityKey, additionalHours })

    // Queue the transaction to prevent "replacement transaction underpriced" errors
    console.log('⏳ [EXTEND] Queuing transaction to prevent conflicts...')
    const { entityKey: extendedKey } = await queueTransaction(async () => {
      // Extend entity using new SDK API
      return await walletClient.extendEntity({
        entityKey: entityKey as `0x${string}`,
        expiresIn: ExpirationTime.fromHours(additionalHours),
      })
    })

    console.log('✅ [EXTEND] Entity lifetime extended successfully:', {
      entityKey: extendedKey
    })

    return {
      success: true,
      entityKey: extendedKey
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error)
    console.error('❌ [EXTEND] Failed to extend entity lifetime:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

