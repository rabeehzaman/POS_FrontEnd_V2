import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  console.log('\n========== CLEARING LASTSOLD PRICES (PROXY) ==========')

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://retail-pos-backend-production.up.railway.app'
    
    // Get request body
    const body = await request.json()
    
    console.log(`[PROXY] Forwarding to backend: ${backendUrl}/api/last-sold-prices/clear`)

    // Forward the request to the backend
    const backendResponse = await fetch(`${backendUrl}/api/last-sold-prices/clear`, {
      method: 'DELETE',
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

    console.log(`[PROXY] Successfully cleared LastSold prices from backend`)

    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Failed to proxy LastSold prices clear request:', error)
    return NextResponse.json(
      { error: 'Failed to clear LastSold prices from backend' },
      { status: 500 }
    )
  }
}