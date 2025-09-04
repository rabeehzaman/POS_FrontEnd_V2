'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart } from 'lucide-react'
import { useCartSummary } from '@/lib/hooks/use-shallow-store'
import { useMobile } from '@/hooks/use-mobile'
import { useMobileCartActions } from '@/hooks/use-mobile-cart'
import { motion, AnimatePresence } from 'framer-motion'

export const FloatingCartButton: React.FC = () => {
  const { cartCount } = useCartSummary()
  const { shouldUseMobileLayout, posHaptics } = useMobile()
  const { open } = useMobileCartActions()

  const handleClick = () => {
    posHaptics.buttonPress()
    open()
  }

  // Only show on mobile when there are items in cart
  if (!shouldUseMobileLayout || cartCount === 0) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="fixed bottom-6 right-6 z-30"
      >
        <Button
          onClick={handleClick}
          size="lg"
          className="relative h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-primary hover:bg-primary/90"
        >
          <ShoppingCart className="h-6 w-6" />
          
          {/* Cart count badge */}
          {cartCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-bold"
            >
              {cartCount > 99 ? '99+' : cartCount}
            </Badge>
          )}
          
          {/* Ripple effect on press */}
          <motion.div
            className="absolute inset-0 rounded-full bg-white/20"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </Button>
      </motion.div>
    </AnimatePresence>
  )
}