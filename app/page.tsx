'use client'

import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useModelStore, useV10Results } from '@/lib/store'
import { fmtCurrency, fmtNumber, fmtDecimal, fmtPct } from '@/lib/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { TooltipInfo } from '@/components/ui/TooltipInfo'
import { SCENARIOS, type ScenarioKey } from '@/lib/scenarioData'
import { calcAnnualPL } from '@/lib/model'
import type { Scenario } from '@/lib/types'

const EBITDA_TOOLTIPS: Record<string, string> = {
  'Year 1': 'Ramp year \u2014 funnel building, below capacity',
  'Year 2': 'Stabilization \u2014 conversion rates improve YoY',
  'Year 3': 'Maturity \u2014 full payer credentialing, referral network scaled',
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

function DemandTooltip({ active, payload, label, cap }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; cap: number }) {
  if (!active || !payload?.length) return null
  const raw = payload.find(p => p.name === 'Market Demand')?.value ?? 0
  const excess = Math.max(0, raw - cap)
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs space-y-1">
      <div className="text-gray-400 font-medium mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <span className="text-white font-medium">{p.value}</span></div>
      ))}
      {excess > 0 && (
        <div className="text-red-400 font-semibold border-t border-gray-700 pt-1 mt-1">
          Excess demand: +{excess} procs/mo (waitlisted)
        </div>
      )}
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
  const { assumptions, updateAssumption, activeV10Scenario, setV10Scenario } = useModelStore()
  const v10 = useV10Results()

  // ── v12 Excel-aligned P&L widget (calcAnnualPL) ──────────────────────
  // Maps the dashboard's v10 scenario button to the Assumptions 3-tier enum
  // so the widget reacts to Downside / Conservative-Base clicks without
  // mutating global state. Rest of dashboard continues to read from v10
  // until AUDIT.md C-4 (dashboard engine consolidation) is scoped.
  const widgetScenario: Scenario =
    activeV10Scenario === 'downside' ? 'conservative' : 'base'
  const widgetAssumptions = useMemo(
    () => ({ ...assumptions, scenario: widgetScenario }),
    [assumptions, widgetScenario],
  )
  const pl1 = useMemo(() => calcAnnualPL(1, widgetAssumptions), [widgetAssumptions])
  const pl2 = useMemo(() => calcAnnualPL(2, widgetAssumptions), [widgetAssumptions])
  const pl3 = useMemo(() => calcAnnualPL(3, widgetAssumptions), [widgetAssumptions])

  const y1Rev = v10.y1.grossRevenue
  const y2Rev = v10.y2.grossRevenue
  const y3Rev = v10.y3.grossRevenue

  const chartData = [
    { year: 'Year 1', ebitda: y1Rev },
    { year: 'Year 2', ebitda: y2Rev },
    { year: 'Year 3', ebitda: y3Rev },
  ]

  const y1Procs = v10.y1.annualProcs
  const matureRate = v10.y2.blendedRate
  const monthsAtCap = v10.y1Months.filter(m => m.utilizationPct >= 1).length

  const totalMarketing = v10.y1Months.reduce((s, m) => s + m.marketingSpend, 0)
  const totalTreated = v10.y1Months.reduce((s, m) => s + m.treatedPatients, 0)
  const cpa = totalTreated > 0 ? totalMarketing / totalTreated : 0
  const revPerProc = y1Procs > 0 ? y1Rev / y1Procs : 0
  const revPerPatient = v10.scenario.procsPerPatient > 0 ? revPerProc * v10.scenario.procsPerPatient : 0

  const demandChartData = v10.y1Months.map(m => ({
    month: m.month,
    'Market Demand': m.rawProcs,
    'Actual Procs': m.totalProcs,
    excess: Math.max(0, m.rawProcs - v10.scenario.maxCapacityPerMonth),
  }))

  // Funnel bridge
  const bridge = useMemo(() => {
    const ms = v10.y1Months
    const leads = ms.reduce((s, m) => s + m.leads, 0)
    const contacts = ms.reduce((s, m) => s + m.contacts, 0)
    const booked = ms.reduce((s, m) => s + m.booked, 0)
    const shows = ms.reduce((s, m) => s + m.shows, 0)
    const treated = ms.reduce((s, m) => s + m.treatedPatients, 0)
    const procs = ms.reduce((s, m) => s + m.totalProcs, 0)
    const rev = ms.reduce((s, m) => s + m.grossRevenue, 0)
    return { leads, contacts, booked, shows, treated, procs, rev }
  }, [v10.y1Months])

  return (
    <div>
      <TopBar title="Dashboard — Key Metrics Snapshot" />
      <div className="p-6 space-y-6">

        <div className="flex items-center gap-4">
          <a
            href="https://curavein.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: '#5faaa6' }}
          >
            CuraVein&trade; Flagship Proforma
          </a>

          {/* V10 Scenario Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Scenario:</span>
            {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setV10Scenario(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeV10Scenario === key
                    ? 'bg-[#5faaa6] text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {SCENARIOS[key].label}
              </button>
            ))}
          </div>
        </div>

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

          {/* v12 — Excel-aligned P&L at currently-selected scenario */}
          <div className="mt-5 pt-5 border-t border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                3-Year P&amp;L at current sliders · Excel-aligned
              </h3>
              <span className="text-[10px] text-gray-500">
                scenario: <span className="text-[#5faaa6]">{widgetScenario}</span>
                {' · '}engine: <span className="font-mono">calcAnnualPL</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {([
                { label: 'Year 1', pl: pl1 },
                { label: 'Year 2', pl: pl2 },
                { label: 'Year 3', pl: pl3 },
              ] as const).map(({ label, pl }) => (
                <div key={label} className="bg-gray-950/60 border border-gray-800 rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">{label}</div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-gray-400">Gross Revenue</span>
                    <span className="text-sm font-mono text-white tabular-nums">{fmtCurrency(pl.grossRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-[11px] text-gray-400">EBITDA</span>
                    <span className={`text-sm font-mono tabular-nums ${pl.ebitda < 0 ? 'text-red-400' : 'text-[#5faaa6]'}`}>
                      {fmtCurrency(pl.ebitda)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline mt-0.5">
                    <span className="text-[10px] text-gray-500">margin</span>
                    <span className={`text-[10px] tabular-nums ${pl.ebitdaMargin < 0 ? 'text-red-400/70' : 'text-gray-400'}`}>
                      {fmtPct(pl.ebitdaMargin)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-gray-500 italic">
              Computed from the Excel-aligned engine (<span className="font-mono">lib/model.ts::calcAnnualPL</span>).
              May differ from other dashboard revenue widgets that still read the v10 shadow engine
              — AUDIT.md C-4 (dashboard engine consolidation) is out of scope of this change.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard label="Y1 Procedures" value={fmtNumber(y1Procs)} sub={monthsAtCap > 0 ? `${monthsAtCap} mo AT CAPACITY` : `${v10.scenario.maxCapacityPerMonth}/mo cap`} highlight={monthsAtCap > 0} />
          <KpiCard label={<>Blended Rate <TooltipInfo text="Medicare weighted base $1,408 \u00d7 blended commercial multiplier 1.496\u00d7 (BCBS 30%\u00d71.30 + Aetna/UHC/Cigna 70%\u00d71.58) = $2,002 at 15% govt / 85% commercial \u2014 Forney market" href="/citations?highlight=revenuePerProcedure" /></>} value={fmtCurrency(matureRate, false)} sub="Mature (M7+)" />
          <KpiCard label={<>Revenue / Procedure <TooltipInfo text="Weighted avg across credentialing ramp months" href="/citations?highlight=revenuePerProcedure" /></>} value={fmtCurrency(revPerProc, false)} sub="Before 8% mgmt fee" />
          <KpiCard label="Revenue / Patient" value={fmtCurrency(revPerPatient, false)} sub="Before 8% mgmt fee" />
          <KpiCard label="Cost Per Acquisition" value={fmtCurrency(cpa, false)} sub="Marketing / treated" />
          <KpiCard label="Procs / Patient" value={fmtDecimal(v10.scenario.procsPerPatient, 1)} />
        </div>

        {/* Monthly Demand vs Capacity */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-sm font-semibold text-[#5faaa6]">Monthly Demand vs Capacity — Year 1</h2>
            {demandChartData.some(d => d.excess > 0) && (
              <span className="text-xs font-medium text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                Excess demand detected — capacity-constrained
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Raw funnel demand vs {v10.scenario.maxCapacityPerMonth}/mo capacity ceiling — excess demand = patients turned away, validating expansion thesis
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={demandChartData} margin={{ top: 5, right: 24, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, Math.max(v10.scenario.maxCapacityPerMonth * 1.4, 20)]} />
              <Tooltip content={<DemandTooltip cap={v10.scenario.maxCapacityPerMonth} />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 8 }} />
              <ReferenceLine
                y={v10.scenario.maxCapacityPerMonth}
                stroke="#ef4444"
                strokeDasharray="5 3"
                label={{ value: `Capacity: ${v10.scenario.maxCapacityPerMonth}/mo`, fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }}
              />
              <Line type="monotone" dataKey="Market Demand" stroke="#14b8a6" strokeWidth={2.5} dot={{ fill: '#14b8a6', r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="Actual Procs" stroke="#6366f1" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Funnel Bridge */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-[#5faaa6]">Y1 Funnel Bridge</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium">Stage</th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">Monthly Avg</th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">Annual</th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">Conv Rate</th>
              </tr>
            </thead>
            <tbody>
              {[
                { stage: 'Leads', total: bridge.leads, rate: null },
                { stage: 'Contacts', total: bridge.contacts, rate: bridge.leads > 0 ? bridge.contacts / bridge.leads : 0 },
                { stage: 'Booked', total: bridge.booked, rate: bridge.contacts > 0 ? bridge.booked / bridge.contacts : 0 },
                { stage: 'Shows', total: bridge.shows, rate: bridge.booked > 0 ? bridge.shows / bridge.booked : 0 },
                { stage: 'Treated', total: bridge.treated, rate: bridge.shows > 0 ? bridge.treated / bridge.shows : 0 },
                { stage: 'Procedures', total: bridge.procs, rate: bridge.treated > 0 ? bridge.procs / bridge.treated : 0 },
                { stage: 'Gross Revenue', total: bridge.rev, rate: null },
              ].map((r, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-5 py-2.5 text-gray-300 font-medium">{r.stage}</td>
                  <td className="px-5 py-2.5 text-right text-white">{r.stage === 'Gross Revenue' ? fmtCurrency(r.total / 12) : fmtDecimal(r.total / 12, 1)}</td>
                  <td className="px-5 py-2.5 text-right text-white">{r.stage === 'Gross Revenue' ? fmtCurrency(r.total) : fmtNumber(r.total)}</td>
                  <td className="px-5 py-2.5 text-right text-gray-400">{r.rate !== null ? fmtPct(r.rate) : '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 3-Year Revenue */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">3-Year Gross Revenue Trajectory</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="40%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip content={<EbitdaTooltip />} cursor={{ fill: '#1f2937' }} />
                <Bar dataKey="ebitda" name="Gross Revenue" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-300">Revenue Summary</h2>
            {[
              { label: 'Y1 Gross Revenue', value: fmtCurrency(y1Rev), accent: true },
              { label: 'Y2 Gross Revenue', value: fmtCurrency(y2Rev), accent: false },
              { label: 'Y3 Gross Revenue', value: fmtCurrency(y3Rev), accent: false },
              { label: 'Y1 Mgmt Fee (8%)', value: fmtCurrency(v10.y1.mgmtFee), accent: false },
              { label: 'Y1 Net Revenue', value: fmtCurrency(v10.y1.netRevenue), accent: true },
              { label: 'Max Capacity', value: `${v10.scenario.maxCapacityPerMonth}/mo`, accent: false },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <span className="text-sm text-gray-400">{item.label}</span>
                <span className={`font-semibold text-sm ${item.accent ? 'text-teal-400' : 'text-white'}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3-Year Summary Table */}
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
                  Year 2 <TooltipInfo text="Stabilization \u2014 conversion rates improve YoY" href="#" />
                </th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">
                  Year 3 <TooltipInfo text="Maturity \u2014 full payer credentialing, referral network scaled" href="#" />
                </th>
              </tr>
            </thead>
            <tbody>
              {([
                { label: 'Annual Procedures', vals: [v10.y1.annualProcs, v10.y2.annualProcs, v10.y3.annualProcs], isCurrency: false },
                { label: 'Blended Rate', vals: [v10.y1.blendedRate, v10.y2.blendedRate, v10.y3.blendedRate], isCurrency: true },
                { label: 'Gross Revenue', vals: [y1Rev, y2Rev, y3Rev], isCurrency: true },
                { label: 'Mgmt Fee (8%)', vals: [v10.y1.mgmtFee, v10.y2.mgmtFee, v10.y3.mgmtFee], isCurrency: true },
                { label: 'Net Revenue', vals: [v10.y1.netRevenue, v10.y2.netRevenue, v10.y3.netRevenue], isCurrency: true },
              ]).map((row, i) => (
                <tr key={i} className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${row.label === 'Net Revenue' ? 'bg-gray-800/20 font-semibold' : ''}`}>
                  <td className="px-5 py-3 text-gray-300">{row.label}</td>
                  {row.vals.map((v, j) => (
                    <td key={j} className={`px-5 py-3 text-right font-medium ${v < 0 ? 'text-red-400' : 'text-white'}`}>
                      {row.isCurrency ? fmtCurrency(v) : fmtNumber(v)}
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
