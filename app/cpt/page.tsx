'use client'

import { useMemo, useState } from 'react'
import { useModelStore } from '@/lib/store'
import { calcOverallBlendedRate } from '@/lib/model'
import { fmtCurrency, fmtPct } from '@/lib/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { TooltipInfo } from '@/components/ui/TooltipInfo'
import { getCitationById } from '@/lib/citations'
import { CPT_CODES } from '@/lib/defaults'

type CapacityLevel = '50' | '100'

export default function CPTPage() {
  const { assumptions } = useModelStore()
  const [capacity, setCapacity] = useState<CapacityLevel>('100')

  const blendedRate = useMemo(() => calcOverallBlendedRate(assumptions), [assumptions])

  const [editCounts, setEditCounts] = useState<Record<string, { at50: number; at100: number }>>({})

  const getCount = (code: string, level: CapacityLevel) => {
    const overrides = editCounts[code]
    const base = CPT_CODES.find((c) => c.code === code)!
    if (level === '50') return overrides?.at50 ?? base.countAt50
    return overrides?.at100 ?? base.countAt100
  }

  const procedureCodes = CPT_CODES.filter((c) => c.category === 'procedure')
  const emCodes = CPT_CODES.filter((c) => c.category === 'em')

  function calcRevenue(code: string, level: CapacityLevel, medicareRate: number) {
    const count = getCount(code, level)
    const adjRate = medicareRate * (assumptions.medicareMix + assumptions.commercialMix * assumptions.commercialMultiplier.base)
    return Math.round(count * adjRate * 12)
  }

  const totalProcRev = procedureCodes.reduce((s, c) => s + calcRevenue(c.code, capacity, c.medicareRate), 0)
  const totalEmRev = emCodes.reduce((s, c) => s + calcRevenue(c.code, capacity, c.medicareRate), 0)
  const totalRev = totalProcRev + totalEmRev

  function EditableCount({ code, level }: { code: string; level: CapacityLevel }) {
    const [editing, setEditing] = useState(false)
    const [raw, setRaw] = useState('')
    const count = getCount(code, level)

    return editing ? (
      <input
        autoFocus
        className="w-16 bg-gray-800 border border-blue-500 rounded px-1 py-0.5 text-blue-400 text-sm text-center outline-none"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          const parsed = parseInt(raw)
          if (!isNaN(parsed)) {
            setEditCounts((prev) => ({
              ...prev,
              [code]: { ...prev[code], [level === '50' ? 'at50' : 'at100']: parsed },
            }))
          }
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    ) : (
      <span
        className="text-blue-400 cursor-pointer hover:underline font-mono text-sm"
        onClick={() => { setRaw(count.toString()); setEditing(true) }}
      >
        {count}
      </span>
    )
  }

  function CodeTable({ codes, title }: { codes: typeof CPT_CODES; title: string }) {
    const totalRev = codes.reduce((s, c) => s + calcRevenue(c.code, capacity, c.medicareRate), 0)
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200">{title}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">CPT Code</th>
                <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">Description</th>
                <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">95-Day Count</th>
                <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Mix %</th>
                <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Medicare Rate</th>
                <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Adj Rate</th>
                <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Annual Revenue</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const adjRate = Math.round(c.medicareRate * (assumptions.medicareMix + assumptions.commercialMix * assumptions.commercialMultiplier.base))
                const annualRev = calcRevenue(c.code, capacity, c.medicareRate)
                return (
                  <tr key={c.code} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-2.5 font-mono text-teal-400 font-semibold">{c.code}</td>
                    <td className="px-4 py-2.5 text-gray-300">{c.description}</td>
                    <td className="px-4 py-2.5 text-right">
                      <EditableCount code={c.code} level={capacity} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{fmtPct(c.mixPct)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtCurrency(c.medicareRate, false)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-200">{fmtCurrency(adjRate, false)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-400 font-semibold">{fmtCurrency(annualRev)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-800/30">
                <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-gray-200">Subtotal</td>
                <td className="px-4 py-3 text-right text-emerald-400 font-bold">{fmtCurrency(totalRev)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="CPT Revenue Detail" />
      <div className="p-6 space-y-6">

        <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1 w-fit border border-gray-800">
          {([['50', '50% Capacity'], ['100', '100% Capacity']] as [CapacityLevel, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setCapacity(v)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                capacity === v ? 'bg-teal-500/20 text-teal-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Procedure Revenue" value={fmtCurrency(totalProcRev)} highlight />
          <KpiCard label="Total E&M Revenue" value={fmtCurrency(totalEmRev)} />
          <KpiCard label="Combined Annual Revenue" value={fmtCurrency(totalRev)} highlight />
          <KpiCard label={<>Blended Rate / Procedure <TooltipInfo text={getCitationById('revenuePerProcedure')?.rationale ?? ''} href="/citations?highlight=revenuePerProcedure" /></>} value={fmtCurrency(blendedRate, false)} />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400">
            <span className="text-blue-400 font-medium">Blue values</span> are editable. Click any count to modify. Counts represent 95-day billing cycles × 4 = annual volume. Revenue is adjusted for payer mix ({fmtPct(assumptions.medicareMix)} Medicare / {fmtPct(assumptions.commercialMix)} Commercial at {assumptions.commercialMultiplier.base}x multiplier).
          </p>
        </div>

        <CodeTable codes={procedureCodes} title="Procedure CPT Codes" />
        <CodeTable codes={emCodes} title="E&M CPT Codes" />

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex justify-between items-center">
            <span className="text-base font-bold text-gray-100">Total Annual CPT Revenue ({capacity}% Capacity)</span>
            <span className="text-2xl font-bold text-emerald-400">{fmtCurrency(totalRev)}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-4 pt-3 border-t border-gray-800">
            <div className="text-center">
              <div className="text-xs text-gray-400">Procedure CPTs</div>
              <div className="text-lg font-semibold text-white mt-1">{fmtCurrency(totalProcRev)}</div>
              <div className="text-xs text-gray-400">{fmtPct(totalProcRev / totalRev)} of total</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">E&M CPTs</div>
              <div className="text-lg font-semibold text-white mt-1">{fmtCurrency(totalEmRev)}</div>
              <div className="text-xs text-gray-400">{fmtPct(totalEmRev / totalRev)} of total</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Capacity</div>
              <div className="text-lg font-semibold text-teal-400 mt-1">{capacity}%</div>
              <div className="text-xs text-gray-400">{capacity === '50' ? `${assumptions.maxCapacityPerMonth / 2} procs/mo` : `${assumptions.maxCapacityPerMonth} procs/mo`}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
