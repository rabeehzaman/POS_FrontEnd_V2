import { create } from 'zustand'
import { PrinterSettings, getPrinterSettings, savePrinterSettings } from '@/lib/utils/printer'

export interface Product {
  id: string
  name: string
  price: number
  stock: number
  sku: string
  group_name?: string
  tax_id?: string
  tax_percentage?: number
  storedUnit?: string
  // Unit conversion properties from backend
  piecePrice?: number
  cartonPrice?: number
  piecesPerCarton?: number
  hasConversion?: boolean
  defaultUnit?: string
}

export interface Customer {
  contact_id: string
  contact_name: string
  contact_persons?: {
    contact_person_id: string
    salutation: string
    first_name: string
    last_name: string
    email: string
    phone: string
  }[]
  email?: string
}

export interface CartItem {
  id: string
  name: string
  price: number
  qty: number
  unit: string
  storedUnit?: string
  tax_id?: string
  tax_percentage?: number
  customPrice?: number // For custom pricing from unit selector
  originalPrice?: number // Store the original calculated price
}

export interface AuthStatus {
  authenticated: boolean
  hasRefreshToken: boolean
  organizationId?: string
  tokenExpiresIn?: number
  tokenExpiresInHours?: number
  needsReauth?: boolean
  critical?: boolean
  status?: 'good' | 'warning' | 'critical' | 'not_authenticated'
  message?: string
  user?: {
    id: string
    name: string
    email: string
  }
}

interface POSState {
  // Auth
  authStatus: AuthStatus
  setAuthStatus: (status: AuthStatus) => void
  refreshAuthStatus: () => Promise<void>
  logout: () => Promise<void>
  checkAuthStatus: () => Promise<AuthStatus>

  // Products
  products: Product[]
  setProducts: (products: Product[]) => void

  // Customers
  customers: Customer[]
  selectedCustomer: string | null
  setCustomers: (customers: Customer[]) => void
  setSelectedCustomer: (customerId: string | null) => void

  // Cart
  cart: CartItem[]
  addToCart: (product: Product, quantity?: number, unit?: string, customPrice?: number) => void
  updateCartItem: (id: string, updates: Partial<CartItem>) => void
  removeFromCart: (id: string, unit: string) => void
  clearCart: () => void

  // Settings
  taxMode: 'inclusive' | 'exclusive'
  selectedBranch: { id: string; name: string } | null
  invoiceMode: 'draft' | 'sent'
  printerSettings: PrinterSettings
  pricingStrategy: 'default' | 'lastsold'
  setTaxMode: (mode: 'inclusive' | 'exclusive') => void
  setSelectedBranch: (branch: { id: string; name: string } | null) => void
  setInvoiceMode: (mode: 'draft' | 'sent') => void
  setPrinterSettings: (settings: Partial<PrinterSettings>) => void
  setPricingStrategy: (strategy: 'default' | 'lastsold') => void

  // UI State
  loading: boolean
  setLoading: (loading: boolean) => void
  syncStatus: string
  setSyncStatus: (status: string) => void

  // LastSold Pricing
  saveLastSoldPrice: (params: {
    itemId: string
    unit: string
    branchId: string
    taxMode: 'inclusive' | 'exclusive'
    price: number
    itemName?: string
    branchName?: string
  }) => Promise<void>
  getLastSoldPrice: (params: {
    itemId: string
    unit: string
    branchId: string
    taxMode: 'inclusive' | 'exclusive'
  }) => Promise<{ found: boolean; price?: number; timestamp?: string }>
  bulkGetLastSoldPrices: (params: {
    items: Array<{ itemId: string; unit: string }>
    branchId: string
    taxMode: 'inclusive' | 'exclusive'
  }) => Promise<Record<string, { price: number; timestamp: string }>>
}

