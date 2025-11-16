/**
 * API Route: /api/alldatas
 * Fetches all saved data from Arkiv, decrypts with key, and returns
 */

import { NextRequest, NextResponse } from 'next/server'
import { readMessagesFromArkiv } from '@/lib/arkiv'

export async function GET(request: NextRequest) {
  try {
    console.log('📡 [API] /api/alldatas - Request received')
    console.log('📡 [API] Environment check:', {
      hasWindow: typeof window !== 'undefined',
      nodeEnv: process.env.NODE_ENV,
      hasARKIV_PRIVATE_KEY: !!process.env.ARKIV_PRIVATE_KEY,
      hasNEXT_PUBLIC_ARKIV_PRIVATE_KEY: !!process.env.NEXT_PUBLIC_ARKIV_PRIVATE_KEY,
    })
    
    // Get optional query parameters
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const from = searchParams.get('from')
    const type = searchParams.get('type')

    console.log('📡 [API] Query params:', { date, from, type })

    // Read all messages from Arkiv (already decrypted)
    // This will automatically initialize with private key if in server-side context
    console.log('📡 [API] Reading messages from Arkiv...')
    const result = await readMessagesFromArkiv('type = "xx-network-message"')
    console.log('📡 [API] Read result:', { success: result.success, count: result.entities?.length || 0, error: result.error })

    if (!result.success || !result.entities) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to fetch data from Arkiv',
        },
        { status: 500 }
      )
    }

    let messages = result.entities

    // Apply filters if provided
    if (date) {
      const filterDate = new Date(date)
      messages = messages.filter((msg: any) => {
        const msgDate = new Date(msg.data?.timestamp || msg.timestamp)
        return msgDate.toDateString() === filterDate.toDateString()
      })
    }

    if (from) {
      messages = messages.filter((msg: any) => {
        return msg.data?.from?.toLowerCase().includes(from.toLowerCase())
      })
    }

    if (type) {
      messages = messages.filter((msg: any) => {
        return msg.data?.type?.toLowerCase() === type.toLowerCase()
      })
    }

    // Return decrypted data
    return NextResponse.json({
      success: true,
      data: messages,
      count: messages.length,
      filters: {
        date: date || null,
        from: from || null,
        type: type || null,
      },
    })
  } catch (error: any) {
    console.error('❌ API Error in /api/alldatas:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

