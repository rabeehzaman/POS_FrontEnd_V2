'use client'

import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/header'
import { ProductGrid } from '@/components/pos/product-grid'
import { CartSidebar } from '@/components/pos/cart-sidebar'
import { Spotlight } from '@/components/spotlight/spotlight'
import { Product, Customer } from '@/lib/stores/pos-store'
import { useDebounce } from '@/lib/hooks/use-debounced-search'
import { 
  useProducts, 
  useCustomers, 
  useCartActions, 
  useDataActions,
  useCartSummary,
  useCustomerSelection,
  useLastSoldPricing
} from '@/lib/hooks/use-shallow-store'
import { toast } from 'sonner'

export function POSPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 200)
  const [isOnline, setIsOnline] = useState(true)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [lastSoldPrices, setLastSoldPrices] = useState<Record<string, number>>({})

  // Monitor online status
  useEffect(() => {
    setIsOnline(navigator.onLine)
    
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  // Use optimized selectors to prevent re-renders
  const products = useProducts()
  const customers = useCustomers()
  const { addToCart, clearCart } = useCartActions()
  const { setProducts, setCustomers } = useDataActions()
  const { setSelectedCustomer } = useCustomerSelection()
  const { cartCount } = useCartSummary()
  const { bulkGetLastSoldPrices, pricingStrategy, selectedBranch, taxMode } = useLastSoldPricing()

  // Fetch LastSold prices for all products
  const fetchLastSoldPrices = useCallback(async () => {
    if (pricingStrategy !== 'lastsold' || !selectedBranch?.id || products.length === 0) {
      setLastSoldPrices({})
      return
    }

    try {
      // Create items array for bulk fetch
      const items = products.map(product => ({
        itemId: product.id,
        unit: 'PCS' // Default unit for product card display
      }))

      const result = await bulkGetLastSoldPrices({
        items,
        branchId: selectedBranch.id,
        taxMode
      })

      // Convert result to simple price map
      // Backend returns keys in format: itemId_unit_branchId_taxMode
      const priceMap: Record<string, number> = {}
      Object.entries(result).forEach(([key, data]) => {
        if (data && data.price) {
          priceMap[key] = data.price
        }
      })

      setLastSoldPrices(priceMap)
    } catch (error) {
      console.error('Failed to fetch LastSold prices:', error)
      setLastSoldPrices({})
    }
  }, [pricingStrategy, selectedBranch, taxMode, products, bulkGetLastSoldPrices])

  // Simple data fetching without cached hooks to avoid infinite loops
  useEffect(() => {
    const fetchInitialData = async () => {
      if (products.length === 0) {
        setIsLoadingProducts(true)
        try {
          // Fetch products
          const productsResponse = await fetch('/api/items?limit=200')
          if (productsResponse.ok) {
            const productsData = await productsResponse.json()
            setProducts(productsData.items || [])
          }

          // Fetch customers
          const customersResponse = await fetch('/api/customers?limit=100')
          if (customersResponse.ok) {
            const customersData = await customersResponse.json()
            setCustomers(customersData.customers || [])
          }
        } catch (error) {
          console.error('Failed to fetch initial data:', error)
          toast.error('Failed to load data')
        } finally {
          setIsLoadingProducts(false)
        }
      }
    }

    fetchInitialData()
  }, [products.length, setProducts, setCustomers])

  // Fetch LastSold prices when products or pricing settings change
  useEffect(() => {
    if (products.length > 0) {
      fetchLastSoldPrices()
    }
  }, [products.length, pricingStrategy, selectedBranch, taxMode, fetchLastSoldPrices])

  const handleSpotlightAddToCart = useCallback((product: Product, quantity = 1, unit?: string, customPrice?: number) => {
    addToCart(product, quantity, unit, customPrice)
    toast.success(`Added ${product.name} to cart`)
  }, [addToCart])

  const handleSpotlightAction = useCallback((action: string, data?: unknown) => {
    switch (action) {
      case 'clear-cart':
        clearCart()
        toast.success('Cart cleared')
        break
      case 'new-invoice':
        toast.info('Invoice creation not implemented yet')
        break
      case 'switch-theme':
        // Theme switching is handled by the header
        break
      case 'calculation': {
        const calculationData = data as { result: number }
        toast.success(`Calculation result: ${calculationData.result}`)
        break
      }
      case 'select-customer': {
        const customerId = data as string
        const customer = customers.find(c => c.contact_id === customerId)
        if (customer) {
          setSelectedCustomer(customerId)
          toast.success(`Selected customer: ${customer.contact_name}`)
        }
        break
      }
      default:
        console.log('Unknown action:', action)
    }
  }, [clearCart, customers, setSelectedCustomer])

  const handleSpotlightNavigate = useCallback((path: string) => {
    window.location.href = path
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <Header 
        cartCount={cartCount} 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        syncStatus={isLoadingProducts ? 'syncing' : 'idle'}
        isOnline={isOnline}
      />
      
      <main className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-hidden">
          <ProductGrid 
            products={products}
            onAddToCart={handleSpotlightAddToCart}
            searchQuery={debouncedSearchQuery}
            isLoading={isLoadingProducts}
            lastSoldPrices={lastSoldPrices}
          />
        </div>
        
        <CartSidebar />
      </main>

      <Spotlight 
        products={products}
        customers={customers}
        onAddToCart={handleSpotlightAddToCart}
        onAction={handleSpotlightAction}
        onNavigate={handleSpotlightNavigate}
      />
    </div>
  )
}