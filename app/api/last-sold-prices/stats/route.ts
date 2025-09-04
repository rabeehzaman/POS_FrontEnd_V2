import { NextRequest, NextResponse } from 'next/server'

// For static export compatibility (mobile builds)
export const dynamic = 'force-static'
export const revalidate = false


export async function GET(request: NextRequest) {
  console.log('\n========== FETCHING LASTSOLD PRICING STATS (PROXY) ==========')

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://retail-pos-backend-production.up.railway.app'
    
    console.log(`[PROXY] Forwarding to backend: ${backendUrl}/api/last-sold-prices/stats`)

    // Forward the request to the backend
    const backendResponse = await fetch(`${backendUrl}/api/last-sold-prices/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await backendResponse.json()

    if (!backendResponse.ok) {
      console.error('[PROXY] Backend error:', data)
      return NextResponse.json(data, { status: backendResponse.status })
    }

    console.log(`[PROXY] Successfully fetched LastSold pricing stats from backend`)

    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Failed to proxy LastSold pricing stats request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch LastSold pricing stats from backend' },
      { status: 500 }
    )
  }
}