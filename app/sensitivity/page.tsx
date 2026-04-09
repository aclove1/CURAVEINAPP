'use client'

import { useMemo } from 'react'
import { useModelStore } from '@/lib/store'
import { calcFunnelMonth } from '@/lib/model'
import { TopBar } from '@/components/layout/TopBar'

function heatColor(procs: number): string {
  if (procs <= 0) return '#1f2937'
  if (procs < 30) return '#7f1d1d'
  if (procs < 50) return '#92400e'
  if (procs < 70) return '#78350f'
  if (procs < 90) return '#064e3b'
  return '#065f46'
}

function textColor(procs: number): string {
  if (procs <= 0) return '#6b7280'
  return '#f9fafb'
}

interface HeatmapTableProps {
  title: string
  subtitle: string
  rowLabel: string
  colLabel: string
  rowValues: number[]
  colValues: number[]
  compute: (row: number, col: number) => number
  rowFmt: (v: number) => string
  colFmt: (v: number) => string
}

function HeatmapTable({ title, subtitle, rowLabel, colLabel, rowValues, colValues, compute, rowFmt, colFmt }: HeatmapTableProps) {
  const data = useMemo(
    () => rowValues.map((r) => colValues.map((c) => compute(r, c))),
    [rowValues, colValues, compute]
  )

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-200">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="text-left pr-3 pb-2 text-gray-500 font-medium" style={{ minWidth: 100 }}>
                {rowLabel} / {colLabel}
              </th>
              {colValues.map((c) => (
                <th key={c} className="text-center pb-2 text-gray-400 font-medium" style={{ minWidth: 64 }}>
                  {colFmt(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowValues.map((r, ri) => (
              <tr key={r}>
                <td className="text-right pr-3 py-1 text-gray-400 font-medium">{rowFmt(r)}</td>
                {colValues.map((c, ci) => {
                  const procs = data[ri][ci]
                  return (
                    <td
                      key={c}
                      className="text-center py-1 px-1"
                    >
                      <div
                        className="rounded px-2 py-1.5 font-mono font-semibold text-center"
                        style={{ background: heatColor(procs), color: textColor(procs) }}
                      >
                        {procs > 0 ? procs : '—'}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-800">
          <span className="text-xs text-gray-500">Procedures/month:</span>
          {[
            { color: '#7f1d1d', label: '< 30' },
            { color: '#92400e', label: '30–50' },
            { color: '#78350f', label: '50–70' },
            { color: '#064e3b', label: '70–90' },
            { color: '#065f46', label: '90+' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ background: item.color }} />
              <span className="text-xs text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SensitivityPage() {
  const { assumptions } = useModelStore()

  const funnelBase = useMemo(() => calcFunnelMonth(12, assumptions), [assumptions])

  const table1Rows = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80]
  const table1Cols = [0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75]

  const computeTable1 = useMemo(() => (contactRate: number, treatmentConv: number): number => {
    const leads = funnelBase.leads
    const contacts = Math.floor(leads * contactRate)
    const booked = Math.floor(contacts * assumptions.bookingRate.base)
    const shows = Math.floor(booked * assumptions.showRate.base)
    const treated = Math.floor(shows * treatmentConv)
    const rawProcs = Math.round(treated * assumptions.procsPerPatient.base)
    return Math.min(rawProcs, assumptions.maxCapacityPerMonth)
  }, [funnelBase.leads, assumptions])

  const table2Rows = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80]
  const table2Cols = [0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90]

  const computeTable2 = useMemo(() => (bookingRate: number, showRate: number): number => {
    const leads = funnelBase.leads
    const contacts = Math.floor(leads * assumptions.contactRate.base)
    const booked = Math.floor(contacts * bookingRate)
    const shows = Math.floor(booked * showRate)
    const treated = Math.floor(shows * assumptions.treatmentConversion.base)
    const rawProcs = Math.round(treated * assumptions.procsPerPatient.base)
    return Math.min(rawProcs, assumptions.maxCapacityPerMonth)
  }, [funnelBase.leads, assumptions])

  const table3Rows = [30, 40, 50, 60, 70, 80]
  const table3Cols = [8000, 10000, 12000, 14000, 16000, 18000, 20000]

  const computeTable3 = useMemo(() => (cpl: number, spend: number): number => {
    const leads = Math.floor(spend / cpl)
    const contacts = Math.floor(leads * assumptions.contactRate.base)
    const booked = Math.floor(contacts * assumptions.bookingRate.base)
    const shows = Math.floor(booked * assumptions.showRate.base)
    const treated = Math.floor(shows * assumptions.treatmentConversion.base)
    const rawProcs = Math.round(treated * assumptions.procsPerPatient.base)
    return Math.min(rawProcs, assumptions.maxCapacityPerMonth)
  }, [assumptions])

  return (
    <div>
      <TopBar title="Sensitivity Analysis" />
      <div className="p-6 space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">
            All tables show <strong className="text-gray-200">monthly procedures</strong> at Month 12 (stabilized) across varying input assumptions.
            Color scale: <span className="text-red-400">red</span> = below 30 · <span className="text-amber-400">amber</span> = 30–70 · <span className="text-emerald-400">green</span> = 70+ procedures.
          </p>
        </div>

        <HeatmapTable
          title="Table 1: Contact Rate × Treatment Conversion → Procedures"
          subtitle="Booking rate & show rate held at base scenario values"
          rowLabel="Contact Rate"
          colLabel="Treatment Conv"
          rowValues={table1Rows}
          colValues={table1Cols}
          compute={computeTable1}
          rowFmt={(v) => `${(v * 100).toFixed(0)}%`}
          colFmt={(v) => `${(v * 100).toFixed(0)}%`}
        />

        <HeatmapTable
          title="Table 2: Booking Rate × Show Rate → Procedures"
          subtitle="Contact rate & treatment conversion held at base scenario values"
          rowLabel="Booking Rate"
          colLabel="Show Rate"
          rowValues={table2Rows}
          colValues={table2Cols}
          compute={computeTable2}
          rowFmt={(v) => `${(v * 100).toFixed(0)}%`}
          colFmt={(v) => `${(v * 100).toFixed(0)}%`}
        />

        <HeatmapTable
          title="Table 3: CPL × Monthly Marketing Spend → Procedures"
          subtitle="Funnel conversion rates held at base scenario; all other assumptions held constant"
          rowLabel="CPL ($)"
          colLabel="Mktg Spend ($)"
          rowValues={table3Rows}
          colValues={table3Cols}
          compute={computeTable3}
          rowFmt={(v) => `$${v}`}
          colFmt={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
      </div>
    </div>
  )
}
