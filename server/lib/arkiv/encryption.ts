/**
 * Encryption utilities for Arkiv
 * Handles AES-GCM encryption/decryption of message data
 */

import {
  encryptionKey,
  encryptionKeyString,
  setEncryptionKey,
  setEncryptionKeyString
} from './types'

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
    
    setEncryptionKey(key)
    setEncryptionKeyString(keyString)
    
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
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyArray,
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // extractable
      ['encrypt', 'decrypt']
    )
    
    setEncryptionKey(key)
    setEncryptionKeyString(cleanKey)
    console.log('✅ [IMPORT] Encryption key imported successfully')
    
    // Test encryption to verify key works
    try {
      const testData = 'test-encryption-verification'
      const testDataBuffer = new TextEncoder().encode(testData)
      const testIV = crypto.getRandomValues(new Uint8Array(12))
      const testEncrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: testIV },
        key,
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
  const envKey = process.env.NEXT_PUBLIC_MESSAGE_ENCRYPTION_KEY || process.env.MESSAGE_ENCRYPTION_KEY
  
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

