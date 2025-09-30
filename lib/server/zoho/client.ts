import axios, { AxiosError } from 'axios'
import { ZohoTokens, ZohoAuthResponse } from './types'
import { ZOHO_CONFIG, TOKEN_REFRESH_THRESHOLD } from './constants'
import { StorageProvider } from '../storage'

export class ZohoAPIClient {
  private tokens: ZohoTokens | null = null
  public storage: StorageProvider

  constructor(storage: StorageProvider) {
    this.storage = storage
  }

  async initialize() {
    // Load tokens from storage
    this.tokens = await this.storage.getTokens()

    // Load from env if not in storage
    if (!this.tokens && process.env.ZOHO_ACCESS_TOKEN) {
      this.tokens = {
        accessToken: process.env.ZOHO_ACCESS_TOKEN,
        refreshToken: process.env.ZOHO_REFRESH_TOKEN!,
        expiresAt: parseInt(process.env.ZOHO_TOKEN_EXPIRES_AT || '0'),
      }
      await this.storage.saveTokens(this.tokens)
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.tokens?.refreshToken) {
      console.error('No refresh token available')
      return false
    }

    try {
      const response = await axios.post<ZohoAuthResponse>(
        `${ZOHO_CONFIG.accountsUrl}/oauth/v2/token`,
        null,
        {
          params: {
            refresh_token: this.tokens.refreshToken,
            client_id: ZOHO_CONFIG.clientId,
            client_secret: ZOHO_CONFIG.clientSecret,
            grant_type: 'refresh_token',
          },
        }
      )

      this.tokens = {
        accessToken: response.data.access_token,
        refreshToken: this.tokens.refreshToken, // Keep existing refresh token
        expiresAt: Date.now() + response.data.expires_in * 1000,
        savedAt: new Date().toISOString(),
      }

      await this.storage.saveTokens(this.tokens)
      console.log('✅ Token refreshed successfully')
      return true
    } catch (error) {
      console.error('❌ Token refresh failed:', error)
      return false
    }
  }

  private async ensureValidToken(): Promise<boolean> {
    if (!this.tokens) {
      await this.initialize()
      if (!this.tokens) return false
    }

    // Check if token is expired or about to expire
    const timeUntilExpiry = this.tokens.expiresAt - Date.now()
    if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD) {
      return await this.refreshAccessToken()
    }

    return true
  }

  async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    const isValid = await this.ensureValidToken()
    if (!isValid) {
      throw new Error('Failed to obtain valid access token')
    }

    try {
      const response = await axios.request<T>({
        method,
        url: `${ZOHO_CONFIG.booksApiUrl}${endpoint}`,
        headers: {
          Authorization: `Zoho-oauthtoken ${this.tokens!.accessToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          organization_id: ZOHO_CONFIG.organizationId,
          ...params,
        },
        data,
      })

      return response.data
    } catch (error) {
      const axiosError = error as AxiosError
      if (axiosError.response?.status === 401) {
        // Token invalid, try refresh once
        const refreshed = await this.refreshAccessToken()
        if (refreshed) {
          // Retry request
          return this.makeRequest(method, endpoint, data, params)
        }
      }
      throw error
    }
  }

  getAuthStatus() {
    if (!this.tokens) {
      return {
        authenticated: false,
        hasRefreshToken: false,
        status: 'not_authenticated',
        message: 'Not authenticated',
      }
    }

    const timeUntilExpiry = this.tokens.expiresAt - Date.now()
    const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60)

    return {
      authenticated: true,
      hasRefreshToken: !!this.tokens.refreshToken,
      tokenExpiresIn: Math.floor(timeUntilExpiry / 1000),
      tokenExpiresInHours: hoursUntilExpiry,
      needsReauth: hoursUntilExpiry < 24,
      critical: hoursUntilExpiry < 1,
      status: hoursUntilExpiry < 1 ? 'critical' : hoursUntilExpiry < 24 ? 'warning' : 'good',
      message: `Token expires in ${hoursUntilExpiry.toFixed(1)} hours`,
    }
  }

  async logout() {
    this.tokens = null
    await this.storage.clearTokens()
  }
}