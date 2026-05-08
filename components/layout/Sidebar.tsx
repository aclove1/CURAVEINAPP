'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { LayoutDashboard, SlidersHorizontal, TrendingUp, DollarSign, Package, ChartBar as BarChart3, Activity, FileText, BookOpen } from 'lucide-react'
import { useUIState } from './UIStateContext'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scenario', label: 'Scenario Controls', icon: SlidersHorizontal },
  { href: '/funnel', label: 'DTC Funnel', icon: TrendingUp },
  { href: '/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/cogs', label: 'Supply Costs', icon: Package },
  { href: '/pl', label: 'P&L', icon: BarChart3 },
  { href: '/sensitivity', label: 'Sensitivity', icon: Activity },
  { href: '/cpt', label: 'CPT Revenue', icon: FileText },
  { href: '/citations', label: 'Citations', icon: BookOpen },
]

/**
 * Sidebar
 *
 * Below md (768px): renders as a fixed-position drawer that slides in from
 * the left. Closed by default. Tapping a nav link, the backdrop, or pressing
 * Esc closes it.
 *
 * At md and above: renders exactly as before — an in-flow `aside` element
 * that's part of the page's flex layout. No animation, always visible.
 *
 * The same component handles both modes via responsive Tailwind classes,
 * so there's a single nav source of truth.
 */
export function Sidebar() {
  const pathname = usePathname()
  const { mobileNavOpen, closeMobileNav } = useUIState()

  // Close drawer on Esc (mobile only)
  useEffect(() => {
    if (!mobileNavOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileNav()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileNavOpen, closeMobileNav])

  // Lock body scroll when drawer is open on mobile so the page beneath
  // doesn't scroll under the open menu
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (mobileNavOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [mobileNavOpen])

  return (
    <aside
      id="mobile-nav-drawer"
      role="navigation"
      aria-label="Primary"
      // Mobile: fixed-position drawer with translate animation (z-40 above backdrop's z-30)
      // Desktop (md+): static sidebar in normal flow
      className={`
        bg-gray-950 flex flex-col border-r border-gray-800 w-64
        fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-out
        md:static md:translate-x-0 md:transition-none
        min-h-[100dvh]
        ${mobileNavOpen ? 'translate-x-0 shadow-2xl shadow-black/50' : '-translate-x-full'}
      `}
    >
      <Link
        href="/"
        onClick={closeMobileNav}
        className="px-6 py-6 border-b border-gray-800 block hover:bg-gray-900/40 transition-colors"
      >
        <div className="flex items-center justify-center">
          <Image
            src="/branding/curavein-logo.svg"
            alt="CuraVein"
            width={1103}
            height={476}
            priority
            className="w-full h-auto"
          />
        </div>
      </Link>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={closeMobileNav}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors min-h-[44px] ${
                active
                  ? 'bg-teal-500/15 text-teal-400 font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              <Icon size={16} className={active ? 'text-teal-400' : 'text-gray-400'} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-6 py-4 border-t border-gray-800">
        <div className="text-xs text-gray-400">v1.0 · PE Grade Model</div>
      </div>
    </aside>
  )
}
