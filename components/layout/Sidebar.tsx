'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, SlidersHorizontal, TrendingUp, DollarSign, Package, ChartBar as BarChart3, Activity, FileText } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scenario', label: 'Scenario Controls', icon: SlidersHorizontal },
  { href: '/funnel', label: 'DTC Funnel', icon: TrendingUp },
  { href: '/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/cogs', label: 'Supply Costs', icon: Package },
  { href: '/pl', label: 'P&L', icon: BarChart3 },
  { href: '/sensitivity', label: 'Sensitivity', icon: Activity },
  { href: '/cpt', label: 'CPT Revenue', icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-gray-950 flex flex-col border-r border-gray-800">
      <div className="px-6 py-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">CV</span>
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-none">CuraVein</div>
            <div className="text-gray-400 text-xs mt-0.5">Financial Model</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-teal-500/15 text-teal-400 font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              <Icon size={16} className={active ? 'text-teal-400' : 'text-gray-500'} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-6 py-4 border-t border-gray-800">
        <div className="text-xs text-gray-500">v1.0 · PE Grade Model</div>
      </div>
    </aside>
  )
}
