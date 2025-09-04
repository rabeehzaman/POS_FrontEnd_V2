'use client'

import React, { useState } from 'react'
import { Settings, Moon, Sun, Search, Wifi, WifiOff, RefreshCw, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { useMobile } from '@/hooks/use-mobile'
import { motion, AnimatePresence } from 'framer-motion'

interface HeaderProps {
  cartCount?: number
  searchQuery?: string
  onSearchChange?: (query: string) => void
  syncStatus?: 'idle' | 'syncing' | 'error'
  isOnline?: boolean
}

export const Header = React.memo<HeaderProps>(function Header({ 
  cartCount = 0, 
  searchQuery = '', 
  onSearchChange, 
  syncStatus = 'idle',
  isOnline = true 
}) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  
  // Mobile capabilities
  const { shouldUseMobileLayout, posHaptics } = useMobile()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
    posHaptics.buttonPress()
  }

  const goToSettings = () => {
    router.push('/settings')
    posHaptics.buttonPress()
  }

  const toggleMobileSearch = () => {
    setShowMobileSearch(!showMobileSearch)
    setShowMobileMenu(false)
    posHaptics.buttonPress()
  }

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu)
    setShowMobileSearch(false)
    posHaptics.buttonPress()
  }

  return (
    <>
      <header className={`sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md ${
        shouldUseMobileLayout ? 'shadow-sm' : ''
      }`}>
        <div className={`container flex items-center justify-between ${
          shouldUseMobileLayout ? 'h-14 px-4' : 'h-12 px-4'
        }`}>
          {/* Left: Logo/Title */}
          <div className="flex items-center space-x-3">
            <h1 className={`font-medium tracking-tight ${
              shouldUseMobileLayout ? 'text-base' : 'text-lg'
            }`}>
              TMR POS
            </h1>
            
            {/* Desktop cart count */}
            {!shouldUseMobileLayout && cartCount > 0 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full">
                {cartCount}
              </Badge>
            )}
            
            {/* Status indicators - compact on mobile */}
            {syncStatus === 'syncing' && (
              <div className={`flex items-center space-x-1 text-xs text-muted-foreground ${
                shouldUseMobileLayout ? 'hidden sm:flex' : 'flex'
              }`}>
                <RefreshCw className="h-3 w-3 animate-spin" />
                {!shouldUseMobileLayout && <span>Syncing...</span>}
              </div>
            )}
            {syncStatus === 'error' && !isOnline && (
              <div className={`flex items-center space-x-1 text-xs text-yellow-600 dark:text-yellow-500 ${
                shouldUseMobileLayout ? 'hidden sm:flex' : 'flex'
              }`}>
                <WifiOff className="h-3 w-3" />
                {!shouldUseMobileLayout && <span>Offline</span>}
              </div>
            )}
          </div>

          {/* Center: Search Bar (Desktop) or Mobile Actions */}
          {shouldUseMobileLayout ? (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMobileSearch}
                className="h-9 w-9 rounded-full hover:bg-muted/50 transition-colors"
                title="Search"
              >
                <Search className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMobileMenu}
                className="h-9 w-9 rounded-full hover:bg-muted/50 transition-colors"
                title="Menu"
              >
                {showMobileMenu ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <div className="flex-1 max-w-sm mx-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="pl-10 h-9 border-0 bg-muted/30 hover:bg-muted/50 focus:bg-background/80 transition-all duration-200 rounded-full text-sm placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
          )}

          {/* Right: Actions (Desktop only) */}
          {!shouldUseMobileLayout && (
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8 rounded-full hover:bg-muted/50 transition-colors"
                title="Toggle theme"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={goToSettings}
                className="h-8 w-8 rounded-full hover:bg-muted/50 transition-colors"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Settings</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {shouldUseMobileLayout && showMobileSearch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="sticky top-14 z-30 bg-background border-b border-border/40 p-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-10 h-10 border-0 bg-muted/30 hover:bg-muted/50 focus:bg-background/80 transition-all duration-200 rounded-full text-sm placeholder:text-muted-foreground/60"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileSearch(false)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {shouldUseMobileLayout && showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="sticky top-14 z-30 bg-background border-b border-border/40 p-4"
          >
            <div className="space-y-2">
              <Button
                variant="ghost"
                onClick={toggleTheme}
                className="w-full justify-start h-12 text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </div>
                  <span>Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
                </div>
              </Button>
              
              <Button
                variant="ghost"
                onClick={goToSettings}
                className="w-full justify-start h-12 text-left"
              >
                <div className="flex items-center space-x-3">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </div>
              </Button>

              {/* Status info on mobile */}
              {(syncStatus === 'syncing' || !isOnline) && (
                <div className="pt-2 border-t border-border/30">
                  {syncStatus === 'syncing' && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground py-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Syncing data...</span>
                    </div>
                  )}
                  {!isOnline && (
                    <div className="flex items-center space-x-2 text-sm text-yellow-600 dark:text-yellow-500 py-2">
                      <WifiOff className="h-4 w-4" />
                      <span>Offline mode</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
})