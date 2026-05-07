'use client'

/**
 * UIStateContext — shared layout-level UI state (mobile nav drawer, etc.)
 *
 * Lives in the layout tree only. Page-level state (assumptions, scenario)
 * stays in zustand (lib/store). This is for ephemeral chrome state that
 * needs to be read/written across Sidebar, TopBar, Backdrop, etc.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type UIStateContextValue = {
  mobileNavOpen: boolean
  openMobileNav: () => void
  closeMobileNav: () => void
  toggleMobileNav: () => void
}

const UIStateContext = createContext<UIStateContextValue | null>(null)

export function UIStateProvider({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const openMobileNav = useCallback(() => setMobileNavOpen(true), [])
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])
  const toggleMobileNav = useCallback(() => setMobileNavOpen(v => !v), [])

  const value = useMemo<UIStateContextValue>(
    () => ({ mobileNavOpen, openMobileNav, closeMobileNav, toggleMobileNav }),
    [mobileNavOpen, openMobileNav, closeMobileNav, toggleMobileNav],
  )

  return <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>
}

export function useUIState() {
  const ctx = useContext(UIStateContext)
  if (!ctx) {
    throw new Error('useUIState must be used inside <UIStateProvider> (AppShell wraps everything)')
  }
  return ctx
}
