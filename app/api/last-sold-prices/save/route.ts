import { NextRequest, NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemId, branchId, taxMode, price } = body

    const key = `${itemId}_${branchId || 'default'}_${taxMode || 'inclusive'}`

    const zoho = await getZohoClient()
    await zoho.storage.saveLastSoldPrice(key, {
      itemId,
      branchId,
      taxMode,
      price,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save last sold price:', error)
    return NextResponse.json(
      { error: 'Failed to save last sold price' },
      { status: 500 }
    )
  }
}