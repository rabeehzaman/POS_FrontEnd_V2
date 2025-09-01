import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('\n========== GETTING LASTSOLD PRICE (PROXY) ==========')

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://retail-pos-backend-production.up.railway.app'
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    
    console.log(`[PROXY] Forwarding to backend: ${backendUrl}/api/last-sold-prices/get?${queryString}`)

    // Forward the request to the backend
    const backendResponse = await fetch(`${backendUrl}/api/last-sold-prices/get?${queryString}`, {
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

    console.log(`[PROXY] Successfully retrieved LastSold price from backend`)

    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Failed to proxy LastSold price get request:', error)
    return NextResponse.json(
      { error: 'Failed to get LastSold price from backend' },
      { status: 500 }
    )
  }
}