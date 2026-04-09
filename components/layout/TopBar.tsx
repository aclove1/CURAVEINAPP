'use client'

import { useModelStore } from '@/lib/store'
import type { Scenario } from '@/lib/types'

const SCENARIOS: { value: Scenario; label: string; color: string }[] = [
  { value: 'conservative', label: 'Conservative', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { value: 'base', label: 'Base', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  { value: 'aggressive', label: 'Aggressive', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
]

export function TopBar({ title }: { title: string }) {
  const { assumptions, setScenario } = useModelStore()
  const current = assumptions.scenario

  return (
    <header className="h-14 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-gray-100 font-semibold text-sm">{title}</h1>
      <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
        {SCENARIOS.map(({ value, label, color }) => (
          <button
            key={value}
            onClick={() => setScenario(value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
              current === value ? color : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  )
}
