/**
 * Arkiv client initialization
 * Handles wallet and public client setup with private key authentication
 */

import { createWalletClient, createPublicClient, http } from "@arkiv-network/sdk"
import { mendoza } from "@arkiv-network/sdk/chains"
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts"
import {
  isInitialized,
  walletClient,
  publicClient,
  setWalletClient,
  setPublicClient,
  setIsInitialized
} from './types'

/**
 * Initialize Arkiv client with private key
 * Uses private key from environment variable for all operations
 * Returns true if successful, false otherwise
 */
export async function initializeArkivClient(): Promise<boolean> {
  // If already initialized, return true
  if (isInitialized && walletClient && publicClient) {
    console.log('✅ [INIT] Already initialized')
    return true
  }
  
  return await initializeArkivClientWithPrivateKey()
}

/**
 * Initialize Arkiv client with private key
 */
async function initializeArkivClientWithPrivateKey(): Promise<boolean> {
  try {
    console.log('🔄 [INIT] Initializing Arkiv client with private key...')
    
    // Detect if we're in browser (client-side) or server-side
    const isBrowser = typeof window !== 'undefined'
    
    // Get private key from environment variable
    let privateKey: string | undefined
    if (isBrowser) {
      // Browser: Only NEXT_PUBLIC_ prefix works
      privateKey = process.env.NEXT_PUBLIC_ARKIV_PRIVATE_KEY
      console.log('🌐 [INIT] Browser context detected - using NEXT_PUBLIC_ARKIV_PRIVATE_KEY')
    } else {
      // Server: Prefer ARKIV_PRIVATE_KEY (more secure), fallback to NEXT_PUBLIC_ARKIV_PRIVATE_KEY
      privateKey = process.env.ARKIV_PRIVATE_KEY || process.env.NEXT_PUBLIC_ARKIV_PRIVATE_KEY
      console.log('🖥️ [INIT] Server context detected - using ARKIV_PRIVATE_KEY or NEXT_PUBLIC_ARKIV_PRIVATE_KEY')
    }

    if (!privateKey) {
      const envVarName = isBrowser ? 'NEXT_PUBLIC_ARKIV_PRIVATE_KEY' : 'ARKIV_PRIVATE_KEY or NEXT_PUBLIC_ARKIV_PRIVATE_KEY'
      const errorMsg = `⚠️ Private key not configured. Please set ${envVarName} in your .env.local file.`
      console.error('❌ [INIT]', errorMsg)
      console.error('❌ [INIT] Context:', { isBrowser, isServer: !isBrowser })
      console.error('❌ [INIT] Available env vars:', {
        hasARKIV_PRIVATE_KEY: !!process.env.ARKIV_PRIVATE_KEY,
        hasNEXT_PUBLIC_ARKIV_PRIVATE_KEY: !!process.env.NEXT_PUBLIC_ARKIV_PRIVATE_KEY,
      })
      console.error('❌ [INIT] Note: In browser/client components, only NEXT_PUBLIC_* variables are accessible.')
      return false
    }

    console.log('✅ [INIT] Private key found (length):', privateKey.length)
    console.log('✅ [INIT] Private key preview:', privateKey.substring(0, 10) + '...')

    // Create account from private key
    console.log('🔄 [INIT] Creating account from private key...')
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    console.log('✅ [INIT] Account created:', account.address)

    // Create wallet client with private key
    console.log('🔄 [INIT] Creating wallet client...')
    const wallet = createWalletClient({
      chain: mendoza,
      transport: http(),
      account: account,
    })
    setWalletClient(wallet)
    console.log('✅ [INIT] Wallet client created')

    // Create public client for read operations
    console.log('🔄 [INIT] Creating public client...')
    const pub = createPublicClient({
      chain: mendoza,
      transport: http(),
    })
    setPublicClient(pub)
    console.log('✅ [INIT] Public client created')

    setIsInitialized(true)
    console.log('✅ [INIT] Arkiv clients initialized successfully with private key')
    return true
  } catch (error: any) {
    console.error('❌ [INIT] Failed to initialize Arkiv client:', error)
    console.error('❌ [INIT] Error details:', error.message)
    console.error('❌ [INIT] Error stack:', error.stack)
    return false
  }
}

