import { NextRequest, NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '200'

    const zoho = await getZohoClient()
    const data: any = await zoho.makeRequest('GET', '/items', undefined, {
      per_page: limit,
    })

    // Transform Zoho response to match frontend expectations
    if (data.items) {
      data.items = data.items.map((item: any) => ({
        ...item,
        price: item.rate || 0, // Map 'rate' to 'price'
        id: item.item_id || item.id,
        name: item.name || '',
        sku: item.sku || '',
        unit: item.unit || 'qty',
      }))
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    )
  }
}