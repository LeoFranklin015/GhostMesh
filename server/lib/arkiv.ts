/**
 * Arkiv Storage Utility
 * Handles storing received messages to Arkiv decentralized storage
 * Uses the same API as demo.ts
 */

import { createClient, Annotation, Tagged } from 'arkiv-sdk'

// Default expiration: 7 days (604800 seconds)
const DEFAULT_EXPIRATION = 604800

// Default chain ID for Mendoza testnet
const DEFAULT_CHAIN_ID = 60138453056

let arkivClient: any = null
let isInitialized = false

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

    // Prepare message data for storage (matching demo.ts pattern)
    const messagePayload = {
      type: "xx-network-message",
      content: messageData.content,
      from: messageData.from,
      timestamp: messageData.timestamp,
      uuid: messageData.uuid || null,
      source: 'ghostmesh-server'
    }

    // Generate entity ID (matching demo.ts pattern)
    const entityId = generateUUID()

    // Create entity using createEntities (plural) with Annotation objects (matching demo.ts)
    const receipt = await arkivClient.createEntities([{
      data: new TextEncoder().encode(JSON.stringify(messagePayload)),
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

    const results = entities.map((entity: any) => {
      const data = JSON.parse(new TextDecoder().decode(entity.storageValue))
      return {
        entityKey: entity.entityKey,
        data: data
      }
    })

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

    const updateReceipt = await arkivClient.updateEntities([{
      entityKey: entityKey,
      data: new TextEncoder().encode(JSON.stringify(newData)),
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

