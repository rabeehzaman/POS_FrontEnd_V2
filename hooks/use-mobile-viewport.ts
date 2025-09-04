'use client'

import { useState, useEffect } from 'react'

interface ViewportInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  width: number
  height: number
  orientation: 'portrait' | 'landscape'
  isTouch: boolean
  isCapacitor: boolean
}

export function useMobileViewport(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    width: 0,
    height: 0,
    orientation: 'portrait',
    isTouch: false,
    isCapacitor: false
  })

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const orientation = width > height ? 'landscape' : 'portrait'
      
      // Mobile: < 768px
      // Tablet: 768px - 1024px  
      // Desktop: > 1024px
      const isMobile = width < 768
      const isTablet = width >= 768 && width <= 1024
      const isDesktop = width > 1024
      
      // Detect touch capability
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      // Detect Capacitor environment
      const isCapacitor = typeof window !== 'undefined' && 
        (window as any).Capacitor !== undefined
      
      setViewport({
        isMobile,
        isTablet,
        isDesktop,
        width,
        height,
        orientation,
        isTouch,
        isCapacitor
      })
    }

    // Initial update
    updateViewport()

    // Listen for resize and orientation changes
    window.addEventListener('resize', updateViewport)
    window.addEventListener('orientationchange', updateViewport)

    return () => {
      window.removeEventListener('resize', updateViewport)
      window.removeEventListener('orientationchange', updateViewport)
    }
  }, [])

  return viewport
}

export const MOBILE_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const

// Utility functions for responsive design
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < MOBILE_BREAKPOINTS.md
}

export const isTabletDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= MOBILE_BREAKPOINTS.md && 
         window.innerWidth <= MOBILE_BREAKPOINTS.lg
}

export const isDesktopDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.innerWidth > MOBILE_BREAKPOINTS.lg
}