'use client'

import { useCallback } from 'react'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export type HapticFeedbackType = 
  | 'light' 
  | 'medium' 
  | 'heavy' 
  | 'selection' 
  | 'success' 
  | 'warning' 
  | 'error'

interface HapticFeedbackHook {
  triggerHaptic: (type: HapticFeedbackType) => Promise<void>
  triggerImpact: (style: ImpactStyle) => Promise<void>
  triggerNotification: (type: 'success' | 'warning' | 'error') => Promise<void>
  triggerSelection: () => Promise<void>
  isSupported: boolean
}

export function useHapticFeedback(): HapticFeedbackHook {
  // Check if haptics are supported (Capacitor environment)
  const isSupported = typeof window !== 'undefined' && 
    (window as any).Capacitor !== undefined

  const triggerHaptic = useCallback(async (type: HapticFeedbackType): Promise<void> => {
    if (!isSupported) {
      // Fallback to web vibration API if available
      if ('vibrator' in navigator || 'vibrate' in navigator) {
        const vibrationMap: Record<HapticFeedbackType, number | number[]> = {
          light: 10,
          medium: 20,
          heavy: 40,
          selection: 10,
          success: [10, 100, 10],
          warning: [10, 50, 10, 50, 10],
          error: [50, 100, 50]
        }
        
        navigator.vibrate?.(vibrationMap[type])
      }
      return
    }

    try {
      switch (type) {
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light })
          break
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium })
          break
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy })
          break
        case 'selection':
          await Haptics.selectionStart()
          await Haptics.selectionChanged()
          await Haptics.selectionEnd()
          break
        case 'success':
          await Haptics.notification({ type: 'success' })
          break
        case 'warning':
          await Haptics.notification({ type: 'warning' })
          break
        case 'error':
          await Haptics.notification({ type: 'error' })
          break
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error)
      
      // Fallback to vibration
      if ('vibrator' in navigator || 'vibrate' in navigator) {
        const duration = type === 'heavy' ? 40 : type === 'medium' ? 20 : 10
        navigator.vibrate?.(duration)
      }
    }
  }, [isSupported])

  const triggerImpact = useCallback(async (style: ImpactStyle): Promise<void> => {
    if (!isSupported) {
      const duration = style === ImpactStyle.Heavy ? 40 : 
                      style === ImpactStyle.Medium ? 20 : 10
      navigator.vibrate?.(duration)
      return
    }

    try {
      await Haptics.impact({ style })
    } catch (error) {
      console.warn('Haptic impact failed:', error)
    }
  }, [isSupported])

  const triggerNotification = useCallback(async (
    type: 'success' | 'warning' | 'error'
  ): Promise<void> => {
    if (!isSupported) {
      const pattern = type === 'success' ? [10, 100, 10] :
                     type === 'warning' ? [10, 50, 10, 50, 10] :
                     [50, 100, 50]
      navigator.vibrate?.(pattern)
      return
    }

    try {
      await Haptics.notification({ type })
    } catch (error) {
      console.warn('Haptic notification failed:', error)
    }
  }, [isSupported])

  const triggerSelection = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      navigator.vibrate?.(10)
      return
    }

    try {
      await Haptics.selectionStart()
      await Haptics.selectionChanged()
      await Haptics.selectionEnd()
    } catch (error) {
      console.warn('Haptic selection failed:', error)
    }
  }, [isSupported])

  return {
    triggerHaptic,
    triggerImpact,
    triggerNotification,
    triggerSelection,
    isSupported
  }
}

// Predefined haptic patterns for common POS actions
export const POS_HAPTICS = {
  addToCart: 'light' as const,
  removeFromCart: 'medium' as const,
  completeSale: 'success' as const,
  error: 'error' as const,
  buttonPress: 'selection' as const,
  swipeAction: 'light' as const,
  longPress: 'medium' as const,
  printerConnected: 'success' as const,
  printerError: 'error' as const,
  paymentSuccess: 'success' as const,
  paymentFailed: 'error' as const
} as const

// Hook for POS-specific haptic feedback
export function usePOSHaptics() {
  const { triggerHaptic } = useHapticFeedback()

  const addToCart = useCallback(() => triggerHaptic(POS_HAPTICS.addToCart), [triggerHaptic])
  const removeFromCart = useCallback(() => triggerHaptic(POS_HAPTICS.removeFromCart), [triggerHaptic])
  const completeSale = useCallback(() => triggerHaptic(POS_HAPTICS.completeSale), [triggerHaptic])
  const error = useCallback(() => triggerHaptic(POS_HAPTICS.error), [triggerHaptic])
  const buttonPress = useCallback(() => triggerHaptic(POS_HAPTICS.buttonPress), [triggerHaptic])
  const swipeAction = useCallback(() => triggerHaptic(POS_HAPTICS.swipeAction), [triggerHaptic])
  const longPress = useCallback(() => triggerHaptic(POS_HAPTICS.longPress), [triggerHaptic])
  const printerConnected = useCallback(() => triggerHaptic(POS_HAPTICS.printerConnected), [triggerHaptic])
  const printerError = useCallback(() => triggerHaptic(POS_HAPTICS.printerError), [triggerHaptic])
  const paymentSuccess = useCallback(() => triggerHaptic(POS_HAPTICS.paymentSuccess), [triggerHaptic])
  const paymentFailed = useCallback(() => triggerHaptic(POS_HAPTICS.paymentFailed), [triggerHaptic])

  return {
    addToCart,
    removeFromCart,
    completeSale,
    error,
    buttonPress,
    swipeAction,
    longPress,
    printerConnected,
    printerError,
    paymentSuccess,
    paymentFailed
  }
}