'use client'

import { useMobileViewport } from './use-mobile-viewport'
import { useTouchGestures, useSwipeGesture } from './use-touch-gestures'
import { useHapticFeedback, usePOSHaptics } from './use-haptic-feedback'

// Combined hook for all mobile functionality
export function useMobile() {
  const viewport = useMobileViewport()
  const haptics = useHapticFeedback()
  const posHaptics = usePOSHaptics()

  return {
    ...viewport,
    haptics,
    posHaptics,
    // Utility functions
    isTouchDevice: viewport.isTouch,
    isNativeApp: viewport.isCapacitor,
    shouldUseMobileLayout: viewport.isMobile || (viewport.isTablet && viewport.orientation === 'portrait'),
    
    // Quick access methods
    vibrate: haptics.triggerHaptic,
    addToCartFeedback: posHaptics.addToCart,
    buttonPressFeedback: posHaptics.buttonPress,
    successFeedback: posHaptics.completeSale,
    errorFeedback: posHaptics.error
  }
}

// Export individual hooks
export {
  useMobileViewport,
  useTouchGestures,
  useSwipeGesture,
  useHapticFeedback,
  usePOSHaptics
}

// Export types
export type { HapticFeedbackType } from './use-haptic-feedback'

// Mobile-specific constants
export const MOBILE_CONSTANTS = {
  MIN_TOUCH_TARGET: 44, // iOS minimum touch target size
  SWIPE_THRESHOLD: 50,
  LONG_PRESS_DELAY: 500,
  DOUBLE_TAP_DELAY: 300,
  ANIMATION_DURATION: 300,
  SCROLL_THRESHOLD: 10,
  
  // Z-index layers for mobile
  Z_INDEX: {
    BACKDROP: 40,
    MODAL: 50,
    BOTTOM_SHEET: 45,
    FAB: 30,
    STICKY_HEADER: 20,
    TOOLTIP: 60
  },
  
  // Common mobile breakpoints
  BREAKPOINTS: {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200
  }
} as const

// Utility functions for mobile development
export const mobileUtils = {
  // Check if device is in landscape mode
  isLandscape: (): boolean => {
    if (typeof window === 'undefined') return false
    return window.innerWidth > window.innerHeight
  },

  // Check if device is iOS
  isIOS: (): boolean => {
    if (typeof window === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
  },

  // Check if device is Android
  isAndroid: (): boolean => {
    if (typeof window === 'undefined') return false
    return /Android/.test(navigator.userAgent)
  },

  // Get safe area insets (for notch handling)
  getSafeAreaInsets: () => {
    if (typeof window === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 }
    
    const style = getComputedStyle(document.documentElement)
    return {
      top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
      bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
      left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
      right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0')
    }
  },

  // Prevent zoom on input focus (iOS)
  preventZoomOnFocus: (element: HTMLInputElement) => {
    element.addEventListener('focus', () => {
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
        )
      }
    })

    element.addEventListener('blur', () => {
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0'
        )
      }
    })
  },

  // Smooth scroll to element
  scrollToElement: (element: Element, offset: number = 0) => {
    const top = element.getBoundingClientRect().top + window.pageYOffset - offset
    window.scrollTo({
      top,
      behavior: 'smooth'
    })
  }
}