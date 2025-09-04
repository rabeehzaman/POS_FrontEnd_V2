'use client'

import { useRef, useCallback, RefObject } from 'react'

interface TouchPoint {
  x: number
  y: number
  timestamp: number
}

interface GestureCallbacks {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onLongPress?: () => void
  onTap?: () => void
  onDoubleTap?: () => void
  onPinchStart?: (scale: number) => void
  onPinchMove?: (scale: number) => void
  onPinchEnd?: (scale: number) => void
}

interface GestureOptions {
  swipeThreshold?: number
  longPressDelay?: number
  doubleTapDelay?: number
  pinchThreshold?: number
  preventDefault?: boolean
}

const DEFAULT_OPTIONS: Required<GestureOptions> = {
  swipeThreshold: 50,
  longPressDelay: 500,
  doubleTapDelay: 300,
  pinchThreshold: 10,
  preventDefault: true
}

export function useTouchGestures<T extends HTMLElement>(
  callbacks: GestureCallbacks,
  options: GestureOptions = {}
): RefObject<T> {
  const elementRef = useRef<T>(null)
  const touchStartRef = useRef<TouchPoint | null>(null)
  const longPressTimeoutRef = useRef<NodeJS.Timeout>()
  const lastTapRef = useRef<TouchPoint | null>(null)
  const initialPinchDistanceRef = useRef<number>(0)
  const currentScaleRef = useRef<number>(1)

  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // Calculate scale for pinch gesture
  const getScale = useCallback((touches: TouchList): number => {
    if (touches.length < 2) return 1
    const currentDistance = getDistance(touches[0], touches[1])
    if (initialPinchDistanceRef.current === 0) {
      initialPinchDistanceRef.current = currentDistance
      return 1
    }
    return currentDistance / initialPinchDistanceRef.current
  }, [getDistance])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (opts.preventDefault) {
      e.preventDefault()
    }

    const touch = e.touches[0]
    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    }

    // Handle single touch
    if (e.touches.length === 1) {
      touchStartRef.current = touchPoint

      // Start long press timer
      longPressTimeoutRef.current = setTimeout(() => {
        callbacks.onLongPress?.()
      }, opts.longPressDelay)

      // Check for double tap
      if (lastTapRef.current) {
        const timeDiff = touchPoint.timestamp - lastTapRef.current.timestamp
        const distance = Math.sqrt(
          Math.pow(touchPoint.x - lastTapRef.current.x, 2) +
          Math.pow(touchPoint.y - lastTapRef.current.y, 2)
        )

        if (timeDiff < opts.doubleTapDelay && distance < 30) {
          callbacks.onDoubleTap?.()
          lastTapRef.current = null
          return
        }
      }
    }

    // Handle pinch start
    if (e.touches.length === 2) {
      initialPinchDistanceRef.current = getDistance(e.touches[0], e.touches[1])
      currentScaleRef.current = 1
      callbacks.onPinchStart?.(1)
    }
  }, [callbacks, opts, getDistance])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (opts.preventDefault) {
      e.preventDefault()
    }

    // Clear long press if finger moves
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = undefined
    }

    // Handle pinch
    if (e.touches.length === 2) {
      const scale = getScale(e.touches)
      currentScaleRef.current = scale
      callbacks.onPinchMove?.(scale)
    }
  }, [callbacks, opts, getScale])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (opts.preventDefault) {
      e.preventDefault()
    }

    // Clear long press timer
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = undefined
    }

    // Handle pinch end
    if (e.changedTouches.length === 1 && initialPinchDistanceRef.current > 0) {
      callbacks.onPinchEnd?.(currentScaleRef.current)
      initialPinchDistanceRef.current = 0
      currentScaleRef.current = 1
      return
    }

    if (!touchStartRef.current || e.touches.length > 0) {
      return
    }

    const touch = e.changedTouches[0]
    const touchEnd: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    }

    const deltaX = touchEnd.x - touchStartRef.current.x
    const deltaY = touchEnd.y - touchStartRef.current.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const duration = touchEnd.timestamp - touchStartRef.current.timestamp

    // If movement is minimal, consider it a tap
    if (distance < opts.swipeThreshold && duration < 500) {
      lastTapRef.current = touchEnd
      callbacks.onTap?.()
      
      // Clear the tap after double tap delay
      setTimeout(() => {
        if (lastTapRef.current === touchEnd) {
          lastTapRef.current = null
        }
      }, opts.doubleTapDelay)
    } 
    // Handle swipes
    else if (distance >= opts.swipeThreshold) {
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      // Determine primary direction
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          callbacks.onSwipeRight?.()
        } else {
          callbacks.onSwipeLeft?.()
        }
      } else {
        // Vertical swipe  
        if (deltaY > 0) {
          callbacks.onSwipeDown?.()
        } else {
          callbacks.onSwipeUp?.()
        }
      }
    }

    touchStartRef.current = null
  }, [callbacks, opts])

  // Attach event listeners
  const attachListeners = useCallback((element: T) => {
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
      }
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  // Set up the ref callback
  const ref = useCallback((element: T | null) => {
    if (elementRef.current && (elementRef.current as any)._cleanup) {
      (elementRef.current as any)._cleanup()
    }

    elementRef.current = element

    if (element) {
      const cleanup = attachListeners(element)
      ;(element as any)._cleanup = cleanup
    }
  }, [attachListeners])

  return { current: null, ref } as any
}

// Utility hook for simple swipe detection
export function useSwipeGesture<T extends HTMLElement>(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void
) {
  return useTouchGestures<T>({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown
  })
}