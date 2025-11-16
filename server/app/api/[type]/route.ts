
import { NextRequest, NextResponse } from 'next/server'
import { readMessagesFromArkiv } from '../../../lib/arkiv'

/**
 * GET /api/[type]
 * Fetch messages from Arkiv based on the type parameter
 * 
 * Examples:
 *   GET /api/xx-network-message
 *   GET /api/custom-message-type
 * 
 * This endpoint works server-side and doesn't require MetaMask
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const { type } = params

    // Validate type parameter
    if (!type || type.trim() === '') {
      return NextResponse.json(
        { error: 'Type parameter is required' },
        { status: 400 }
      )
    }

    console.log(`📥 [API] Fetching messages of type: "${type}"`)

    // Query Arkiv for messages with the specified type
    // This uses the public client (read-only, server-safe)
    const result = await readMessagesFromArkiv(type)

    if (!result.success) {
      console.error(`❌ [API] Query failed:`, result.error)
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Failed to fetch messages',
          type: type 
        },
        { status: 500 }
      )
    }

    console.log(`✅ [API] Found ${result.entities?.length || 0} entities of type "${type}"`)

    return NextResponse.json({
      success: true,
      type: type,
      count: result.entities?.length || 0,
      entities: result.entities || [],
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ [API] Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

