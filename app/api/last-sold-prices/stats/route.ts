import { NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function GET() {
  try {
    const zoho = await getZohoClient()
    const prices = await zoho.storage.getLastSoldPrices()

    const stats = {
      totalEntries: Object.keys(prices).length,
      byBranch: {} as Record<string, number>,
      byTaxMode: {} as Record<string, number>,
    }

    Object.keys(prices).forEach(key => {
      const parts = key.split('_')
      const branchId = parts[1] || 'default'
      const taxMode = parts[2] || 'inclusive'

      stats.byBranch[branchId] = (stats.byBranch[branchId] || 0) + 1
      stats.byTaxMode[taxMode] = (stats.byTaxMode[taxMode] || 0) + 1
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to get last sold price stats:', error)
    return NextResponse.json(
      { error: 'Failed to get last sold price stats' },
      { status: 500 }
    )
  }
}