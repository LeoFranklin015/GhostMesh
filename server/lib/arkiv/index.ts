/**
 * Arkiv Storage Utility - Main Export
 * Handles storing received messages to Arkiv decentralized storage
 * Uses the new @arkiv-network/sdk API with private key authentication
 * Includes encryption layer before storing to Arkiv
 */

// Export all encryption functions
export {
  generateEncryptionKey,
  importEncryptionKey,
  getEncryptionKey,
  encryptData,
  decryptData
} from './encryption'

// Export client initialization
export { initializeArkivClient } from './client'

// Export CRUD operations
export {
  storeMessageToArkiv,
  readMessagesFromArkiv,
  updateMessageInArkiv,
  deleteMessageFromArkiv,
  extendMessageInArkiv
} from './operations'

// Export utilities
export { generateUUID } from './utils'

// Export types and constants
export { DEFAULT_EXPIRATION_HOURS } from './types'

