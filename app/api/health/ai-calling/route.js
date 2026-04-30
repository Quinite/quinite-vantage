import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const serverUrl = process.env.WEBSOCKET_SERVER_URL || process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL
    
    if (!serverUrl) {
      return NextResponse.json({ status: 'offline', error: 'URL not configured' })
    }

    // Server-side fetch avoids CORS issues
    const res = await fetch(`${serverUrl}/health`, { 
      cache: 'no-store',
      // Add a timeout to prevent hanging
      signal: AbortSignal.timeout(5000) 
    })
    
    if (res.ok) {
      return NextResponse.json({ status: 'operational' })
    }
    
    return NextResponse.json({ status: 'degraded', code: res.status })
  } catch (error) {
    console.error('AI Calling Server health check failed:', error)
    return NextResponse.json({ status: 'offline', error: error.message })
  }
}
