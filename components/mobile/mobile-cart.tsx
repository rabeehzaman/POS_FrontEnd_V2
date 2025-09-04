'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { 
  ShoppingCart, 
  Minus, 
  Plus, 
  Trash2, 
  CreditCard,
  User,
  Printer,
  Download,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/utils/api-client'
import { downloadInvoice, downloadAndPrintInvoice } from '@/lib/utils/invoice-download'
import { 
  useCart, 
  useCartActions, 
  useCustomers, 
  useSettings, 
  useSettingsActions,
  useCustomerSelection, 
  useCartSummary 
} from '@/lib/hooks/use-shallow-store'
import { useMobile } from '@/hooks/use-mobile'

const TAX_RATE = 0.15

interface LastInvoice {
  invoice_id: string
  invoice_number: string
  total: string | number
  status: string
  isDraft: boolean
}

interface MobileCartProps {
  onClose?: () => void
}

export const MobileCart: React.FC<MobileCartProps> = ({ onClose }) => {
  const [customerSearch, setCustomerSearch] = useState('')
  const [lastInvoice, setLastInvoice] = useState<LastInvoice | null>(null)
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  
  const { posHaptics, shouldUseMobileLayout } = useMobile()
  
  // Use optimized selectors
  const cart = useCart()
  const { updateCartItem, removeFromCart, clearCart } = useCartActions()
  const { taxMode, invoiceMode, selectedBranch } = useSettings()
  const { setInvoiceMode } = useSettingsActions()
  const customers = useCustomers()
  const { selectedCustomer, setSelectedCustomer } = useCustomerSelection()
  const { cartCount, subtotal, tax, total } = useCartSummary()

  const filteredCustomers = useMemo(() => 
    customers.filter(customer =>
      customer.contact_name.toLowerCase().includes(customerSearch.toLowerCase())
    ).slice(0, 5), 
    [customers, customerSearch]
  )

  const handleUpdateQuantity = useCallback((id: string, unit: string, delta: number) => {
    const item = cart.find(i => i.id === id && i.unit === unit)
    if (item) {
      const newQty = Math.max(1, item.qty + delta)
      updateCartItem(id, { qty: newQty })
      posHaptics.buttonPress()
    }
  }, [cart, updateCartItem, posHaptics])

  const handleRemoveItem = useCallback((id: string, unit: string) => {
    removeFromCart(id, unit)
    posHaptics.removeFromCart()
    toast.success('Item removed from cart', { position: 'bottom-center' })
  }, [removeFromCart, posHaptics])

  const handleClearCart = useCallback(() => {
    clearCart()
    setLastInvoice(null)
    posHaptics.buttonPress()
    toast.success('Cart cleared', { position: 'bottom-center' })
  }, [clearCart, posHaptics])

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomer(customerId)
    setCustomerSearch('')
    setShowCustomerSearch(false)
    posHaptics.buttonPress()
    const customer = customers.find(c => c.contact_id === customerId)
    if (customer) {
      toast.success(`Selected: ${customer.contact_name}`, { position: 'bottom-center' })
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    
    if (!selectedCustomer) {
      toast.error('Please select a customer first', { position: 'bottom-center' })
      return
    }

    try {
      const lineItems = cart.map(item => ({
        item_id: item.id,
        quantity: item.qty,
        rate: item.price,
        unit: item.unit,
        tax_id: item.tax_id || '',
      }))

      const templateData = selectedBranch?.name === "Main Branch" 
        ? {
            template_id: "9465000000093250",
            template_name: "MASTER",
            template_type: "custom"
          }
        : {}

      const invoiceData = {
        customer_id: selectedCustomer,
        line_items: lineItems,
        is_inclusive_tax: taxMode === 'inclusive',
        branch_id: selectedBranch?.id || null,
        mark_as_sent: invoiceMode === 'sent',
        ...templateData
      }

      const response = await apiClient.createInvoice(invoiceData)

      const result = await response.json()

      if (result.success) {
        const statusMessage = invoiceMode === 'sent' 
          ? `Invoice ${result.invoice.invoice_number} sent successfully!`
          : `Draft invoice ${result.invoice.invoice_number} created successfully!`
        
        posHaptics.completeSale()
        toast.success(statusMessage, { position: 'bottom-center' })
        
        setLastInvoice({
          invoice_id: result.invoice.invoice_id,
          invoice_number: result.invoice.invoice_number,
          total: result.invoice.total,
          status: result.invoice.status,
          isDraft: invoiceMode === 'draft'
        })
        
        // Auto-download and print
        setTimeout(() => {
          downloadAndPrintInvoice({
            invoiceId: result.invoice.invoice_id,
            invoiceNumber: result.invoice.invoice_number,
            isDraft: invoiceMode === 'draft',
            autoPrint: true,
            skipDownload: false
          })
        }, 2000)
        
        clearCart()
        setSelectedCustomer(null)
      } else {
        posHaptics.error()
        toast.error('Failed to create invoice', { position: 'bottom-center' })
      }
    } catch (error) {
      console.error('Checkout error:', error)
      posHaptics.error()
      toast.error('Failed to create invoice', { position: 'bottom-center' })
    }
  }

  const selectedCustomerData = customers.find(c => c.contact_id === selectedCustomer)

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <h2 className="font-semibold">Cart</h2>
          {cartCount > 0 && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full">
              {cartCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearCart}
              className="text-xs h-8"
            >
              Clear
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Customer Section */}
      <div className="p-4 border-b border-border/30 bg-muted/20">
        {selectedCustomerData ? (
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">{selectedCustomerData.contact_name}</p>
                <p className="text-xs text-muted-foreground">Selected Customer</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedCustomer(null)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button 
              variant="outline" 
              onClick={() => setShowCustomerSearch(!showCustomerSearch)}
              className="w-full justify-start"
            >
              <User className="h-4 w-4 mr-2" />
              Select Customer
            </Button>
            
            {showCustomerSearch && (
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="text-sm"
                  autoFocus
                />
                
                {customerSearch && filteredCustomers.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto border rounded-lg bg-background">
                    {filteredCustomers.map(customer => (
                      <button
                        key={customer.contact_id}
                        onClick={() => handleSelectCustomer(customer.contact_id)}
                        className="w-full text-left p-2 hover:bg-muted/50 transition-colors text-sm first:rounded-t-lg last:rounded-b-lg"
                      >
                        {customer.contact_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-auto px-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Cart is empty</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Add items to get started</p>
          </div>
        ) : (
          <div className="py-4 space-y-3">
            {cart.map((item) => (
              <div key={`${item.id}-${item.unit}`} className="p-3 bg-muted/20 rounded-lg">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2 leading-tight">
                      {item.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.price.toFixed(2)} per {item.unit}
                    </p>
                  </div>
                  <div className="text-sm font-semibold">
                    {(item.price * item.qty).toFixed(2)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateQuantity(item.id, item.unit, -1)}
                      disabled={item.qty <= 1}
                      className="h-8 w-8 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium w-8 text-center">
                      {item.qty}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateQuantity(item.id, item.unit, 1)}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(item.id, item.unit)}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Last Invoice */}
      {lastInvoice && cart.length === 0 && (
        <div className="p-4 border-t border-border/30">
          <div className="p-4 bg-emerald-50/50 border border-emerald-200/50 rounded-lg">
            <div className="text-center space-y-3">
              <Badge variant="outline" className="bg-emerald-100/50 text-emerald-700 border-emerald-200">
                {lastInvoice.isDraft ? 'Draft Created' : 'Invoice Sent'}
              </Badge>
              <div>
                <h3 className="font-medium text-emerald-900">
                  {lastInvoice.isDraft ? 'Draft' : 'Invoice'} {lastInvoice.invoice_number}
                </h3>
                <p className="text-sm text-emerald-700">
                  Total: {typeof lastInvoice.total === 'number' ? lastInvoice.total.toFixed(2) : lastInvoice.total} SAR
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => lastInvoice && downloadInvoice({
                    invoiceId: lastInvoice.invoice_id,
                    invoiceNumber: lastInvoice.invoice_number,
                    isDraft: lastInvoice.isDraft
                  })}
                  size="sm"
                  className="flex-1 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
                <Button
                  onClick={() => lastInvoice && downloadAndPrintInvoice({
                    invoiceId: lastInvoice.invoice_id,
                    invoiceNumber: lastInvoice.invoice_number,
                    isDraft: lastInvoice.isDraft,
                    autoPrint: true,
                    skipDownload: true
                  })}
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                >
                  <Printer className="w-3 h-3 mr-1" />
                  Print
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Summary & Checkout */}
      {cart.length > 0 && (
        <div className="p-4 border-t border-border/30 bg-background/80">
          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax ({Math.round(TAX_RATE * 100)}%):</span>
              <span>{tax.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total:</span>
              <span>{total.toFixed(2)} SAR</span>
            </div>
          </div>

          {/* Invoice Mode Toggle */}
          <div className="flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Send Invoice</span>
              <span className="text-xs text-muted-foreground">
                {invoiceMode === 'sent' 
                  ? 'Invoice will be sent immediately' 
                  : 'Save as draft for later review'}
              </span>
            </div>
            <Switch
              checked={invoiceMode === 'sent'}
              onCheckedChange={(checked) => setInvoiceMode(checked ? 'sent' : 'draft')}
            />
          </div>

          <Button 
            onClick={handleCheckout}
            className="w-full h-12 text-base"
            disabled={!selectedCustomer}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            {invoiceMode === 'sent' ? 'Send Invoice' : 'Create Draft'}
          </Button>
        </div>
      )}
    </div>
  )
}