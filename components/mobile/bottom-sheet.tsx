'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, PanInfo, AnimatePresence } from 'framer-motion'
import { useMobile, useTouchGestures } from '@/hooks/use-mobile'

export interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  snapPoints?: number[] // Percentages of screen height (e.g., [0.3, 0.6, 0.9])
  initialSnap?: number // Index of initial snap point
  className?: string
  showHandle?: boolean
  closeOnBackdrop?: boolean
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  snapPoints = [0.3, 0.6, 0.9],
  initialSnap = 1,
  className = '',
  showHandle = true,
  closeOnBackdrop = true
}) => {
  const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnap)
  const [isDragging, setIsDragging] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const { height, shouldUseMobileLayout } = useMobile()
  
  // Calculate snap positions in pixels
  const snapPositions = snapPoints.map(point => height * (1 - point))
  const currentPosition = snapPositions[currentSnapIndex] || snapPositions[initialSnap]

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    setIsDragging(false)
    
    if (!shouldUseMobileLayout) return

    const threshold = height * 0.1 // 10% of screen height
    const currentY = currentPosition + info.offset.y
    
    // If dragged down significantly or velocity is high downward, close
    if (info.offset.y > threshold && info.velocity.y > 0) {
      if (currentSnapIndex === 0) {
        onClose()
        return
      } else {
        // Move to smaller snap point
        setCurrentSnapIndex(Math.max(0, currentSnapIndex - 1))
        return
      }
    }
    
    // If dragged up significantly or velocity is high upward, expand
    if (info.offset.y < -threshold && info.velocity.y < 0) {
      setCurrentSnapIndex(Math.min(snapPoints.length - 1, currentSnapIndex + 1))
      return
    }
    
    // Find closest snap point
    const targetY = currentY
    let closestIndex = 0
    let minDistance = Math.abs(targetY - snapPositions[0])
    
    snapPositions.forEach((pos, index) => {
      const distance = Math.abs(targetY - pos)
      if (distance < minDistance) {
        minDistance = distance
        closestIndex = index
      }
    })
    
    setCurrentSnapIndex(closestIndex)
  }, [currentPosition, currentSnapIndex, height, onClose, shouldUseMobileLayout, snapPositions, snapPoints.length])

  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop) {
      onClose()
    }
  }, [closeOnBackdrop, onClose])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Reset snap when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentSnapIndex(initialSnap)
    }
  }, [isOpen, initialSnap])

  if (!shouldUseMobileLayout) {
    // Return children directly for desktop
    return <>{children}</>
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
            className="fixed inset-0 bg-black z-40"
          />
          
          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: height }}
            animate={{ 
              y: currentPosition,
              transition: isDragging ? { type: 'spring', damping: 50, stiffness: 300 } : { type: 'spring', damping: 30, stiffness: 300 }
            }}
            exit={{ y: height }}
            drag="y"
            dragConstraints={{ top: snapPositions[snapPositions.length - 1], bottom: height }}
            dragElastic={0.1}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            className={`fixed bottom-0 left-0 right-0 bg-background border-t border-border rounded-t-xl shadow-2xl z-50 ${className}`}
            style={{
              height: height - currentPosition,
              maxHeight: height * 0.95,
              touchAction: 'none'
            }}
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
            )}
            
            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Utility hook for managing bottom sheet state
export function useBottomSheet(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen)
  
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(prev => !prev), [])
  
  return {
    isOpen,
    open,
    close,
    toggle
  }
}