'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Line, ComposedChart
} from 'recharts'
import { useModelStore } from '@/lib/store'
import { calcPLMonth, calcAnnualPL, calcOpexMonth } from '@/lib/model'
import { fmtCurrency, fmtPct, MONTH_LABELS } from '@/lib/formatters'
import { TopBar } from '@/components/layout/TopBar'

type ViewMode = 'monthly' | 'annual'

function PLCell({ value, color }: { value: number; color?: string }) {
  const display = value === 0 ? '—' : value < 0 ? `(${fmtCurrency(-value, false)})` : fmtCurrency(value, false)
  const cls = value < 0 ? 'text-red-400' : color ?? 'text-white'
  return <td className={`px-4 py-2.5 text-right font-mono text-sm ${cls}`}>{display}</td>
}

export default function PLPage() {
  const { assumptions } = useModelStore()
  const [view, setView] = useState<ViewMode>('monthly')

  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => calcPLMonth(i + 1, assumptions)),
    [assumptions]
  )

  const opexMonths = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => calcOpexMonth(i + 1, assumptions)),
    [assumptions]
  )

  const annuals = useMemo(() => ({
    y1: calcAnnualPL(1, assumptions),
    y2: calcAnnualPL(2, assumptions),
    y3: calcAnnualPL(3, assumptions),
  }), [assumptions])

  const monthlyChartData = useMemo(() => months.map((m, i) => ({
    month: MONTH_LABELS[i],
    'Net Revenue': m.netRevenue,
    'Gross Profit': m.grossProfit,
    'EBITDA': m.ebitda,
  })), [months])

  const annualChartData = useMemo(() => [
    { year: 'Year 1', revenue: annuals.y1.grossRevenue, ebitda: annuals.y1.ebitda, margin: annuals.y1.ebitdaMargin * 100 },
    { year: 'Year 2', revenue: annuals.y2.grossRevenue, ebitda: annuals.y2.ebitda, margin: annuals.y2.ebitdaMargin * 100 },
    { year: 'Year 3', revenue: annuals.y3.grossRevenue, ebitda: annuals.y3.ebitda, margin: annuals.y3.ebitdaMargin * 100 },
  ], [annuals])

  const totals = {
    grossRevenue: months.reduce((s, m) => s + m.grossRevenue, 0),
    managementFee: months.reduce((s, m) => s + m.managementFee, 0),
    netRevenue: months.reduce((s, m) => s + m.netRevenue, 0),
    totalCOGS: months.reduce((s, m) => s + m.totalCOGS, 0),
    grossProfit: months.reduce((s, m) => s + m.grossProfit, 0),
    totalOpex: months.reduce((s, m) => s + m.totalOpex, 0),
    ebitda: months.reduce((s, m) => s + m.ebitda, 0),
    personnel: opexMonths.reduce((s, m) => s + m.personnelTotal, 0),
    marketing: opexMonths.reduce((s, m) => s + m.marketing, 0),
    rent: opexMonths.reduce((s, m) => s + m.rent, 0),
  }

  return (
    <div>
      <TopBar title="P&L Statement" />
      <div className="p-6 space-y-6">

        <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1 w-fit border border-gray-800">
          {(['monthly', 'annual'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                view === v ? 'bg-teal-500/20 text-teal-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {v === 'monthly' ? 'Monthly Y1' : '3-Year Annual'}
            </button>
          ))}
        </div>

        {view === 'monthly' ? (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Monthly P&L Waterfall</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyChartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: unknown) => [`$${((v as number) / 1000).toFixed(1)}k`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                  <Bar dataKey="Net Revenue" fill="#14b8a6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Gross Profit" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="EBITDA" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-300">Monthly P&L Detail</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium w-48">Line Item</th>
                      {MONTH_LABELS.map((m) => (
                        <th key={m} className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">{m}</th>
                      ))}
                      <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Gross Revenue', key: 'grossRevenue', color: 'text-emerald-400', bold: false },
                      { label: 'Management Fee', key: 'managementFee', color: 'text-red-400', bold: false },
                      { label: 'Net Revenue', key: 'netRevenue', color: 'text-emerald-300', bold: true },
                      { label: 'Total COGS', key: 'totalCOGS', color: 'text-orange-400', bold: false },
                      { label: 'Gross Profit', key: 'grossProfit', color: 'text-blue-400', bold: true },
                      { label: 'Total OpEx', key: 'totalOpex', color: 'text-blue-300', bold: false },
                      { label: 'EBITDA', key: 'ebitda', color: '', bold: true },
                    ].map((row) => (
                      <tr key={row.key} className={`border-b border-gray-800/50 ${row.bold ? 'bg-gray-800/20' : 'hover:bg-gray-800/10'}`}>
                        <td className={`px-4 py-2.5 text-sm ${row.bold ? 'font-semibold text-gray-100' : 'text-gray-300'}`}>{row.label}</td>
                        {months.map((m, i) => {
                          const v = m[row.key as keyof typeof m] as number
                          return <PLCell key={i} value={v} color={row.color || undefined} />
                        })}
                        <PLCell value={totals[row.key as keyof typeof totals] as number} color={row.color || undefined} />
                      </tr>
                    ))}
                    <tr className="border-b border-gray-800/50 hover:bg-gray-800/10">
                      <td className="px-4 py-2.5 text-sm text-gray-400">EBITDA Margin</td>
                      {months.map((m, i) => (
                        <td key={i} className="px-4 py-2.5 text-right text-xs text-gray-400">{fmtPct(m.ebitdaMargin)}</td>
                      ))}
                      <td className="px-4 py-2.5 text-right text-xs text-gray-400">{fmtPct(totals.netRevenue > 0 ? totals.ebitda / totals.netRevenue : 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">3-Year Revenue vs EBITDA + Margin</h2>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={annualChartData} barCategoryGap="40%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} domain={[-30, 50]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: unknown, name: unknown) => {
                      const num = v as number
                      return [name === 'margin' ? `${num.toFixed(1)}%` : `$${(num / 1000).toFixed(0)}k`, name as string]
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                  <Bar yAxisId="left" dataKey="revenue" fill="#14b8a6" radius={[3, 3, 0, 0]} name="Revenue" />
                  <Bar yAxisId="left" dataKey="ebitda" fill="#f59e0b" radius={[3, 3, 0, 0]} name="EBITDA" />
                  <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="EBITDA Margin %" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-300">3-Year P&L Summary</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium w-56">Line Item</th>
                    <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">Year 1</th>
                    <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">Year 2</th>
                    <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">Year 3</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Gross Revenue', key: 'grossRevenue', color: 'text-emerald-400' },
                    { label: 'Management Fee', key: 'managementFee', color: 'text-red-400' },
                    { label: 'Net Revenue', key: 'netRevenue', color: 'text-emerald-300', bold: true },
                    { label: 'Total COGS', key: 'totalCOGS', color: 'text-orange-400' },
                    { label: 'Gross Profit', key: 'grossProfit', color: 'text-blue-400', bold: true },
                    { label: 'Total OpEx', key: 'totalOpex', color: 'text-blue-300' },
                    { label: 'EBITDA', key: 'ebitda', color: 'text-yellow-400', bold: true },
                  ].map((row) => {
                    const vals = [annuals.y1, annuals.y2, annuals.y3].map((a) => a[row.key as keyof typeof a] as number)
                    return (
                      <tr key={row.key} className={`border-b border-gray-800/50 ${row.bold ? 'bg-gray-800/20' : 'hover:bg-gray-800/10'}`}>
                        <td className={`px-5 py-3 ${row.bold ? 'font-semibold text-gray-100' : 'text-gray-300'}`}>{row.label}</td>
                        {vals.map((v, i) => <PLCell key={i} value={v} color={row.color} />)}
                      </tr>
                    )
                  })}
                  <tr className="border-b border-gray-800/50">
                    <td className="px-5 py-3 text-gray-400 text-sm">EBITDA Margin</td>
                    {[annuals.y1, annuals.y2, annuals.y3].map((a, i) => (
                      <td key={i} className="px-4 py-3 text-right text-sm text-gray-400">{fmtPct(a.ebitdaMargin)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
