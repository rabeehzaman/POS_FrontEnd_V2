import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { ZOHO_CONFIG } from '@/lib/server/zoho/constants'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 })
  }

  try {
    // Exchange code for tokens
    const response = await axios.post(
      `${ZOHO_CONFIG.accountsUrl}/oauth/v2/token`,
      null,
      {
        params: {
          code,
          client_id: ZOHO_CONFIG.clientId,
          client_secret: ZOHO_CONFIG.clientSecret,
          redirect_uri: ZOHO_CONFIG.redirectUri,
          grant_type: 'authorization_code',
        },
      }
    )

    const tokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: Date.now() + response.data.expires_in * 1000,
      savedAt: new Date().toISOString(),
    }

    // Save tokens
    const zoho = await getZohoClient()
    await zoho.storage.saveTokens(tokens)

    // Redirect to frontend
    return NextResponse.redirect(new URL('/', request.url))
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.json({ error: 'Failed to exchange code for tokens' }, { status: 500 })
  }
}