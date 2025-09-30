export interface ZohoTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  savedAt?: string
}

export interface ZohoAuthResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  api_domain: string
  token_type: string
}

export interface ZohoAPIConfig {
  accountsUrl: string
  booksApiUrl: string
  inventoryApiUrl: string
  clientId: string
  clientSecret: string
  redirectUri: string
  organizationId: string
}