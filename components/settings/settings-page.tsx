'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Zap, User, Palette, Monitor, ShoppingBag, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, Building2, Sun, Moon, SunMoon, Printer, DollarSign, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { useTheme } from 'next-themes'
import { usePOSStore } from '@/lib/stores/pos-store'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { printTestPage } from '@/lib/utils/printer'

export function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [branches, setBranches] = useState<Array<{branch_id: string; branch_name: string; is_primary?: boolean; is_default?: boolean; city?: string; country?: string}>>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [refreshingAuth, setRefreshingAuth] = useState(false)
  const [testingPrinter, setTestingPrinter] = useState(false)
  
  // LastSold Pricing state
  const [lastSoldStats, setLastSoldStats] = useState<{
    totalCount: number
    branchStats: Record<string, { count: number; branchName: string }>
    lastUpdated: string | null
  } | null>(null)
  const [loadingLastSoldStats, setLoadingLastSoldStats] = useState(false)
  const [clearingPrices, setClearingPrices] = useState(false)
  
  const { 
    authStatus, 
    taxMode, 
    selectedBranch,
    syncStatus,
    loading,
    printerSettings,
    pricingStrategy,
    setTaxMode,
    setSelectedBranch,
    setPrinterSettings,
    setPricingStrategy,
    refreshAuthStatus,
    logout,
    checkAuthStatus
  } = usePOSStore()

  const loadBranches = async () => {
    if (loadingBranches) return
    
    try {
      setLoadingBranches(true)
      const response = await fetch('/api/branches')
      const data = await response.json()
      
      if (data.success) {
        setBranches(data.branches)
        
        // Auto-select first branch if none selected
        if (!selectedBranch && data.branches.length > 0) {
          const defaultBranch = data.branches.find((b: { is_primary?: boolean; is_default?: boolean; branch_id: string; branch_name: string }) => b.is_primary || b.is_default) || data.branches[0]
          setSelectedBranch({
            id: defaultBranch.branch_id,
            name: defaultBranch.branch_name
          })
        }
      }
    } catch (error) {
      console.error('Failed to load branches:', error)
      toast.error('Failed to load branches')
    } finally {
      setLoadingBranches(false)
    }
  }

  // Set mounted state and check auth status
  useEffect(() => {
    setMounted(true)
    checkAuthStatus()
    if (pricingStrategy === 'lastsold') {
      loadLastSoldStats()
    }
  }, [checkAuthStatus])

  // Load stats when pricing strategy changes to LastSold
  useEffect(() => {
    if (pricingStrategy === 'lastsold') {
      loadLastSoldStats()
    }
  }, [pricingStrategy])

  // Load branches if authenticated
  useEffect(() => {
    if (authStatus.authenticated) {
      loadBranches()
    }
  }, [authStatus.authenticated, loadBranches])

  const handleConnectZoho = () => {
    // Redirect to Zoho OAuth login
    window.location.href = '/api/auth/login'
  }

  const handleDisconnectZoho = async () => {
    try {
      await logout()
      toast.success('Disconnected from Zoho Books')
      setBranches([])
    } catch (error) {
      toast.error('Failed to disconnect')
    }
  }

  const handleRefreshAuth = async () => {
    try {
      setRefreshingAuth(true)
      await refreshAuthStatus()
      toast.success('Authentication status refreshed')
    } catch (error) {
      toast.error('Failed to refresh authentication status')
    } finally {
      setRefreshingAuth(false)
    }
  }

  const handleSelectBranch = (branch: {branch_id: string; branch_name: string}) => {
    setSelectedBranch({
      id: branch.branch_id,
      name: branch.branch_name
    })
    toast.success(`Selected branch: ${branch.branch_name}`)
  }

  const handleTestPrint = async () => {
    if (testingPrinter) return
    
    try {
      setTestingPrinter(true)
      const success = await printTestPage()
      
      if (success) {
        toast.success('Test page sent to printer!')
      }
    } catch (error) {
      toast.error('Test print failed. Please check your printer.')
    } finally {
      setTestingPrinter(false)
    }
  }

  // LastSold Pricing functions
  const loadLastSoldStats = async () => {
    if (loadingLastSoldStats) return
    
    try {
      setLoadingLastSoldStats(true)
      const response = await fetch('/api/last-sold-prices/stats')
      const data = await response.json()
      
      if (data.success) {
        setLastSoldStats({
          totalCount: data.totalCount,
          branchStats: data.branchStats,
          lastUpdated: data.lastUpdated
        })
      }
    } catch (error) {
      console.error('Failed to load LastSold stats:', error)
      toast.error('Failed to load pricing statistics')
    } finally {
      setLoadingLastSoldStats(false)
    }
  }

  const handleClearAllPrices = async () => {
    if (!confirm('Are you sure you want to clear ALL LastSold prices? This action cannot be undone.')) return
    
    try {
      setClearingPrices(true)
      const response = await fetch('/api/last-sold-prices/clear', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirm: true })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('All LastSold prices cleared successfully')
        setLastSoldStats({
          totalCount: 0,
          branchStats: {},
          lastUpdated: null
        })
      } else {
        toast.error(data.error || 'Failed to clear prices')
      }
    } catch (error) {
      console.error('Failed to clear LastSold prices:', error)
      toast.error('Failed to clear prices')
    } finally {
      setClearingPrices(false)
    }
  }

  const handleClearBranchPrices = async (branchId: string, branchName: string) => {
    if (!confirm(`Are you sure you want to clear LastSold prices for "${branchName}"? This action cannot be undone.`)) return
    
    try {
      setClearingPrices(true)
      const response = await fetch('/api/last-sold-prices/clear', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ branchId, confirm: true })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(`Cleared ${data.deletedCount} prices for ${branchName}`)
        // Reload stats
        loadLastSoldStats()
      } else {
        toast.error(data.error || 'Failed to clear branch prices')
      }
    } catch (error) {
      console.error('Failed to clear branch LastSold prices:', error)
      toast.error('Failed to clear branch prices')
    } finally {
      setClearingPrices(false)
    }
  }

  // Get status badge variant and icon
  const getStatusInfo = () => {
    if (!authStatus.authenticated) {
      return {
        variant: 'secondary' as const,
        icon: XCircle,
        color: 'text-muted-foreground'
      }
    }

    switch (authStatus.status) {
      case 'critical':
        return {
          variant: 'destructive' as const,
          icon: AlertTriangle,
          color: 'text-destructive'
        }
      case 'warning':
        return {
          variant: 'outline' as const,
          icon: Clock,
          color: 'text-yellow-600'
        }
      case 'good':
      default:
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          color: 'text-green-600'
        }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-12 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold">Settings</h1>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Sun className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-8">
            <div className="animate-pulse">
              <div className="h-20 bg-muted rounded-lg mb-4"></div>
              <div className="h-40 bg-muted rounded-lg mb-4"></div>
              <div className="h-32 bg-muted rounded-lg"></div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-8 w-8 relative overflow-hidden"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <Sun className={`h-4 w-4 absolute transition-all duration-300 ${
              theme === 'dark' 
                ? 'rotate-90 scale-0' 
                : 'rotate-0 scale-100'
            }`} />
            <Moon className={`h-4 w-4 absolute transition-all duration-300 ${
              theme === 'dark' 
                ? 'rotate-0 scale-100' 
                : '-rotate-90 scale-0'
            }`} />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Account Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Account</h2>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>Zoho Books Integration</span>
                    <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusInfo.variant}>
                      {authStatus.authenticated ? 'Connected' : 'Disconnected'}
                    </Badge>
                    {authStatus.authenticated && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={handleRefreshAuth}
                        disabled={refreshingAuth}
                      >
                        <RefreshCw className={`h-3 w-3 ${refreshingAuth ? 'animate-spin' : ''}`} />
                      </Button>
                    )}
                  </div>
                </CardTitle>
                <CardDescription>
                  Connect your Zoho Books account to sync products, customers, and create invoices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status Alert */}
                {authStatus.authenticated && (authStatus.critical || authStatus.needsReauth) && (
                  <Alert variant={authStatus.critical ? "destructive" : "default"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {authStatus.message}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Sync Status */}
                {syncStatus && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="font-medium">Status:</div>
                    <div className="text-muted-foreground">{syncStatus}</div>
                  </div>
                )}

                {/* Connection Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {authStatus.authenticated ? 'Account Connected' : 'Not Connected'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {authStatus.authenticated 
                          ? `Your POS is synced with Zoho Books`
                          : 'Connect to access your products and customers'
                        }
                      </p>
                    </div>
                    <Button 
                      onClick={authStatus.authenticated ? handleDisconnectZoho : handleConnectZoho}
                      variant={authStatus.authenticated ? 'outline' : 'default'}
                      disabled={loading}
                    >
                      {loading ? '...' : authStatus.authenticated ? 'Disconnect' : 'Connect Zoho'}
                    </Button>
                  </div>

                  {/* Token Info */}
                  {authStatus.authenticated && authStatus.tokenExpiresInHours && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Token expires in:</span>
                      </div>
                      <span className={
                        authStatus.critical ? 'text-destructive font-medium' :
                        authStatus.needsReauth ? 'text-yellow-600 font-medium' :
                        'text-muted-foreground'
                      }>
                        {parseFloat(authStatus.tokenExpiresInHours).toFixed(1)} hours
                      </span>
                    </div>
                  )}

                  {/* Organization Info */}
                  {authStatus.authenticated && authStatus.organizationId && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>Organization:</span>
                      </div>
                      <span className="text-muted-foreground font-mono text-xs">
                        {authStatus.organizationId}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Business Settings */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Business</h2>
            </div>
            
            <div className="space-y-4">
              {/* Pricing Strategy */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Pricing Strategy
                  </CardTitle>
                  <CardDescription>
                    Choose how product prices are determined and suggested
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        variant={pricingStrategy === 'default' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPricingStrategy('default')}
                        className="flex-1"
                      >
                        Default Pricing
                      </Button>
                      <Button
                        variant={pricingStrategy === 'lastsold' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPricingStrategy('lastsold')}
                        className="flex-1"
                      >
                        LastSold Pricing
                      </Button>
                    </div>
                    
                    {/* Strategy descriptions */}
                    <div className="space-y-3 text-sm">
                      <div className={`p-3 rounded-lg border ${
                        pricingStrategy === 'default' ? 'bg-primary/5 border-primary' : 'bg-muted/30'
                      }`}>
                        <div className="font-medium mb-1">Default Pricing</div>
                        <div className="text-xs text-muted-foreground">
                          Uses product's base price from inventory. Tax adjustments applied based on tax mode.
                        </div>
                      </div>
                      
                      <div className={`p-3 rounded-lg border ${
                        pricingStrategy === 'lastsold' ? 'bg-primary/5 border-primary' : 'bg-muted/30'
                      }`}>
                        <div className="font-medium mb-1">LastSold Pricing</div>
                        <div className="text-xs text-muted-foreground">
                          Remembers and suggests the last price used for each item, unit, branch, and tax mode combination. Falls back to default pricing when no history exists.
                        </div>
                      </div>
                    </div>
                    
                    {/* Current strategy info */}
                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        Current strategy: <span className="font-medium">
                          {pricingStrategy === 'default' ? 'Default Pricing' : 'LastSold Pricing'}
                        </span>
                      </div>
                      {pricingStrategy === 'lastsold' && lastSoldStats && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {lastSoldStats.totalCount} saved prices available
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tax Mode */}
              <Card>
                <CardHeader>
                  <CardTitle>Tax Mode</CardTitle>
                  <CardDescription>
                    Choose how taxes are calculated and displayed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          taxMode === 'exclusive' ? 'bg-primary' : 'bg-muted'
                        }`} />
                        <div>
                          <p className="font-medium">Tax Exclusive</p>
                          <p className="text-sm text-muted-foreground">
                            Tax is added to the base price
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          taxMode === 'inclusive' ? 'bg-primary' : 'bg-muted'
                        }`} />
                        <div>
                          <p className="font-medium">Tax Inclusive</p>
                          <p className="text-sm text-muted-foreground">
                            Tax is included in the displayed price
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={taxMode === 'exclusive' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTaxMode('exclusive')}
                      >
                        Exclusive
                      </Button>
                      <Button
                        variant={taxMode === 'inclusive' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTaxMode('inclusive')}
                      >
                        Inclusive
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Branch Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Branch / Location
                  </CardTitle>
                  <CardDescription>
                    Select your business location for invoicing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {selectedBranch?.name || 'No Branch Selected'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedBranch?.name 
                          ? 'Current location for new invoices'
                          : 'Invoices will be created without branch reference'
                        }
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      disabled={!authStatus.authenticated || loadingBranches}
                      onClick={loadBranches}
                    >
                      {loadingBranches ? 'Loading...' : 'Refresh Branches'}
                    </Button>
                  </div>

                  {/* Branch List */}
                  {authStatus.authenticated && branches.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Available Branches:</p>
                      <div className="grid gap-2 max-h-40 overflow-y-auto">
                        {branches.map((branch) => (
                          <div 
                            key={branch.branch_id}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedBranch?.id === branch.branch_id 
                                ? 'bg-primary/5 border-primary' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => handleSelectBranch(branch)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{branch.branch_name}</p>
                                {branch.is_primary && (
                                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                                )}
                                {branch.is_default && (
                                  <Badge variant="outline" className="text-xs">Default</Badge>
                                )}
                              </div>
                              {(branch.city || branch.country) && (
                                <p className="text-sm text-muted-foreground">
                                  {[branch.city, branch.country].filter(Boolean).join(', ')}
                                </p>
                              )}
                            </div>
                            {selectedBranch?.id === branch.branch_id && (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No branches message */}
                  {authStatus.authenticated && branches.length === 0 && !loadingBranches && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="font-medium mb-1">No branches configured</p>
                      <p className="text-sm">Using main organization settings</p>
                    </div>
                  )}

                  {/* Not authenticated message */}
                  {!authStatus.authenticated && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="font-medium mb-1">Connect to Zoho Books</p>
                      <p className="text-sm">Login to manage branch selection</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Appearance</h2>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>
                  Customize the appearance of your POS interface
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                        theme === 'light' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Sun className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">Light</p>
                        <p className="text-sm text-muted-foreground">
                          Clean, bright interface
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                        theme === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Moon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">Dark</p>
                        <p className="text-sm text-muted-foreground">
                          Easy on the eyes, modern look
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                        theme === 'system' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Monitor className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">System</p>
                        <p className="text-sm text-muted-foreground">
                          Follow your device preference
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1 p-1 bg-muted rounded-lg">
                      <Button
                        variant={theme === 'light' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setTheme('light')}
                        className="flex-1 h-8"
                      >
                        <Sun className="h-3 w-3 mr-1" />
                        Light
                      </Button>
                      <Button
                        variant={theme === 'dark' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setTheme('dark')}
                        className="flex-1 h-8"
                      >
                        <Moon className="h-3 w-3 mr-1" />
                        Dark
                      </Button>
                      <Button
                        variant={theme === 'system' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setTheme('system')}
                        className="flex-1 h-8"
                      >
                        <Monitor className="h-3 w-3 mr-1" />
                        Auto
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Printing */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Printer className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Printing</h2>
            </div>
            
            <div className="space-y-4">
              {/* Auto Print Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Auto-Print Settings</CardTitle>
                  <CardDescription>
                    Configure automatic printing for invoices
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Auto Print Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Auto-print invoices</div>
                      <div className="text-xs text-muted-foreground">
                        Automatically print invoices after creation
                      </div>
                    </div>
                    <Switch
                      checked={printerSettings.autoPrint}
                      onCheckedChange={(checked) => 
                        setPrinterSettings({ autoPrint: checked })
                      }
                    />
                  </div>

                  {/* Silent Print Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Silent printing</div>
                      <div className="text-xs text-muted-foreground">
                        Print without showing dialog (uses Windows default printer)
                      </div>
                    </div>
                    <Switch
                      checked={printerSettings.silentPrint}
                      onCheckedChange={(checked) => 
                        setPrinterSettings({ silentPrint: checked })
                      }
                    />
                  </div>

                  {/* Number of Copies */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Number of copies</div>
                      <div className="text-xs text-muted-foreground">
                        How many copies to print automatically
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={printerSettings.numberOfCopies <= 1}
                        onClick={() => 
                          setPrinterSettings({ 
                            numberOfCopies: Math.max(1, printerSettings.numberOfCopies - 1) 
                          })
                        }
                      >
                        -
                      </Button>
                      <div className="w-8 text-center text-sm font-medium">
                        {printerSettings.numberOfCopies}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={printerSettings.numberOfCopies >= 5}
                        onClick={() => 
                          setPrinterSettings({ 
                            numberOfCopies: Math.min(5, printerSettings.numberOfCopies + 1) 
                          })
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Printer Setup */}
              <Card>
                <CardHeader>
                  <CardTitle>Printer Setup</CardTitle>
                  <CardDescription>
                    Test your printer and configure default settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Instructions */}
                  <Alert>
                    <Monitor className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Windows Setup:</strong> Go to Settings → Printers & Scanners and set your POS printer as the default printer. Silent printing will use this default printer.
                    </AlertDescription>
                  </Alert>

                  {/* Test Print */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Test printer</div>
                      <div className="text-xs text-muted-foreground">
                        Print a test page to verify printer connection
                      </div>
                    </div>
                    <Button 
                      onClick={handleTestPrint}
                      disabled={testingPrinter}
                      variant="outline"
                    >
                      {testingPrinter ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Printer className="mr-2 h-4 w-4" />
                          Test Print
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Current Settings Summary */}
                  <div className="pt-4 border-t">
                    <div className="text-sm font-medium mb-2">Current Settings:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>Auto-print: {printerSettings.autoPrint ? 'Enabled' : 'Disabled'}</div>
                      <div>Silent mode: {printerSettings.silentPrint ? 'Enabled' : 'Disabled'}</div>
                      <div>Copies: {printerSettings.numberOfCopies}</div>
                      <div>Test enabled: {printerSettings.testPrintEnabled ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* LastSold Pricing - Only show when strategy is enabled */}
          {pricingStrategy === 'lastsold' && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">LastSold Pricing Strategy</h2>
            </div>
            
            <div className="space-y-4">
              {/* LastSold Pricing Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Automatic Pricing Memory</CardTitle>
                  <CardDescription>
                    LastSold pricing automatically remembers and suggests the last price used for each item, unit, branch, and tax mode combination
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* How it works */}
                  <Alert>
                    <DollarSign className="h-4 w-4" />
                    <AlertDescription>
                      <strong>How it works:</strong> When you add an item to cart with a custom price, that price is automatically saved and will be suggested next time you select the same item with the same unit, branch, and tax mode.
                    </AlertDescription>
                  </Alert>

                  {/* Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-lg font-semibold">
                        {loadingLastSoldStats ? '...' : lastSoldStats?.totalCount || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Saved Prices</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-lg font-semibold">
                        {loadingLastSoldStats ? '...' : Object.keys(lastSoldStats?.branchStats || {}).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Branches with Prices</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-lg font-semibold">
                        {loadingLastSoldStats ? '...' : lastSoldStats?.lastUpdated 
                          ? new Date(lastSoldStats.lastUpdated).toLocaleDateString()
                          : 'Never'}
                      </div>
                      <div className="text-xs text-muted-foreground">Last Updated</div>
                    </div>
                  </div>

                  {/* Branch-wise breakdown */}
                  {lastSoldStats && Object.keys(lastSoldStats.branchStats).length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Prices by Branch:</div>
                      <div className="space-y-2">
                        {Object.entries(lastSoldStats.branchStats).map(([branchId, stats]) => (
                          <div key={branchId} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                            <div>
                              <div className="text-sm font-medium">{stats.branchName}</div>
                              <div className="text-xs text-muted-foreground">{stats.count} saved prices</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={clearingPrices}
                              onClick={() => handleClearBranchPrices(branchId, stats.branchName)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No prices message */}
                  {lastSoldStats && lastSoldStats.totalCount === 0 && !loadingLastSoldStats && (
                    <div className="text-center py-6 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="font-medium mb-1">No saved prices yet</p>
                      <p className="text-sm">Start using custom prices to build your pricing memory</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Management Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Data Management</CardTitle>
                  <CardDescription>
                    Manage your saved pricing data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Refresh statistics</div>
                      <div className="text-xs text-muted-foreground">
                        Update the pricing statistics display
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      disabled={loadingLastSoldStats}
                      onClick={loadLastSoldStats}
                    >
                      {loadingLastSoldStats ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Refresh
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium text-destructive">Clear all saved prices</div>
                      <div className="text-xs text-muted-foreground">
                        Permanently delete all LastSold pricing data
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      disabled={clearingPrices || !lastSoldStats || lastSoldStats.totalCount === 0}
                      onClick={handleClearAllPrices}
                    >
                      {clearingPrices ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Clearing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Clear All
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
          )}

          {/* Keyboard Shortcuts */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Master these shortcuts to work faster
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Open Spotlight search</span>
                    <div className="flex gap-1">
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl</kbd>
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Alternative search</span>
                    <div className="flex gap-1">
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl</kbd>
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">K</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Quick actions</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">{">"} + action</kbd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Navigation</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">/ + page</kbd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Calculator mode</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">5 + 10</kbd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Close dialogs</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Back to POS */}
          <div className="flex justify-center pt-8">
            <Button onClick={() => router.push('/')} size="lg">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to POS
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}