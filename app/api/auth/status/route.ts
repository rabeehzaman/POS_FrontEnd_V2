import { NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function GET() {
  try {
    const zoho = await getZohoClient()
    const status = zoho.getAuthStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('Auth status check failed:', error)
    return NextResponse.json(
      {
        authenticated: false,
        hasRefreshToken: false,
        status: 'not_authenticated',
        message: 'Authentication check failed'
      },
      { status: 500 }
    )
  }
}