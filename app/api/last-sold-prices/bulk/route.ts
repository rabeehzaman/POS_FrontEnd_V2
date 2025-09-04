import { NextRequest, NextResponse } from 'next/server'

// For static export compatibility (mobile builds)
export const dynamic = 'force-static'
export const revalidate = false


export async function POST(request: NextRequest) {
  console.log('\n========== BULK GETTING LASTSOLD PRICES (PROXY) ==========')

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://retail-pos-backend-production.up.railway.app'
    
    // Get request body
    const body = await request.json()
    
    console.log(`[PROXY] Forwarding to backend: ${backendUrl}/api/last-sold-prices/bulk`)

    // Forward the request to the backend
    const backendResponse = await fetch(`${backendUrl}/api/last-sold-prices/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await backendResponse.json()

    if (!backendResponse.ok) {
      console.error('[PROXY] Backend error:', data)
      return NextResponse.json(data, { status: backendResponse.status })
    }

    console.log(`[PROXY] Successfully retrieved bulk LastSold prices from backend`)

    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Failed to proxy bulk LastSold prices request:', error)
    return NextResponse.json(
      { error: 'Failed to get bulk LastSold prices from backend' },
      { status: 500 }
    )
  }
}