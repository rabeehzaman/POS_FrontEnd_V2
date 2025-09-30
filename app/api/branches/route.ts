import { NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function GET() {
  try {
    const zoho = await getZohoClient()
    const data: any = await zoho.makeRequest('GET', '/branches')

    // Transform Zoho response to match frontend expectations
    return NextResponse.json({
      success: data.code === 0,
      branches: data.branches || [],
      message: data.message
    })
  } catch (error) {
    console.error('Failed to fetch branches:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch branches' },
      { status: 500 }
    )
  }
}