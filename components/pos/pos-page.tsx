'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Header } from '@/components/header'
import { ProductGrid } from '@/components/pos/product-grid'
import { CartSidebar } from '@/components/pos/cart-sidebar'
import { FloatingCart } from '@/components/pos/floating-cart'
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
import { productsCache, customersCache, cacheManager } from '@/lib/database'

export function POSPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 200)
  const [isOnline, setIsOnline] = useState(true)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [lastSoldPrices, setLastSoldPrices] = useState<Record<string, number>>({})
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const pullStartY = useRef(0)
  const isPulling = useRef(false)
  const hasInitialized = useRef(false)

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

  // Cache-first data loading with smart refresh
  useEffect(() => {
    // Skip if already initialized
    if (hasInitialized.current) return

    const CACHE_MAX_AGE = 60 * 60 * 1000 // 1 hour in milliseconds
    let isMounted = true

    const loadDataFromCache = async () => {
      try {
        console.log('📂 Attempting to load from cache...')

        // Add timeout to cache operations
        const cachePromise = Promise.all([
          productsCache.getAll(),
          customersCache.getAll(),
          productsCache.getMetadata('products')
        ])

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Cache timeout')), 3000)
        )

        const [cachedProducts, cachedCustomers, productsMetadata] = await Promise.race([
          cachePromise,
          timeoutPromise
        ]) as any

        console.log('📊 Cache results:', {
          products: cachedProducts.length,
          customers: cachedCustomers.length,
          metadata: productsMetadata
        })

        if (!isMounted) return { hasCache: false, cacheAge: Infinity }

        if (cachedProducts.length > 0) {
          setProducts(cachedProducts)
          console.log('✅ Loaded products from cache:', cachedProducts.length)
        }

        if (cachedCustomers.length > 0) {
          setCustomers(cachedCustomers)
          console.log('✅ Loaded customers from cache:', cachedCustomers.length)
        }

        if (productsMetadata?.lastSync) {
          setLastSyncTime(productsMetadata.lastSync as number)
        }

        return {
          hasCache: cachedProducts.length > 0 || cachedCustomers.length > 0,
          cacheAge: productsMetadata?.lastSync
            ? Date.now() - (productsMetadata.lastSync as number)
            : Infinity
        }
      } catch (error) {
        console.error('❌ Failed to load from cache:', error)
        return { hasCache: false, cacheAge: Infinity }
      }
    }

    const fetchFromAPI = async (showLoading = true) => {
      if (showLoading) setIsLoadingProducts(true)

      try {
        console.log('🌐 Fetching data from API...')
        // Fetch fresh data from API
        const [productsResponse, customersResponse] = await Promise.all([
          fetch('/api/items'),
          fetch('/api/customers')
        ])

        if (!isMounted) return

        if (productsResponse.ok) {
          const productsData = await productsResponse.json()
          const fetchedProducts = productsData.items || []

          setProducts(fetchedProducts)

          // Save to cache
          await productsCache.set(fetchedProducts)
          console.log('✅ Updated products cache:', fetchedProducts.length)
        }

        if (customersResponse.ok) {
          const customersData = await customersResponse.json()
          const fetchedCustomers = customersData.customers || []

          setCustomers(fetchedCustomers)

          // Save to cache
          await customersCache.set(fetchedCustomers)
          console.log('✅ Updated customers cache:', fetchedCustomers.length)
        }

        // Update last sync time
        const now = Date.now()
        setLastSyncTime(now)

        if (!showLoading) {
          toast.success('Data refreshed')
        }
      } catch (error) {
        console.error('❌ Failed to fetch from API:', error)
        if (showLoading) {
          toast.error('Failed to load data. Using cached version.')
        }
      } finally {
        if (showLoading) setIsLoadingProducts(false)
      }
    }

    const initializeData = async () => {
      try {
        console.log('🚀 Initializing data...')

        // Step 1: Load from cache immediately
        const cacheResult = await loadDataFromCache()
        console.log('🔍 Cache result:', cacheResult)

        const { hasCache, cacheAge } = cacheResult

        console.log('✔️ isMounted:', isMounted, 'hasCache:', hasCache, 'cacheAge:', cacheAge)

        if (!isMounted) {
          console.log('⛔ Component unmounted, aborting')
          return
        }

        // Step 2: Decide whether to fetch from API
        if (!hasCache) {
          // No cache - fetch immediately with loading spinner
          console.log('📦 No cache found, fetching from API...')
          await fetchFromAPI(true)
        } else if (cacheAge > CACHE_MAX_AGE) {
          // Cache is stale - fetch in background without loading spinner
          console.log('⏰ Cache is stale, refreshing in background...')
          await fetchFromAPI(false)
        } else {
          // Cache is fresh - use it
          console.log('✨ Using fresh cache')
          setIsLoadingProducts(false)
        }

        console.log('🏁 Initialization complete')
      } catch (error) {
        console.error('💥 Fatal error during initialization:', error)
        // Fallback: just fetch from API
        await fetchFromAPI(true)
      }
    }

    // Mark as initialized and run
    hasInitialized.current = true
    initializeData()

    return () => {
      isMounted = false
      // Reset on unmount so it can re-initialize on remount (React Strict Mode)
      hasInitialized.current = false
    }
  }, [])

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

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    if (isRefreshing || isLoadingProducts) return

    setIsRefreshing(true)
    try {
      // Force fetch from API
      const [productsResponse, customersResponse] = await Promise.all([
        fetch('/api/items'),
        fetch('/api/customers')
      ])

      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        const fetchedProducts = productsData.items || []
        setProducts(fetchedProducts)
        await productsCache.set(fetchedProducts)
      }

      if (customersResponse.ok) {
        const customersData = await customersResponse.json()
        const fetchedCustomers = customersData.customers || []
        setCustomers(fetchedCustomers)
        await customersCache.set(fetchedCustomers)
      }

      const now = Date.now()
      setLastSyncTime(now)
      toast.success('Data refreshed successfully')
    } catch (error) {
      console.error('Failed to refresh:', error)
      toast.error('Failed to refresh data')
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing, isLoadingProducts, setProducts, setCustomers])

  // Pull-to-refresh gesture detection (mobile)
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      const scrollableParent = target.closest('[data-scrollable]')

      if (scrollableParent && scrollableParent.scrollTop === 0) {
        pullStartY.current = e.touches[0].clientY
        isPulling.current = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return

      const currentY = e.touches[0].clientY
      const pullDistance = currentY - pullStartY.current

      // If pulled down more than 80px, trigger refresh
      if (pullDistance > 80) {
        isPulling.current = false
        handleRefresh()
      }
    }

    const handleTouchEnd = () => {
      isPulling.current = false
    }

    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleRefresh])

  return (
    <div className="flex flex-col h-screen">
      <Header
        cartCount={cartCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        syncStatus={isLoadingProducts || isRefreshing ? 'syncing' : 'idle'}
        isOnline={isOnline}
        lastSyncTime={lastSyncTime}
        onRefresh={handleRefresh}
      />

      <main className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-hidden" data-scrollable>
          {/* Refresh indicator */}
          {isRefreshing && (
            <div className="absolute top-16 left-0 right-0 z-50 flex justify-center">
              <div className="bg-background border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground"></div>
                <span className="text-sm font-medium">Refreshing...</span>
              </div>
            </div>
          )}

          <ProductGrid
            products={products}
            onAddToCart={handleSpotlightAddToCart}
            searchQuery={debouncedSearchQuery}
            isLoading={isLoadingProducts}
            lastSoldPrices={lastSoldPrices}
          />
        </div>

        {/* Desktop: Fixed sidebar */}
        <div className="hidden md:flex">
          <CartSidebar />
        </div>
      </main>

      {/* Mobile: Floating cart button */}
      <div className="md:hidden">
        <FloatingCart />
      </div>

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