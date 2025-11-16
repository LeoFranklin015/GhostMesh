
import { NextRequest, NextResponse } from 'next/server'
import { readMessagesFromArkiv } from '../../../lib/arkiv'

/**
 * GET /api/[type]
 * Fetch messages from Arkiv based on the type parameter with optional filters
 * 
 * Examples:
 *   GET /api/Weather
 *   GET /api/Weather?minData=30
 *   GET /api/Weather?startTime=2025-11-16T00:00:00Z&endTime=2025-11-16T23:59:59Z
 *   GET /api/Weather?minData=30&startTime=2025-11-16T00:00:00Z&endTime=2025-11-17T00:00:00Z
 * 
 * Query Parameters:
 *   - minData: Filter messages where decrypted content VALUE (if numeric) or LENGTH (if string) is greater than this value
 *              Examples: minData=30 returns Weather data with temperature > 30
 *   - startTime: Filter messages after this timestamp (ISO 8601 format)
 *   - endTime: Filter messages before this timestamp (ISO 8601 format)
 * 
 * This endpoint works server-side and doesn't require MetaMask
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const { type } = params
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const minData = searchParams.get('minData')
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')

    // Validate type parameter
    if (!type || type.trim() === '') {
      return NextResponse.json(
        { error: 'Type parameter is required' },
        { status: 400 }
      )
    }

    // Parse and validate optional parameters
    let minDataThreshold: number | null = null
    let startTimeDate: Date | null = null
    let endTimeDate: Date | null = null

    if (minData) {
      minDataThreshold = parseInt(minData, 10)
      if (isNaN(minDataThreshold) || minDataThreshold < 0) {
        return NextResponse.json(
          { error: 'minData must be a positive number' },
          { status: 400 }
        )
      }
    }

    if (startTime) {
      startTimeDate = new Date(startTime)
      if (isNaN(startTimeDate.getTime())) {
        return NextResponse.json(
          { error: 'startTime must be a valid ISO 8601 timestamp' },
          { status: 400 }
        )
      }
    }

    if (endTime) {
      endTimeDate = new Date(endTime)
      if (isNaN(endTimeDate.getTime())) {
        return NextResponse.json(
          { error: 'endTime must be a valid ISO 8601 timestamp' },
          { status: 400 }
        )
      }
    }

    // Validate time range
    if (startTimeDate && endTimeDate && startTimeDate > endTimeDate) {
      return NextResponse.json(
        { error: 'startTime must be before endTime' },
        { status: 400 }
      )
    }

    console.log(`📥 [API] Fetching messages of type: "${type}"`)
    console.log(`📥 [API] Filters:`, {
      minData: minDataThreshold,
      startTime: startTime || 'none',
      endTime: endTime || 'none'
    })

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

    let filteredEntities = result.entities || []
    const totalCount = filteredEntities.length

    // Apply content value/length filter (after decryption)
    if (minDataThreshold !== null) {
      filteredEntities = filteredEntities.filter(entity => {
        const decryptedData = entity.decryptedData
        if (!decryptedData) return false
        
        // Try to parse as number first (for numeric sensor data like temperature)
        const numericValue = parseFloat(decryptedData)
        if (!isNaN(numericValue)) {
          // If it's a number, compare the numeric value
          return numericValue > minDataThreshold
        } else {
          // If it's not a number, fall back to string length comparison
          return decryptedData.length > minDataThreshold
        }
      })
      console.log(`🔍 [API] Data filter: ${filteredEntities.length}/${totalCount} entities have value/length > ${minDataThreshold}`)
    }

    // Apply time range filter
    if (startTimeDate || endTimeDate) {
      filteredEntities = filteredEntities.filter(entity => {
        const messageTime = entity.data?.timestamp ? new Date(entity.data.timestamp) : null
        if (!messageTime || isNaN(messageTime.getTime())) {
          return false // Skip entities without valid timestamp
        }

        let inRange = true
        if (startTimeDate) {
          inRange = inRange && messageTime >= startTimeDate
        }
        if (endTimeDate) {
          inRange = inRange && messageTime <= endTimeDate
        }
        return inRange
      })
      console.log(`🔍 [API] Time range filter: ${filteredEntities.length}/${totalCount} entities in range`)
    }

    console.log(`✅ [API] Found ${filteredEntities.length} entities of type "${type}" (${totalCount} total before filtering)`)

    return NextResponse.json({
      success: true,
      type: type,
      count: filteredEntities.length,
      totalBeforeFiltering: totalCount,
      entities: filteredEntities,
      filters: {
        minData: minDataThreshold,
        startTime: startTime || null,
        endTime: endTime || null
      },
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

