import { NextResponse } from 'next/server'

// Note: Messages are displayed in the browser UI
// This endpoint is a placeholder for future API access
export async function GET() {
  return NextResponse.json({
    message: 'Messages are displayed in the server UI at http://localhost:4000',
    count: 0,
    messages: []
  })
}
