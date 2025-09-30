import { NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function GET() {
  try {
    const zoho = await getZohoClient()
    const data = await zoho.makeRequest('GET', '/contacts', undefined, {
      contact_type: 'vendor'
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}
