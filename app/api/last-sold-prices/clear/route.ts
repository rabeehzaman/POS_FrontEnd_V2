import { NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function DELETE() {
  try {
    const zoho = await getZohoClient()
    await zoho.storage.clearLastSoldPrices()

    return NextResponse.json({ success: true, message: 'All last sold prices cleared' })
  } catch (error) {
    console.error('Failed to clear last sold prices:', error)
    return NextResponse.json(
      { error: 'Failed to clear last sold prices' },
      { status: 500 }
    )
  }
}