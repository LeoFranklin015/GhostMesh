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

