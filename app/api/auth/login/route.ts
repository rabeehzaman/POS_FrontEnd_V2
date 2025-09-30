import { NextResponse } from 'next/server'
import { ZOHO_CONFIG } from '@/lib/server/zoho/constants'

export async function GET() {
  const authUrl = `${ZOHO_CONFIG.accountsUrl}/oauth/v2/auth?` +
    `response_type=code&` +
    `client_id=${ZOHO_CONFIG.clientId}&` +
    `scope=ZohoBooks.fullaccess.all&` +
    `redirect_uri=${encodeURIComponent(ZOHO_CONFIG.redirectUri)}&` +
    `access_type=offline&` +
    `prompt=consent`

  return NextResponse.redirect(authUrl)
}