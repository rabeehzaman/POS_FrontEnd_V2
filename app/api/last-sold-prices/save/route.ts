import { NextRequest, NextResponse } from 'next/server'

// For static export compatibility (mobile builds)
export const dynamic = 'force-static'
export const revalidate = false


export async function POST(request: NextRequest) {
  console.log('\n========== SAVING LASTSOLD PRICE (PROXY) ==========')

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://retail-pos-backend-production.up.railway.app'
    
    // Get request body
    const body = await request.json()
    
    console.log(`[PROXY] Forwarding to backend: ${backendUrl}/api/last-sold-prices/save`)

    // Forward the request to the backend
    const backendResponse = await fetch(`${backendUrl}/api/last-sold-prices/save`, {
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

    console.log(`[PROXY] Successfully saved LastSold price to backend`)

    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Failed to proxy LastSold price save request:', error)
    return NextResponse.json(
      { error: 'Failed to save LastSold price to backend' },
      { status: 500 }
    )
  }
}