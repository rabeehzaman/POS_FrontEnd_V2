import { NextRequest, NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = params.id

    const zoho = await getZohoClient()

    // For now, return empty arrays to prevent errors
    // In a full implementation, you would fetch invoices and bills that contain this item
    const historyData = {
      salesTransactions: [],
      purchaseTransactions: [],
      itemId,
      message: 'Transaction history not yet implemented'
    }

    return NextResponse.json(historyData)
  } catch (error) {
    console.error('Failed to fetch item history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch item history' },
      { status: 500 }
    )
  }
}
