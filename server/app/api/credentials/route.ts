import { NextResponse } from 'next/server'

// Note: In a real app, you'd store this in a database or state management
// For now, clients should access the main page to get credentials
export async function GET() {
  return NextResponse.json({
    message: 'Please open http://localhost:4000 in a browser to initialize the server and view credentials',
    initialized: false
  })
}