export const usePOSStore = create<POSState>()((set, get) => ({
  // Auth
  authStatus: { authenticated: false, hasRefreshToken: false },
  setAuthStatus: (status) => set({ authStatus: status }),

  // Check authentication status from API
  checkAuthStatus: async () => {
    try {
      const response = await fetch('/api/auth/status')
      const authData = await response.json()
      
      if (response.ok) {
        set({ authStatus: authData })
        return authData
      } else {
        const defaultAuth = { 
          authenticated: false, 
          hasRefreshToken: false,
          status: 'not_authenticated' as const,
          message: 'Not authenticated'
        }
        set({ authStatus: defaultAuth })
        return defaultAuth
      }
    } catch (error) {
      console.error('Failed to check auth status:', error)
      const errorAuth = { 
        authenticated: false, 
        hasRefreshToken: false,
        status: 'not_authenticated' as const,
        message: 'Authentication check failed'
      }
      set({ authStatus: errorAuth })
      return errorAuth
    }
  },

  // Refresh authentication status
  refreshAuthStatus: async () => {
    const status = await get().checkAuthStatus()
    
    // Show sync status messages
    if (status.authenticated) {
      if (status.critical) {
        set({ syncStatus: '⚠️ Token expires soon - Re-authenticate immediately' })
      } else if (status.needsReauth) {
        set({ syncStatus: '⚠️ Token expires soon - Re-authenticate recommended' })
      } else {
        set({ syncStatus: `✅ Connected to Zoho Books (${status.tokenExpiresInHours?.toFixed(1)}h remaining)` })
      }
    } else {
      set({ syncStatus: '❌ Not connected to Zoho Books' })
    }
  },

  // Logout from Zoho Books
  logout: async () => {
    try {
      set({ loading: true, syncStatus: 'Logging out...' })
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      })
      
      if (response.ok) {
        set({ 
          authStatus: { 
            authenticated: false, 
            hasRefreshToken: false,
            status: 'not_authenticated',
            message: 'Logged out successfully'
          },
          syncStatus: '✅ Logged out successfully'
        })
        
        // Clear auth-dependent data
        set({ 
          products: [],
          customers: [],
          selectedCustomer: null 
        })
      } else {
        set({ syncStatus: '❌ Logout failed' })
      }
    } catch (error) {
      console.error('Logout error:', error)
      set({ syncStatus: '❌ Logout failed' })
    } finally {
      set({ loading: false })
    }
  },

  // Products
  products: [],
  setProducts: (products) => set({ products }),

  // Customers
  customers: [],
  selectedCustomer: null,
  setCustomers: (customers) => set({ customers }),
  setSelectedCustomer: (customerId) => set({ selectedCustomer: customerId }),

  // Cart
  cart: [],
  addToCart: (product, quantity = 1, unit = 'PCS', customPrice) => {
    const state = get()
    const existingItem = state.cart.find(
      item => item.id === product.id && item.unit === unit && 
      (customPrice ? item.customPrice === customPrice : !item.customPrice)
    )

    if (existingItem) {
      set({
        cart: state.cart.map(item =>
          item.id === product.id && item.unit === unit && 
          (customPrice ? item.customPrice === customPrice : !item.customPrice)
            ? { ...item, qty: item.qty + quantity }
            : item
        )
      })
    } else {
      // Calculate price based on unit and custom price
      let finalPrice = customPrice || product.price
      
      // If no custom price provided, calculate based on unit
      if (!customPrice) {
        if (unit === 'CTN' && product.cartonPrice) {
          finalPrice = product.cartonPrice
        } else if (unit === 'PCS' && product.piecePrice) {
          finalPrice = product.piecePrice
        } else {
          // Default to product.price
          finalPrice = product.price
        }
        
        // Apply tax adjustment if needed
        if (state.taxMode === 'inclusive') {
          finalPrice = finalPrice * 1.15
        }
      }

      const originalPrice = finalPrice // Store original calculated price

      set({
        cart: [...state.cart, {
          id: product.id,
          name: product.name,
          price: finalPrice,
          qty: quantity,
          unit,
          storedUnit: product.storedUnit || unit,
          tax_id: product.tax_id || '',
          tax_percentage: product.tax_percentage || 0,
          customPrice: customPrice,
          originalPrice: originalPrice,
        }]
      })

      // Save LastSold price if it's a custom price and strategy is enabled
      if (customPrice && state.selectedBranch?.id && state.pricingStrategy === 'lastsold') {
        get().saveLastSoldPrice({
          itemId: product.id,
          unit,
          branchId: state.selectedBranch.id,
          taxMode: state.taxMode,
          price: finalPrice,
          itemName: product.name,
          branchName: state.selectedBranch.name
        }).catch(error => {
          console.error('Failed to save LastSold price:', error)
        })
      }
    }
  },

  updateCartItem: (id, updates) => {
    const state = get()
    set({
      cart: state.cart.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    })
  },

  removeFromCart: (id, unit) => {
    const state = get()
    set({
      cart: state.cart.filter(item => !(item.id === id && item.unit === unit))
    })
  },

  clearCart: () => set({ cart: [], selectedCustomer: null }),

  // Settings
  taxMode: 'exclusive',
  selectedBranch: null,
  invoiceMode: 'sent',
  printerSettings: getPrinterSettings(),
  pricingStrategy: (typeof window !== 'undefined' && localStorage.getItem('pricingStrategy') as 'default' | 'lastsold') || 'default',
  setTaxMode: (mode) => set({ taxMode: mode }),
  setSelectedBranch: (branch) => set({ selectedBranch: branch }),
  setInvoiceMode: (mode) => set({ invoiceMode: mode }),
  setPrinterSettings: (settings) => {
    const current = get().printerSettings
    const updated = { ...current, ...settings }
    set({ printerSettings: updated })
    savePrinterSettings(settings)
  },
  setPricingStrategy: (strategy) => {
    set({ pricingStrategy: strategy })
    if (typeof window !== 'undefined') {
      localStorage.setItem('pricingStrategy', strategy)
    }
  },

  // UI State
  loading: false,
  setLoading: (loading) => set({ loading }),
  syncStatus: '',
  setSyncStatus: (status) => set({ syncStatus: status }),

  // LastSold Pricing Methods
  saveLastSoldPrice: async (params) => {
    try {
      const response = await fetch('/api/last-sold-prices/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save LastSold price')
      }

      console.log('LastSold price saved successfully:', data)
    } catch (error) {
      console.error('Error saving LastSold price:', error)
      throw error
    }
  },

  getLastSoldPrice: async (params) => {
    try {
      const { itemId, unit, branchId, taxMode } = params
      const queryParams = new URLSearchParams({
        itemId,
        unit,
        branchId,
        taxMode,
      })

      const response = await fetch(`/api/last-sold-prices/get?${queryParams}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get LastSold price')
      }

      return {
        found: data.found,
        price: data.price,
        timestamp: data.timestamp,
      }
    } catch (error) {
      console.error('Error getting LastSold price:', error)
      return { found: false }
    }
  },

  bulkGetLastSoldPrices: async (params) => {
    try {
      const response = await fetch('/api/last-sold-prices/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get bulk LastSold prices')
      }

      return data.prices || {}
    } catch (error) {
      console.error('Error getting bulk LastSold prices:', error)
      return {}
    }
  },
}))