import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'online',
    mode: 'nextjs-xxdk-wasm',
    message: 'XX Network Server running with xxdk-wasm in browser context',
    port: 4000,
    timestamp: new Date().toISOString()
  })
}
