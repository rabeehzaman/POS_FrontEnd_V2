'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Package, ChevronDown, ChevronUp, History, TrendingUp, TrendingDown, Calendar, Clock, Plus, Minus } from 'lucide-react'
import { Product, usePOSStore } from '@/lib/stores/pos-store'
import { UOMHandler } from '@/lib/uom-handler'
import { apiClient } from '@/lib/utils/api-client'
import { useMobile } from '@/hooks/use-mobile'

interface Transaction {
  date: string
  type: 'SALE' | 'PURCHASE'
  quantity: number
  amount: number
  party: string
  documentNumber: string
  branch: string
  itemStatus: 'active' | 'inactive'
}

interface ItemHistoryResponse {
  itemId: string
  itemName: string
  isGrouped: boolean
  relatedItems?: string[]
  salesTransactions: Transaction[]
  purchaseTransactions: Transaction[]
}

interface UnitSelectorDialogProps {
  product: Product
  open: boolean
  onClose: () => void
  onAddToCart: (product: Product, quantity: number, unit: string, customPrice?: number) => void
  taxMode: 'inclusive' | 'exclusive'
}

export function UnitSelectorDialog({ 
  product, 
  open, 
  onClose, 
  onAddToCart,
  taxMode
}: UnitSelectorDialogProps) {
  const [selectedUnit, setSelectedUnit] = useState<'pieces' | 'cartons'>('pieces')
  const [quantityInput, setQuantityInput] = useState('1')
  const [piecePriceInput, setPiecePriceInput] = useState('')
  const [cartonPriceInput, setCartonPriceInput] = useState('')
  
  // Main tab state
  const [activeMainTab, setActiveMainTab] = useState('addToCart')
  const [activeHistoryTab, setActiveHistoryTab] = useState('sales')
  
  // History data state
  const [historyData, setHistoryData] = useState<ItemHistoryResponse | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  
  // LastSold pricing state
  const [lastSoldPieces, setLastSoldPieces] = useState<{ price: number; timestamp: string } | null>(null)
  const [lastSoldCartons, setLastSoldCartons] = useState<{ price: number; timestamp: string } | null>(null)
  const [loadingLastSold, setLoadingLastSold] = useState(false)
  
  // Get store values
  const { selectedBranch, getLastSoldPrice, pricingStrategy } = usePOSStore()
  
  // Mobile detection
  const { shouldUseMobileLayout, isMobile, posHaptics } = useMobile()
  
  const quantityRef = useRef<HTMLInputElement>(null)
  const piecePriceRef = useRef<HTMLInputElement>(null)
  const cartonPriceRef = useRef<HTMLInputElement>(null)

  // Fetch full history data
  const fetchHistoryData = async () => {
    if (!product?.id) return
    
    setLoadingHistory(true)
    setHistoryError(null)
    
    try {
      const response = await apiClient.getItemHistory(product.id)
      if (!response.ok) {
        throw new Error('Failed to fetch history')
      }
      
      const data = await response.json()
      setHistoryData(data)
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoadingHistory(false)
    }
  }

  // Fetch LastSold prices
  const fetchLastSoldPrices = async () => {
    if (!product?.id || !selectedBranch?.id || pricingStrategy !== 'lastsold') return
    
    setLoadingLastSold(true)
    
    try {
      // Fetch pieces price
      const piecesResult = await getLastSoldPrice({
        itemId: product.id,
        unit: 'PCS',
        branchId: selectedBranch.id,
        taxMode: taxMode
      })
      
      if (piecesResult.found && piecesResult.price && piecesResult.timestamp) {
        setLastSoldPieces({
          price: piecesResult.price,
          timestamp: piecesResult.timestamp
        })
      } else {
        setLastSoldPieces(null)
      }
      
      // Fetch carton price if applicable
      if (product.hasConversion && product.piecesPerCarton && product.piecesPerCarton > 1) {
        const cartonUnit = product.storedUnit || 'CTN'
        const cartonResult = await getLastSoldPrice({
          itemId: product.id,
          unit: cartonUnit,
          branchId: selectedBranch.id,
          taxMode: taxMode
        })
        
        if (cartonResult.found && cartonResult.price && cartonResult.timestamp) {
          setLastSoldCartons({
            price: cartonResult.price,
            timestamp: cartonResult.timestamp
          })
        } else {
          setLastSoldCartons(null)
        }
      } else {
        setLastSoldCartons(null)
      }
      
    } catch (error) {
      console.error('Failed to fetch LastSold prices:', error)
    } finally {
      setLoadingLastSold(false)
    }
  }

  // Initialize prices when dialog opens
  useEffect(() => {
    if (open && product) {
      // First fetch LastSold prices
      fetchLastSoldPrices()
      
      // Set initial state
      setSelectedUnit('pieces')
      setQuantityInput('1')
      setActiveMainTab('addToCart')
      setActiveHistoryTab('sales')
    } else if (!open) {
      // Clear LastSold data when dialog closes
      setLastSoldPieces(null)
      setLastSoldCartons(null)
      setLoadingLastSold(false)
    }
  }, [open, product, taxMode, selectedBranch, pricingStrategy])

  // Update price inputs when LastSold prices are loaded
  useEffect(() => {
    if (open && product && !loadingLastSold) {
      // Use LastSold prices if strategy is enabled and available, otherwise fall back to default prices
      const useLastSoldPricing = pricingStrategy === 'lastsold'
      const basePiecePrice = (useLastSoldPricing && lastSoldPieces?.price) || product.piecePrice || product.price
      const baseCartonPrice = (useLastSoldPricing && lastSoldCartons?.price) || product.cartonPrice || (product.piecesPerCarton ? basePiecePrice * product.piecesPerCarton : basePiecePrice)
      
      // Only apply tax adjustment if LastSold price is not being used (since LastSold prices are already tax-adjusted)
      const shouldApplyTaxAdjustment = !useLastSoldPricing || (!lastSoldPieces && !lastSoldCartons)
      const adjustedPiecePrice = (useLastSoldPricing && lastSoldPieces?.price) || (shouldApplyTaxAdjustment && taxMode === 'inclusive' ? basePiecePrice * 1.15 : basePiecePrice)
      const adjustedCartonPrice = (useLastSoldPricing && lastSoldCartons?.price) || (shouldApplyTaxAdjustment && taxMode === 'inclusive' ? baseCartonPrice * 1.15 : baseCartonPrice)
      
      setPiecePriceInput(adjustedPiecePrice.toFixed(2))
      setCartonPriceInput(adjustedCartonPrice.toFixed(2))
    }
  }, [open, product, taxMode, lastSoldPieces, lastSoldCartons, loadingLastSold, pricingStrategy])

  // Handler for when History tab is selected
  const handleHistoryTabChange = (tab: string) => {
    setActiveMainTab(tab)
    if (tab === 'history' && !historyData && !loadingHistory) {
      fetchHistoryData()
    }
  }

  // Get unit information
  const unitInfo = product.storedUnit ? UOMHandler.parseUnitInfo(product.storedUnit) : null
  const hasUnitConversion = product.hasConversion && product.piecesPerCarton && product.piecesPerCarton > 1

  const handlePriceInputClick = (inputRef: React.RefObject<HTMLInputElement | null>) => {
    // Auto-select all text when clicking on price input
    if (inputRef.current) {
      inputRef.current.select()
    }
  }

  const handlePriceChange = (value: string, type: 'piece' | 'carton') => {
    // Only allow numeric input with decimals
    const numericValue = value.replace(/[^0-9.]/g, '')
    
    if (type === 'piece') {
      setPiecePriceInput(numericValue)
    } else {
      setCartonPriceInput(numericValue)
    }
  }

  const handleQuantityChange = (value: string) => {
    // Only allow positive integers
    const numericValue = value.replace(/[^0-9]/g, '')
    setQuantityInput(numericValue || '1')
  }

  const handleAddToCart = () => {
    const customPrice = selectedUnit === 'pieces' 
      ? parseFloat(piecePriceInput) 
      : parseFloat(cartonPriceInput)
    
    const quantity = parseInt(quantityInput) || 1
    const unit = selectedUnit === 'pieces' ? 'PCS' : (product.storedUnit || 'CTN')
    
    if (!isNaN(customPrice) && customPrice > 0 && quantity > 0) {
      // Add haptic feedback on mobile
      if (shouldUseMobileLayout) {
        posHaptics.addToCart()
      }
      onAddToCart(product, quantity, unit, customPrice)
      onClose()
    }
  }

  // Mobile quantity controls
  const incrementQuantity = () => {
    const currentQty = parseInt(quantityInput) || 1
    setQuantityInput((currentQty + 1).toString())
    if (shouldUseMobileLayout) {
      posHaptics.buttonPress()
    }
  }

  const decrementQuantity = () => {
    const currentQty = parseInt(quantityInput) || 1
    if (currentQty > 1) {
      setQuantityInput((currentQty - 1).toString())
      if (shouldUseMobileLayout) {
        posHaptics.buttonPress()
      }
    }
  }

  // Quick add 1 piece
  const handleQuickAdd = () => {
    const piecePrice = parseFloat(piecePriceInput)
    if (!isNaN(piecePrice) && piecePrice > 0) {
      if (shouldUseMobileLayout) {
        posHaptics.addToCart()
      }
      onAddToCart(product, 1, 'PCS', piecePrice)
      onClose()
    }
  }

  // Helper functions for transaction history
  const formatAmount = (amount: number) => {
    return `SAR ${amount.toLocaleString('en-SA', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  const formatUnitPrice = (amount: number, quantity: number) => {
    const unitPrice = amount / quantity
    return `SAR ${unitPrice.toLocaleString('en-SA', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const getTypeIcon = (type: 'SALE' | 'PURCHASE') => {
    return type === 'SALE' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-blue-600" />
    )
  }

  const getTypeColor = (type: 'SALE' | 'PURCHASE') => {
    return type === 'SALE' 
      ? 'bg-green-100 text-green-800 hover:bg-green-200' 
      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
  }

  const getStatusColor = (status: 'active' | 'inactive') => {
    return status === 'active' 
      ? 'bg-gray-100 text-gray-800' 
      : 'bg-orange-100 text-orange-800'
  }

  // Dialog now works for all products - no early return needed

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-md flex flex-col ${
        shouldUseMobileLayout 
          ? 'h-[85vh] max-h-[600px] w-[95vw] rounded-t-xl' 
          : 'h-[600px]'
      }`}>
        <DialogHeader className={shouldUseMobileLayout ? 'pb-2' : ''}>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {shouldUseMobileLayout ? 'Add to Cart' : 'Select Unit & Price'}
          </DialogTitle>
        </DialogHeader>

        {/* Product Name */}
        <div className="pb-4">
          <h4 className="font-medium text-sm mb-2">{product.name}</h4>
          <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
        </div>

        <Tabs value={activeMainTab} onValueChange={handleHistoryTabChange} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="addToCart" className="flex-1">Add to Cart</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
          </TabsList>

          <TabsContent value="addToCart" className="flex-1 min-h-0 space-y-6 overflow-y-auto">
            {/* Unit Selection */}
          <div className="space-y-4">
            {/* Unit Buttons */}
            <div className="flex gap-2">
              <Button
                variant={selectedUnit === 'pieces' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedUnit('pieces')
                  if (shouldUseMobileLayout) {
                    posHaptics.buttonPress()
                  }
                }}
                className={`flex-1 flex flex-col items-start gap-1 ${
                  shouldUseMobileLayout ? 'h-16 p-4' : 'h-auto p-3'
                }`}
              >
                <span className="font-medium">Pieces</span>
                <span className="text-xs opacity-80">Individual units</span>
              </Button>
              
              {hasUnitConversion && (
                <Button
                  variant={selectedUnit === 'cartons' ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedUnit('cartons')
                    if (shouldUseMobileLayout) {
                      posHaptics.buttonPress()
                    }
                  }}
                  className={`flex-1 flex flex-col items-start gap-1 ${
                    shouldUseMobileLayout ? 'h-16 p-4' : 'h-auto p-3'
                  }`}
                >
                  <span className="font-medium">Carton</span>
                  <span className="text-xs opacity-80">
                    {product.piecesPerCarton && `${product.piecesPerCarton} pieces`}
                  </span>
                </Button>
              )}
            </div>

            {/* Price Input for Selected Unit */}
            <div className="space-y-2">
              <div className="text-sm font-medium">
                {selectedUnit === 'pieces' ? 'Piece Price' : 'Carton Price'}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  ref={selectedUnit === 'pieces' ? piecePriceRef : cartonPriceRef}
                  value={selectedUnit === 'pieces' ? piecePriceInput : cartonPriceInput}
                  onChange={(e) => handlePriceChange(e.target.value, selectedUnit === 'pieces' ? 'piece' : 'carton')}
                  onClick={() => handlePriceInputClick(selectedUnit === 'pieces' ? piecePriceRef : cartonPriceRef)}
                  className="flex-1"
                  placeholder="0.00"
                />
                <span className="text-sm text-muted-foreground">SAR</span>
              </div>
              
              {/* LastSold Price Indicator */}
              {pricingStrategy === 'lastsold' && !loadingLastSold && (
                <div className="flex items-center gap-2">
                  {selectedUnit === 'pieces' && lastSoldPieces && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Last sold: SAR {lastSoldPieces.price.toFixed(2)}
                    </Badge>
                  )}
                  {selectedUnit === 'cartons' && lastSoldCartons && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Last sold: SAR {lastSoldCartons.price.toFixed(2)}
                    </Badge>
                  )}
                  {selectedUnit === 'pieces' && !lastSoldPieces && (
                    <span className="text-xs text-muted-foreground">No previous sale recorded</span>
                  )}
                  {selectedUnit === 'cartons' && !lastSoldCartons && (
                    <span className="text-xs text-muted-foreground">No previous sale recorded</span>
                  )}
                </div>
              )}
              
              {pricingStrategy === 'lastsold' && loadingLastSold && (
                <div className="flex items-center gap-2">
                  <div className="animate-pulse flex items-center">
                    <div className="h-3 w-3 bg-gray-200 rounded-full mr-1"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
              )}
              
              {pricingStrategy === 'default' && (
                <span className="text-xs text-muted-foreground">Using default pricing strategy</span>
              )}
            </div>
          </div>

          {/* Unit Conversion Info */}
          {unitInfo && (
            <div className="p-2 bg-muted/30 rounded-md">
              <p className="text-xs text-muted-foreground">
                📦 {unitInfo.display}
              </p>
            </div>
          )}

          {/* Quantity Input */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Quantity</div>
            {shouldUseMobileLayout ? (
              // Mobile: Increment/decrement buttons
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={decrementQuantity}
                  disabled={parseInt(quantityInput) <= 1}
                  className="h-12 w-12 rounded-full"
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <div className="flex-1 max-w-24">
                  <Input
                    ref={quantityRef}
                    value={quantityInput}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className="text-center text-lg font-semibold h-12"
                    placeholder="1"
                    min="1"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={incrementQuantity}
                  className="h-12 w-12 rounded-full"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              // Desktop: Regular input
              <Input
                ref={quantityRef}
                value={quantityInput}
                onChange={(e) => handleQuantityChange(e.target.value)}
                onClick={() => handlePriceInputClick(quantityRef)}
                className="text-center"
                placeholder="1"
                min="1"
              />
            )}
          </div>

          {/* Total Summary */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Quantity:</span>
              <span className="font-medium">{quantityInput} {selectedUnit === 'pieces' ? 'piece(s)' : 'carton(s)'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Unit Price:</span>
              <span className="font-medium">{(selectedUnit === 'pieces' ? piecePriceInput : cartonPriceInput)} SAR</span>
            </div>
            <div className="border-t border-border/50 pt-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total:</span>
                <span className="text-xl font-bold">
                  {((parseInt(quantityInput) || 1) * parseFloat(selectedUnit === 'pieces' ? piecePriceInput : cartonPriceInput) || 0).toFixed(2)} SAR
                </span>
              </div>
            </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 flex flex-col">
            {historyError ? (
              <div className="flex items-center justify-center p-8 text-center">
                <div className="text-red-600">
                  <Package className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Failed to load history</p>
                  <p className="text-sm text-muted-foreground">{historyError}</p>
                  <Button variant="outline" size="sm" onClick={fetchHistoryData} className="mt-2">
                    Try Again
                  </Button>
                </div>
              </div>
            ) : (
              <Tabs value={activeHistoryTab} onValueChange={setActiveHistoryTab} className="flex-1 min-h-0 flex flex-col">
                <TabsList className="w-fit mx-auto mb-4">
                  <TabsTrigger value="sales" disabled={!historyData || historyData.salesTransactions.length === 0}>
                    Sales ({historyData?.salesTransactions?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="purchases" disabled={!historyData || historyData.purchaseTransactions.length === 0}>
                    Purchases ({historyData?.purchaseTransactions?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="sales" className="flex-1 min-h-0">
                  <div className="h-full overflow-y-auto">
                    <TransactionsList 
                      transactions={historyData?.salesTransactions || []} 
                      historyData={historyData}
                      loading={loadingHistory}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="purchases" className="flex-1 min-h-0">
                  <div className="h-full overflow-y-auto">
                    <TransactionsList 
                      transactions={historyData?.purchaseTransactions || []} 
                      historyData={historyData}
                      loading={loadingHistory}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className={`gap-2 ${shouldUseMobileLayout ? 'flex-col space-y-2' : ''}`}>
          {shouldUseMobileLayout ? (
            // Mobile: Quick add button + regular controls
            <>
              <Button 
                onClick={handleQuickAdd}
                variant="secondary"
                disabled={!piecePriceInput || isNaN(parseFloat(piecePriceInput))}
                className="w-full h-12 text-base font-semibold"
              >
                Quick Add 1 PCS - {piecePriceInput ? `${parseFloat(piecePriceInput).toFixed(2)} SAR` : '0.00 SAR'}
              </Button>
              <div className="flex gap-2 w-full">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1 h-12 text-base"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddToCart}
                  disabled={
                    !quantityInput ||
                    !(selectedUnit === 'pieces' ? piecePriceInput : cartonPriceInput) ||
                    isNaN(parseFloat(selectedUnit === 'pieces' ? piecePriceInput : cartonPriceInput)) ||
                    isNaN(parseInt(quantityInput)) ||
                    parseInt(quantityInput) <= 0
                  }
                  className="flex-2 h-12 text-base font-semibold"
                >
                  Add {quantityInput} {selectedUnit === 'pieces' ? 'PCS' : 'CTN'} to Cart
                </Button>
              </div>
            </>
          ) : (
            // Desktop: Regular layout
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddToCart}
                disabled={
                  !quantityInput ||
                  !(selectedUnit === 'pieces' ? piecePriceInput : cartonPriceInput) ||
                  isNaN(parseFloat(selectedUnit === 'pieces' ? piecePriceInput : cartonPriceInput)) ||
                  isNaN(parseInt(quantityInput)) ||
                  parseInt(quantityInput) <= 0
                }
              >
                Add to Cart
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// TransactionsList component for displaying transaction history
function TransactionsList({ 
  transactions, 
  historyData, 
  loading 
}: { 
  transactions: Transaction[], 
  historyData: ItemHistoryResponse | null,
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="text-right space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center text-muted-foreground">
        <div>
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="font-medium">No transactions in this category</p>
        </div>
      </div>
    )
  }

  const formatAmount = (amount: number) => {
    return `SAR ${amount.toLocaleString('en-SA', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  const formatUnitPrice = (amount: number, quantity: number) => {
    const unitPrice = amount / quantity
    return `SAR ${unitPrice.toLocaleString('en-SA', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const getTypeIcon = (type: 'SALE' | 'PURCHASE') => {
    return type === 'SALE' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-blue-600" />
    )
  }

  const getTypeColor = (type: 'SALE' | 'PURCHASE') => {
    return type === 'SALE' 
      ? 'bg-green-100 text-green-800 hover:bg-green-200' 
      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
  }

  const getStatusColor = (status: 'active' | 'inactive') => {
    return status === 'active' 
      ? 'bg-gray-100 text-gray-800' 
      : 'bg-orange-100 text-orange-800'
  }

  return (
    <div className="divide-y">
      {transactions.map((transaction, index) => (
        <div
          key={index}
          className="flex items-center justify-between py-2 hover:bg-muted/30 transition-colors text-sm"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {getTypeIcon(transaction.type)}
              <span className={`text-xs font-medium ${
                transaction.type === 'SALE' ? 'text-green-700' : 'text-blue-700'
              }`}>
                {transaction.type}
              </span>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {formatDate(transaction.date)}
            </div>
            
            <div className="text-xs truncate max-w-[120px]" title={transaction.party}>
              {transaction.party}
            </div>
            
            <div className="text-xs text-muted-foreground">
              Qty: {transaction.quantity.toLocaleString()}
            </div>
            
            {historyData?.isGrouped && (
              <span className={`text-xs px-1 py-0.5 rounded ${
                transaction.itemStatus === 'active' ? 'bg-gray-100 text-gray-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {transaction.itemStatus}
              </span>
            )}
          </div>

          <div className="text-sm font-medium text-right">
            {formatUnitPrice(transaction.amount, transaction.quantity)}
          </div>
        </div>
      ))}
    </div>
  )
}