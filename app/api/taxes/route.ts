import { NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function GET() {
  try {
    const zoho = await getZohoClient()
    const data = await zoho.makeRequest('GET', '/settings/taxes')

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch taxes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch taxes' },
      { status: 500 }
    )
  }
}
