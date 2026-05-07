'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, SlidersHorizontal, TrendingUp, DollarSign, Package, ChartBar as BarChart3, Activity, FileText, BookOpen } from 'lucide-react'

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

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-[100dvh] bg-gray-950 flex flex-col border-r border-gray-800">
      <Link href="/" className="px-6 py-6 border-b border-gray-800 block hover:bg-gray-900/40 transition-colors">
        <div className="flex items-center gap-3">
          <Image
            src="/branding/curavein-mark.png"
            alt="CuraVein logo"
            width={36}
            height={36}
            priority
            className="flex-shrink-0"
          />
          <div>
            <div className="text-white font-semibold text-base leading-none tracking-tight">
              CuraVein<span className="text-gray-400 text-[10px] ml-0.5 align-top">™</span>
            </div>
            <div className="text-[11px] mt-1" style={{ color: '#C26848' }}>Love Your Legs</div>
          </div>
        </div>
      </Link>

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
