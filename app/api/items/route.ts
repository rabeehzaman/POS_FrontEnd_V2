import { NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function GET() {
  try {
    const zoho = await getZohoClient()

    // Fetch all items with pagination
    let allItems: any[] = []
    let page = 1
    let hasMore = true
    const perPage = 1000 // Zoho supports up to 1000 items per page

    while (hasMore) {
      const data: any = await zoho.makeRequest('GET', '/items', undefined, {
        per_page: perPage,
        page: page
      })

      if (data.items && data.items.length > 0) {
        allItems = allItems.concat(data.items)
        hasMore = data.page_context?.has_more_page || false
        page++
      } else {
        hasMore = false
      }
    }

    // Transform Zoho response to match frontend expectations
    const transformedItems = allItems.map((item: any) => ({
      ...item,
      price: item.rate || 0, // Map 'rate' to 'price'
      id: item.item_id || item.id,
      name: item.name || '',
      sku: item.sku || '',
      unit: item.unit || 'qty',
    }))

    return NextResponse.json({
      items: transformedItems,
      total: transformedItems.length
    })
  } catch (error) {
    console.error('Failed to fetch items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    )
  }
}