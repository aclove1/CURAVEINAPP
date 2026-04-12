'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useModelStore } from '@/lib/store'
import { calcKeyMetrics, calcAnnualPL } from '@/lib/model'
import { fmtCurrency, fmtNumber, fmtDecimal, fmtPct } from '@/lib/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { TooltipInfo } from '@/components/ui/TooltipInfo'

const EBITDA_TOOLTIPS: Record<string, string> = {
  'Year 1': 'Ramp year \u2014 funnel building, below capacity',
  'Year 2': 'Stabilization \u2014 conversion rates improve 10% YoY',
  'Year 3': 'Maturity \u2014 conversion rates improve additional 15% YoY',
}

function EbitdaTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const yearNote = label ? EBITDA_TOOLTIPS[label] : ''
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <div className="text-gray-400 mb-1">{label}</div>
      <div className="text-white font-medium">{fmtCurrency(payload[0].value)}</div>
      {yearNote && <div className="text-gray-500 mt-1 text-[10px]">{yearNote}</div>}
    </div>
  )
}

const SLIDER_TOOLTIPS: Record<string, { text: string; citationId: string }> = {
  contactRate: { text: 'Phone leads convert 25\u201340%', citationId: 'contactRate' },
  bookingRate: { text: 'Vein campaigns ~54% booking rate', citationId: 'bookingRate' },
  showRate: { text: 'National no-show 18\u201325%', citationId: 'showRate' },
  treatmentConversion: { text: 'Elective conversion 41\u201360%', citationId: 'treatmentRate' },
}

const SLIDERS = [
  { label: 'Contact Rate', field: 'contactRate' as const, min: 0.10, max: 0.70, step: 0.01 },
  { label: 'Booking Rate', field: 'bookingRate' as const, min: 0.20, max: 0.80, step: 0.01 },
  { label: 'Show Rate', field: 'showRate' as const, min: 0.40, max: 0.90, step: 0.01 },
  { label: 'Treatment Conversion', field: 'treatmentConversion' as const, min: 0.30, max: 0.80, step: 0.01 },
]

export default function DashboardPage() {
  const { assumptions, updateAssumption } = useModelStore()
  const metrics = useMemo(() => calcKeyMetrics(assumptions), [assumptions])

  const chartData = useMemo(() => [
    { year: 'Year 1', ebitda: calcAnnualPL(1, assumptions).ebitda },
    { year: 'Year 2', ebitda: calcAnnualPL(2, assumptions).ebitda },
    { year: 'Year 3', ebitda: calcAnnualPL(3, assumptions).ebitda },
  ], [assumptions])

  const breakevenLabel = metrics.breakevenMonth
    ? metrics.breakevenMonth <= 12
      ? `Month ${metrics.breakevenMonth} (Y1)`
      : `Month ${metrics.breakevenMonth} (Y${Math.ceil(metrics.breakevenMonth / 12)})`
    : 'Not within 3 years'

  return (
    <div>
      <TopBar title="Dashboard — Key Metrics Snapshot" />
      <div className="p-6 space-y-6">

        <a
          href="https://curavein.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
          style={{ backgroundColor: '#5faaa6' }}
        >
          CuraVein&trade; Referral Financial Model
        </a>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#5faaa6] mb-4">Conversion Rate Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {SLIDERS.map(({ label, field, min, max, step }) => {
              const vals = assumptions[field] as { conservative: number; base: number; aggressive: number }
              const current = vals[assumptions.scenario]
              const tip = SLIDER_TOOLTIPS[field]
              return (
                <div key={field}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-gray-400">
                      {label}
                      {tip && <TooltipInfo text={tip.text} href={`/citations?highlight=${tip.citationId}`} />}
                    </span>
                    <span className="text-xs font-mono text-[#5faaa6]">{fmtPct(current)}</span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={current}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      updateAssumption(field, { ...vals, [assumptions.scenario]: v })
                    }}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-700 accent-[#5faaa6]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                    <span>{(min * 100).toFixed(0)}%</span>
                    <span>{(max * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard label="Avg Monthly Procedures" value={fmtDecimal(metrics.avgMonthlyProcs, 1)} sub="Y1 average" />
          <KpiCard label={<>Revenue / Procedure <TooltipInfo text="Derived from competitor fee schedule weighted by procedure volume mix across RFA, VenaSeal, Varithena, and ultrasound CPT codes" href="#" /></>} value={fmtCurrency(metrics.revenuePerProc, false)} sub="Gross blended" />
          <KpiCard label={<>COGS / Procedure <TooltipInfo text="VenaSeal (~$800 supply cost) + RF consumables (~$200) + misc consumables (~$100), blended by procedure mix" href="/citations?highlight=cogsPerProcedure" /></>} value={fmtCurrency(metrics.cogsPerProc, false)} sub="Supply costs" />
          <KpiCard label="Stabilized Monthly EBITDA" value={fmtCurrency(metrics.stabilizedMonthlyEbitda)} sub="Month 12" highlight={metrics.stabilizedMonthlyEbitda > 0} />
          <KpiCard label="Revenue / Patient" value={fmtCurrency(metrics.revenuePerPatient, false)} sub="Gross" />
          <KpiCard label="Cost Per Acquisition" value={fmtCurrency(metrics.costPerAcquisition, false)} sub="Marketing / treated" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">3-Year EBITDA Trajectory</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="40%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<EbitdaTooltip />} cursor={{ fill: '#1f2937' }} />
                <Bar dataKey="ebitda" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-300">Breakeven Analysis</h2>
            {[
              { label: 'Monthly Breakeven (procedures)', value: fmtNumber(metrics.breakevenProcs), accent: false },
              { label: 'Projected Breakeven', value: breakevenLabel, accent: true },
              { label: 'Y1 Total Revenue', value: fmtCurrency(metrics.y1TotalRevenue), accent: false },
              { label: 'Y2 Total Revenue', value: fmtCurrency(metrics.y2TotalRevenue), accent: false },
              { label: 'Y3 Total Revenue', value: fmtCurrency(metrics.y3TotalRevenue), accent: false },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <span className="text-sm text-gray-400">{item.label}</span>
                <span className={`font-semibold text-sm ${item.accent ? 'text-teal-400' : 'text-white'}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">3-Year Summary</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium">Metric</th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">
                  Year 1 <TooltipInfo text="Ramp year \u2014 funnel building, below capacity" href="#" />
                </th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">
                  Year 2 <TooltipInfo text="Stabilization \u2014 conversion rates improve 10% YoY" href="#" />
                </th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">
                  Year 3 <TooltipInfo text="Maturity \u2014 conversion rates improve additional 15% YoY" href="#" />
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Gross Revenue', vals: [metrics.y1TotalRevenue, metrics.y2TotalRevenue, metrics.y3TotalRevenue], fmt: fmtCurrency },
                { label: 'EBITDA', vals: [metrics.y1Ebitda, metrics.y2Ebitda, metrics.y3Ebitda], fmt: fmtCurrency },
                { label: 'Total Procedures (Y1)', vals: [metrics.y1TotalProcs, null, null], fmt: (v: number | null) => v === null ? '\u2014' : fmtNumber(v) },
              ].map((row, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-5 py-3 text-gray-300">{row.label}</td>
                  {row.vals.map((v, j) => (
                    <td key={j} className={`px-5 py-3 text-right font-medium ${v !== null && v < 0 ? 'text-red-400' : 'text-white'}`}>
                      {v === null ? '\u2014' : row.fmt(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
