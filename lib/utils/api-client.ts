import { Capacitor } from '@capacitor/core'

const isMobile = Capacitor.isNativePlatform()
const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://retail-pos-backend-production.up.railway.app'

// Debug logging for initial setup
console.log(`[ApiClient] Platform: ${isMobile ? 'Mobile (Capacitor)' : 'Web'}`)
console.log(`[ApiClient] Backend URL: ${backendUrl}`)
console.log(`[ApiClient] User Agent: ${navigator.userAgent}`)

export class ApiClient {
  private static getBaseUrl(): string {
    if (isMobile) {
      // On mobile, use direct backend URL
      return backendUrl
    } else {
      // On web, use relative URLs (Next.js API routes)
      return ''
    }
  }

  private static getFullUrl(endpoint: string): string {
    const baseUrl = this.getBaseUrl()
    
    if (isMobile) {
      // For mobile, construct full backend API URL
      // Keep /api prefix - backend DOES use it!
      return `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
    } else {
      // For web, use the endpoint as-is (Next.js API routes)
      return endpoint
    }
  }

  private static async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (isMobile) {
      // For mobile, we need to handle authentication
      // For now, we'll assume the backend handles auth via session/cookies
      // In production, you might need to store and pass auth tokens
      try {
        // Try to get auth token from local storage or secure storage
        const token = localStorage.getItem('auth_token')
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
      } catch (error) {
        console.warn('Could not access auth token:', error)
      }
    }

    return headers
  }

  static async get(endpoint: string, options?: RequestInit): Promise<Response> {
    const url = this.getFullUrl(endpoint)
    const headers = await this.getAuthHeaders()
    
    console.log(`[ApiClient] GET ${isMobile ? '(mobile)' : '(web)'}: ${url}`)
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...headers,
          ...options?.headers,
        },
        ...options,
      })
      
      if (!response.ok) {
        console.error(`[ApiClient] GET ${url} failed with status ${response.status}: ${response.statusText}`)
        try {
          const errorBody = await response.text()
          console.error(`[ApiClient] Error response body:`, errorBody)
        } catch (e) {
          console.error(`[ApiClient] Could not read error response body:`, e)
        }
      }
      
      return response
    } catch (error) {
      console.error(`[ApiClient] Network error during GET ${url}:`, error)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error(`[ApiClient] This is likely a network connectivity or CORS issue`)
      }
      throw error
    }
  }

  static async post(endpoint: string, data?: any, options?: RequestInit): Promise<Response> {
    const url = this.getFullUrl(endpoint)
    const headers = await this.getAuthHeaders()
    
    console.log(`[ApiClient] POST ${isMobile ? '(mobile)' : '(web)'}: ${url}`)
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          ...options?.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      })
      
      if (!response.ok) {
        console.error(`[ApiClient] POST ${url} failed with status ${response.status}: ${response.statusText}`)
        try {
          const errorBody = await response.text()
          console.error(`[ApiClient] Error response body:`, errorBody)
        } catch (e) {
          console.error(`[ApiClient] Could not read error response body:`, e)
        }
      }
      
      return response
    } catch (error) {
      console.error(`[ApiClient] Network error during POST ${url}:`, error)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error(`[ApiClient] This is likely a network connectivity or CORS issue`)
      }
      throw error
    }
  }

  static async put(endpoint: string, data?: any, options?: RequestInit): Promise<Response> {
    const url = this.getFullUrl(endpoint)
    const headers = await this.getAuthHeaders()
    
    console.log(`[ApiClient] PUT ${isMobile ? '(mobile)' : '(web)'}: ${url}`)
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          ...headers,
          ...options?.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      })
      
      if (!response.ok) {
        console.error(`[ApiClient] PUT ${url} failed with status ${response.status}: ${response.statusText}`)
        try {
          const errorBody = await response.text()
          console.error(`[ApiClient] Error response body:`, errorBody)
        } catch (e) {
          console.error(`[ApiClient] Could not read error response body:`, e)
        }
      }
      
      return response
    } catch (error) {
      console.error(`[ApiClient] Network error during PUT ${url}:`, error)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error(`[ApiClient] This is likely a network connectivity or CORS issue`)
      }
      throw error
    }
  }

  static async delete(endpoint: string, options?: RequestInit): Promise<Response> {
    const url = this.getFullUrl(endpoint)
    const headers = await this.getAuthHeaders()
    
    console.log(`[ApiClient] DELETE ${isMobile ? '(mobile)' : '(web)'}: ${url}`)
    
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          ...headers,
          ...options?.headers,
        },
        ...options,
      })
      
      if (!response.ok) {
        console.error(`[ApiClient] DELETE ${url} failed with status ${response.status}: ${response.statusText}`)
        try {
          const errorBody = await response.text()
          console.error(`[ApiClient] Error response body:`, errorBody)
        } catch (e) {
          console.error(`[ApiClient] Could not read error response body:`, e)
        }
      }
      
      return response
    } catch (error) {
      console.error(`[ApiClient] Network error during DELETE ${url}:`, error)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error(`[ApiClient] This is likely a network connectivity or CORS issue`)
      }
      throw error
    }
  }
}

// Convenience methods for common API calls
export const apiClient = {
  // Items
  getItems: (limit = 200) => ApiClient.get(`/api/items?limit=${limit}`),
  getItemHistory: (itemId: string) => ApiClient.get(`/api/items/${itemId}/history`),
  
  // Customers
  getCustomers: (limit = 100) => ApiClient.get(`/api/customers?limit=${limit}`),
  
  // Branches
  getBranches: () => ApiClient.get('/api/branches'),
  
  // Invoices
  createInvoice: (invoiceData: any) => ApiClient.post('/api/invoices', invoiceData),
  getInvoices: () => ApiClient.get('/api/invoices'),
  downloadInvoice: (invoiceId: string) => ApiClient.get(`/api/invoices/${invoiceId}/download`),
  
  // LastSold Prices
  getLastSoldStats: () => ApiClient.get('/api/last-sold-prices/stats'),
  getLastSoldPrices: (params: any) => {
    const queryParams = new URLSearchParams({
      itemId: params.itemId,
      unit: params.unit,
      branchId: params.branchId,
      taxMode: params.taxMode,
    }).toString()
    return ApiClient.get(`/api/last-sold-prices/get?${queryParams}`)
  },
  bulkGetLastSoldPrices: (params: any) => ApiClient.post('/api/last-sold-prices/bulk', params),
  saveLastSoldPrice: (params: any) => ApiClient.post('/api/last-sold-prices/save', params),
  clearLastSoldPrices: (params: any) => ApiClient.post('/api/last-sold-prices/clear', params),
  
  // Auth
  login: (credentials: any) => ApiClient.post('/api/auth/login', credentials),
  logout: () => ApiClient.post('/api/auth/logout'),
  getAuthStatus: () => ApiClient.get('/api/auth/status'),
}