'use client'

import { useMemo } from 'react'
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line, ComposedChart, Legend
} from 'recharts'
import { useModelStore } from '@/lib/store'
import { calcRevenueMonth, calcAnnualPL, calcOverallBlendedRate, adjustAssumptionsForYear } from '@/lib/model'
import { fmtCurrency, fmtNumber, MONTH_LABELS } from '@/lib/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { TooltipInfo } from '@/components/ui/TooltipInfo'
import { getCitationById } from '@/lib/citations'

export default function RevenuePage() {
  const { assumptions } = useModelStore()

  // AUDIT 2026-04-24 C-8: iterate against Y1-adjusted assumptions so Y1 totals
  // reconcile with calcAnnualPL (which adjusts internally). Raw assumptions use
  // maxCapacityPerMonth=146 while adjusted Y1 uses ~86 (Base scenario).
  const adjY1 = useMemo(() => adjustAssumptionsForYear(1, assumptions), [assumptions])
  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => calcRevenueMonth(i + 1, adjY1)),
    [adjY1]
  )

  const blendedRate = useMemo(() => calcOverallBlendedRate(assumptions), [assumptions])

  const annuals = useMemo(() => ({
    y1: calcAnnualPL(1, assumptions),
    y2: calcAnnualPL(2, assumptions),
    y3: calcAnnualPL(3, assumptions),
  }), [assumptions])

  // AUDIT 2026-04-26 C-12: US Revenue added to the stack so the bars sum to
  // grossRevenue (was 2-bar stack of Medicare + Commercial that lied about
  // the total by ~6% pre-fix and by the US line on top of that post-fix).
  const chartData = useMemo(() => months.map((m, i) => ({
    month: MONTH_LABELS[i],
    medicare: m.medicareRevenue,
    commercial: m.commercialRevenue,
    us: m.usRevenue,
    blendedRate: m.procs > 0 ? Math.round(m.grossRevenue / m.procs) : 0,
  })), [months])

  const totalGross = months.reduce((s, m) => s + m.grossRevenue, 0)
  const totalProcs = months.reduce((s, m) => s + m.procs, 0)
  const avgPerMonth = totalGross / 12
  const avgPerProc = totalProcs > 0 ? totalGross / totalProcs : 0

  return (
    <div>
      <TopBar title="Revenue Projections" />
      <div className="p-6 space-y-6">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Y1 Total Gross Revenue" value={fmtCurrency(totalGross)} highlight />
          <KpiCard label="Avg Revenue / Month" value={fmtCurrency(avgPerMonth)} />
          <KpiCard label={<>Blended Rate / Procedure <TooltipInfo text={getCitationById('revenuePerProcedure')?.rationale ?? ''} href="/citations?highlight=revenuePerProcedure" /></>} value={fmtCurrency(blendedRate, false)} />
          <KpiCard label={<>Avg Revenue / Procedure <TooltipInfo text={getCitationById('revenuePerProcedure')?.rationale ?? ''} href="/citations?highlight=revenuePerProcedure" /></>} value={fmtCurrency(avgPerProc, false)} />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Monthly Revenue — Medicare / Commercial / US + Blended Rate</h2>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #374151', borderRadius: 8, fontSize: 12, color: '#ffffff' }}
                formatter={(v: unknown, name: unknown) => {
                  const num = v as number
                  const n = name as string
                  const labelMap: Record<string, string> = { medicare: 'Medicare', commercial: 'Commercial', us: 'US Revenue', blendedRate: 'Blended Rate' }
                  return [
                    n === 'blendedRate' ? `$${num.toLocaleString()}` : `$${(num / 1000).toFixed(1)}k`,
                    labelMap[n] ?? n,
                  ]
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              {/* AUDIT 2026-04-26 C-12: US Revenue added to stack so bars sum to grossRevenue */}
              <Bar yAxisId="left" dataKey="medicare" stackId="a" fill="#0ea5e9" radius={[0, 0, 0, 0]} name="Medicare" />
              <Bar yAxisId="left" dataKey="commercial" stackId="a" fill="#14b8a6" radius={[0, 0, 0, 0]} name="Commercial" />
              <Bar yAxisId="left" dataKey="us" stackId="a" fill="#a78bfa" radius={[3, 3, 0, 0]} name="US Revenue" />
              <Line yAxisId="right" type="monotone" dataKey="blendedRate" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Blended Rate" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Annual Comparison</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium">Metric</th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">Year 1</th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">Year 2</th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">Year 3</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Gross Revenue', vals: [annuals.y1.grossRevenue, annuals.y2.grossRevenue, annuals.y3.grossRevenue] },
                { label: 'Management Fee', vals: [annuals.y1.managementFee, annuals.y2.managementFee, annuals.y3.managementFee] },
                { label: 'Net Revenue', vals: [annuals.y1.netRevenue, annuals.y2.netRevenue, annuals.y3.netRevenue] },
                { label: 'Total Procedures', vals: [annuals.y1.totalProcs, annuals.y2.totalProcs, annuals.y3.totalProcs], isCount: true },
              ].map((row, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-5 py-3 text-gray-300">{row.label}</td>
                  {row.vals.map((v, j) => (
                    <td key={j} className={`px-5 py-3 text-right font-medium ${v < 0 ? 'text-red-400' : row.isCount ? 'text-blue-400' : 'text-emerald-400'}`}>
                      {row.isCount ? fmtNumber(v) : fmtCurrency(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Monthly Revenue Detail — Year 1</h2>
            {/* AUDIT 2026-04-26 C-12: US Revenue surfaced as own column so
                Medicare + Commercial + US Revenue = Gross Revenue. Pre-fix the
                first two omitted realization while gross applied it, leaving
                a ~6% reconciliation gap in the totals row. */}
            <p className="text-[11px] text-gray-400 mt-1">
              Medicare + Commercial = procedure revenue (post-realization). US Revenue is the 93970/93971 ultrasound line per treated patient. Sum reconciles to Gross.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">Month</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Procs</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Medicare Rev</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Commercial Rev</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">US Revenue</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Gross Revenue</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Mgmt Fee</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Net Revenue</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-2.5 text-gray-300 font-medium">{MONTH_LABELS[i]}</td>
                    <td className="px-4 py-2.5 text-right text-blue-400">{fmtNumber(m.procs)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtCurrency(m.medicareRevenue)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtCurrency(m.commercialRevenue)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtCurrency(m.usRevenue)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-400 font-semibold">{fmtCurrency(m.grossRevenue)}</td>
                    <td className="px-4 py-2.5 text-right text-red-400">{fmtCurrency(m.managementFee)}</td>
                    <td className="px-4 py-2.5 text-right text-white font-semibold">{fmtCurrency(m.netRevenue)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-800/30 font-semibold">
                  <td className="px-4 py-2.5 text-gray-200">Total Y1</td>
                  <td className="px-4 py-2.5 text-right text-blue-400">{fmtNumber(totalProcs)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtCurrency(months.reduce((s, m) => s + m.medicareRevenue, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtCurrency(months.reduce((s, m) => s + m.commercialRevenue, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtCurrency(months.reduce((s, m) => s + m.usRevenue, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-400">{fmtCurrency(totalGross)}</td>
                  <td className="px-4 py-2.5 text-right text-red-400">{fmtCurrency(months.reduce((s, m) => s + m.managementFee, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-white">{fmtCurrency(months.reduce((s, m) => s + m.netRevenue, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
