import { NextRequest, NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemIds, branchId, taxMode } = body

    if (!itemIds || !Array.isArray(itemIds)) {
      return NextResponse.json(
        { error: 'itemIds array is required' },
        { status: 400 }
      )
    }

    const zoho = await getZohoClient()
    const storage = zoho.storage
    const lastSoldPrices = await storage.getLastSoldPrices()

    const results: Record<string, any> = {}

    for (const itemId of itemIds) {
      const key = `${itemId}_${branchId || 'default'}_${taxMode || 'inclusive'}`
      if (lastSoldPrices[key]) {
        results[itemId] = lastSoldPrices[key]
      }
    }

    return NextResponse.json({ prices: results })
  } catch (error) {
    console.error('Failed to fetch bulk last sold prices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bulk last sold prices' },
      { status: 500 }
    )
  }
}