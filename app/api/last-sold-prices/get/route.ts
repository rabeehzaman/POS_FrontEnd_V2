import { NextRequest, NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    const branchId = searchParams.get('branchId')
    const taxMode = searchParams.get('taxMode')

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
    }

    const key = `${itemId}_${branchId || 'default'}_${taxMode || 'inclusive'}`

    const zoho = await getZohoClient()
    const prices = await zoho.storage.getLastSoldPrices()
    const price = prices[key]

    if (price) {
      return NextResponse.json({ price })
    } else {
      return NextResponse.json({ price: null })
    }
  } catch (error) {
    console.error('Failed to get last sold price:', error)
    return NextResponse.json(
      { error: 'Failed to get last sold price' },
      { status: 500 }
    )
  }
}