'use client'

import { Menu, X } from 'lucide-react'
import { useUIState } from './UIStateContext'

/**
 * Hamburger / close button that toggles the mobile nav drawer.
 * Visible only below the md breakpoint (≥768px shows the static sidebar).
 */
export function MobileMenuButton() {
  const { mobileNavOpen, toggleMobileNav } = useUIState()

  return (
    <button
      type="button"
      onClick={toggleMobileNav}
      aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
      aria-expanded={mobileNavOpen}
      aria-controls="mobile-nav-drawer"
      className="md:hidden touch-target -ml-2 mr-1 rounded-md text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors"
    >
      {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
    </button>
  )
}
