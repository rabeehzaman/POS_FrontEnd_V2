'use client'

import { create } from 'zustand'

interface MobileCartState {
  isOpen: boolean
  snapIndex: number
  open: () => void
  close: () => void
  toggle: () => void
  setSnapIndex: (index: number) => void
}

export const useMobileCartStore = create<MobileCartState>((set) => ({
  isOpen: false,
  snapIndex: 1, // Default to middle snap point
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setSnapIndex: (index: number) => set({ snapIndex: index })
}))

// Hook for consuming the mobile cart state
export function useMobileCart() {
  return useMobileCartStore()
}

// Hook for cart actions only (for components that only need to control the cart)
export function useMobileCartActions() {
  const { open, close, toggle, setSnapIndex } = useMobileCartStore()
  return { open, close, toggle, setSnapIndex }
}