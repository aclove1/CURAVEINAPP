'use client'

import { useUIState } from './UIStateContext'

/**
 * Translucent overlay that appears behind the mobile nav drawer.
 * Tapping it closes the drawer. Only rendered below md.
 */
export function Backdrop() {
  const { mobileNavOpen, closeMobileNav } = useUIState()

  return (
    <div
      onClick={closeMobileNav}
      aria-hidden="true"
      className={`md:hidden fixed inset-0 z-30 bg-gray-950/70 backdrop-blur-sm transition-opacity duration-200 ${
        mobileNavOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    />
  )
}
