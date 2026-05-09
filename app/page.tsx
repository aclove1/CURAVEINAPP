'use client'

import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useModelStore } from '@/lib/store'
import { fmtCurrency, fmtCurrencyCompact, fmtNumber, fmtDecimal, fmtPct, MONTH_LABELS } from '@/lib/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { TooltipInfo } from '@/components/ui/TooltipInfo'
import {
  calcAnnualPL,
  calcFunnelMonth,
  calcRevenueMonth,
  calcOverallBlendedRate,
  adjustAssumptionsForYear,
  effectiveProcsPerPatient,
} from '@/lib/model'
import { applyIncomeBuffer, INCOME_BUFFER_FACTOR, BUFFER_DISCLOSURE } from '@/lib/defaults'
import type { Scenario } from '@/lib/types'

// AUDIT 2026-04-23 C-7 resolved: tooltip now labels revenue dynamics on the
// revenue chart. Year notes rephrased for revenue (not EBITDA) context.
const REVENUE_TOOLTIPS: Record<string, string> = {
  'Year 1': 'Ramp year \u2014 funnel building, below capacity',
  'Year 2': 'Stabilization \u2014 conversion rates improve YoY',
  'Year 3': 'Maturity \u2014 full payer credentialing, referral network scaled',
}

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const yearNote = label ? REVENUE_TOOLTIPS[label] : ''
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <div className="text-gray-400 mb-1">{label}</div>
      <div className="text-white font-medium">{fmtCurrency(payload[0].value)}</div>
      {yearNote && <div className="text-gray-400 mt-1 text-[10px]">{yearNote}</div>}
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

// AUDIT 2026-04-23 S-8 resolved: max values aligned with CONVERSION_CAPS in
// lib/model.ts so the operator can reach every value that Y2/Y3 boost logic
// can produce (prevents internally inconsistent Aggressive Y3 states).
const SLIDERS = [
  { label: 'Contact Rate', field: 'contactRate' as const, min: 0.10, max: 0.80, step: 0.01 },
  { label: 'Booking Rate', field: 'bookingRate' as const, min: 0.20, max: 0.75, step: 0.01 },
  { label: 'Show Rate', field: 'showRate' as const, min: 0.40, max: 0.92, step: 0.01 },
  { label: 'Treatment Conversion', field: 'treatmentConversion' as const, min: 0.30, max: 0.78, step: 0.01 },
]

export default function DashboardPage() {
  const { assumptions, updateAssumption, setScenario } = useModelStore()

  // ── v12 Excel-aligned engine (calcAnnualPL) — single source of truth ──
  // AUDIT.md C-4 resolved: v10 shadow engine retired. All dashboard metrics
  // (KPIs, charts, summary tables, widget) now compute from model.ts.
  // `dash` replicates the v10 result shape for minimal diff in renderers.
  const dash = useMemo(() => {
    const adjY1 = adjustAssumptionsForYear(1, assumptions)
    const y1PL = calcAnnualPL(1, assumptions)
    const y2PL = calcAnnualPL(2, assumptions)
    const y3PL = calcAnnualPL(3, assumptions)
    const matureBlended = calcOverallBlendedRate(assumptions)
    const procsPerPatient = effectiveProcsPerPatient(assumptions)
    const maxCapacity = adjY1.maxCapacityPerMonth

    const y1Months = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const funnel = calcFunnelMonth(m, adjY1)
      const rev = calcRevenueMonth(m, adjY1)
      return {
        month: MONTH_LABELS[i],
        marketingSpend: funnel.marketingSpend,
        leads: funnel.leads,
        contacts: funnel.contacts,
        booked: funnel.booked,
        shows: funnel.shows,
        treatedPatients: funnel.treated,
        rawProcs: funnel.rawProcs,
        totalProcs: funnel.cappedProcs,
        utilizationPct: funnel.utilization,
        blendedRate: rev.blendedRate,
        grossRevenue: rev.grossRevenue,
      }
    })

    // v14.1 — apply 10% conservatism buffer to FINAL INCOME numbers shown
    // to the user (gross/net/ebitda). Blended rate, procedure counts, mgmt
    // fee dollars stay raw — they're operational metrics, not income.
    const summarize = (pl: typeof y1PL) => ({
      annualProcs: pl.totalProcs,
      blendedRate: pl.totalProcs > 0 ? Math.round(pl.grossRevenue / pl.totalProcs) : 0,
      grossRevenue: applyIncomeBuffer(pl.grossRevenue),
      mgmtFee: pl.managementFee,
      netRevenue: applyIncomeBuffer(pl.netRevenue),
      ebitda: applyIncomeBuffer(pl.ebitda),
      ebitdaMargin: pl.ebitdaMargin, // unchanged (proportional buffer cancels in ratio)
    })

    // AUDIT 2026-04-24 C-9 resolved: use PL-derived per-year blended rate
    // (grossRevenue / totalProcs, includes US revenue per patient) for ALL
    // three years. Previously Y1 used PL-derived and Y2/Y3 used
    // calcOverallBlendedRate (proc only, excludes US revenue) — mixing
    // definitions within the same column.
    return {
      y1: summarize(y1PL),
      y2: summarize(y2PL),
      y3: summarize(y3PL),
      matureBlendedProcOnly: matureBlended,
      y1Months,
      scenario: { procsPerPatient, maxCapacityPerMonth: maxCapacity },
    }
  }, [assumptions])

  // Convenience aliases — buffered for display. Raw (unbuffered) AnnualPL is
  // not consumed by the dashboard. P&L page renders raw + buffered side-by-side
  // for transparency.
  const pl1Raw = useMemo(() => calcAnnualPL(1, assumptions), [assumptions])
  const pl2Raw = useMemo(() => calcAnnualPL(2, assumptions), [assumptions])
  const pl3Raw = useMemo(() => calcAnnualPL(3, assumptions), [assumptions])
  const pl1 = useMemo(() => ({
    ...pl1Raw,
    grossRevenue: applyIncomeBuffer(pl1Raw.grossRevenue),
    netRevenue:   applyIncomeBuffer(pl1Raw.netRevenue),
    ebitda:       applyIncomeBuffer(pl1Raw.ebitda),
  }), [pl1Raw])
  const pl2 = useMemo(() => ({
    ...pl2Raw,
    grossRevenue: applyIncomeBuffer(pl2Raw.grossRevenue),
    netRevenue:   applyIncomeBuffer(pl2Raw.netRevenue),
    ebitda:       applyIncomeBuffer(pl2Raw.ebitda),
  }), [pl2Raw])
  const pl3 = useMemo(() => ({
    ...pl3Raw,
    grossRevenue: applyIncomeBuffer(pl3Raw.grossRevenue),
    netRevenue:   applyIncomeBuffer(pl3Raw.netRevenue),
    ebitda:       applyIncomeBuffer(pl3Raw.ebitda),
  }), [pl3Raw])
  const widgetScenario: Scenario = assumptions.scenario

  // 4-scenario toggle for dashboard.
  const WIDGET_SCENARIOS: { key: Scenario; label: string; sub: string }[] = [
    { key: 'conservative', label: 'Downside',  sub: '65/35 mix · realization 83% · reimbursement pressure' },
    { key: 'base',         label: 'Base',      sub: '75/25 New Braunfels market · realization 94%' },
    { key: 'aggressive',   label: 'Upside',    sub: '85/15 via DTC under-65 targeted acquisition' },
    { key: 'hybridWound',  label: 'Hybrid Wound Care Referral Base', sub: 'Vein clinic embedded in wound-care center · referrals fill Year 1 capacity from Month 1' },
  ]

  const y1Rev = dash.y1.grossRevenue
  const y2Rev = dash.y2.grossRevenue
  const y3Rev = dash.y3.grossRevenue

  // AUDIT 2026-04-23 C-7 resolved: dataKey renamed ebitda → revenue so the
  // chart data model matches what it renders (Gross Revenue trajectory).
  const chartData = [
    { year: 'Year 1', revenue: y1Rev },
    { year: 'Year 2', revenue: y2Rev },
    { year: 'Year 3', revenue: y3Rev },
  ]

  const y1Procs = dash.y1.annualProcs
  const matureRate = dash.matureBlendedProcOnly
  const monthsAtCap = dash.y1Months.filter(m => m.utilizationPct >= 1).length

  const totalMarketing = dash.y1Months.reduce((s, m) => s + m.marketingSpend, 0)
  const totalTreated = dash.y1Months.reduce((s, m) => s + m.treatedPatients, 0)
  const cpa = totalTreated > 0 ? totalMarketing / totalTreated : 0
  // v14.1 — Revenue/proc and Revenue/patient are TECHNICAL OPERATING METRICS
  // (per-unit reimbursement view), not income totals. Computed from RAW Y1
  // (pre-buffer) so the operator sees the actual modeled per-procedure
  // economics. Annual totals shown elsewhere on the page apply the 10% buffer.
  const y1RevRaw = pl1Raw.grossRevenue
  const revPerProc = y1Procs > 0 ? y1RevRaw / y1Procs : 0
  const revPerPatient = dash.scenario.procsPerPatient > 0 ? revPerProc * dash.scenario.procsPerPatient : 0

  const demandChartData = dash.y1Months.map(m => ({
    month: m.month,
    'Market Demand': m.rawProcs,
    'Actual Procs': m.totalProcs,
    excess: Math.max(0, m.rawProcs - dash.scenario.maxCapacityPerMonth),
  }))

  // Funnel bridge — gross revenue buffered for display consistency with
  // the rest of the dashboard. Stage counts (leads/contacts/...) are
  // operational metrics, not income, so they stay raw.
  const bridge = useMemo(() => {
    const ms = dash.y1Months
    const leads = ms.reduce((s, m) => s + m.leads, 0)
    const contacts = ms.reduce((s, m) => s + m.contacts, 0)
    const booked = ms.reduce((s, m) => s + m.booked, 0)
    const shows = ms.reduce((s, m) => s + m.shows, 0)
    const treated = ms.reduce((s, m) => s + m.treatedPatients, 0)
    const procs = ms.reduce((s, m) => s + m.totalProcs, 0)
    const rev = applyIncomeBuffer(ms.reduce((s, m) => s + m.grossRevenue, 0))
    return { leads, contacts, booked, shows, treated, procs, rev }
  }, [dash.y1Months])

  return (
    <div>
      <TopBar title="Dashboard — Key Metrics Snapshot" />
      <div className="p-6 space-y-6">

        <div className="flex items-center gap-4">
          <a
            href="https://curavein.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 text-sm font-semibold text-gray-950 rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: '#5faaa6' }}
          >
            CuraVein&trade; Flagship Proforma
          </a>
        </div>

        {/* v14.1 — Investor-facing income buffer disclosure. Mandatory per
            BUFFER_DISCLOSURE in lib/defaults.ts. Visible above the fold on
            every dashboard view that displays buffered final income numbers. */}
        <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg px-4 py-3 flex items-start gap-3">
          <span className="text-amber-300 text-lg leading-none mt-0.5">⚠</span>
          <div className="flex-1">
            <div className="text-xs font-semibold text-amber-200 uppercase tracking-wider mb-1">
              Conservatism Buffer Applied — {Math.round((1 - INCOME_BUFFER_FACTOR) * 100)}% off final income figures
            </div>
            <p className="text-[11px] text-amber-100/80 leading-relaxed">
              {BUFFER_DISCLOSURE} Per-procedure reimbursement rates (Blended
              Rate, Revenue/Procedure, Revenue/Patient) display the raw modeled
              values; annual <span className="font-semibold">Gross Revenue</span>,{' '}
              <span className="font-semibold">Net Revenue</span>, and{' '}
              <span className="font-semibold">EBITDA</span> are post-buffer.
            </p>
          </div>
        </div>

        {/* Scenario Selector — prominent master control. Drives every number on the page. */}
        <div className="bg-gradient-to-r from-[#5faaa6]/10 via-gray-900 to-gray-900 border-2 border-[#5faaa6]/30 rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-base font-bold text-white tracking-tight">
              Scenario Selector
              <span className="ml-2 text-xs font-normal text-[#5faaa6]">← click to switch</span>
            </h2>
            <span className="text-[11px] text-gray-400 italic">
              Drives all KPIs, charts, P&amp;L, and revenue numbers below.
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {WIDGET_SCENARIOS.map(({ key, label, sub }) => {
              const active = widgetScenario === key
              return (
                <button
                  key={key}
                  onClick={() => setScenario(key)}
                  className={`group cursor-pointer text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    active
                      ? 'bg-[#5faaa6] border-[#5faaa6] text-gray-950 shadow-lg shadow-[#5faaa6]/20 ring-2 ring-[#5faaa6]/40'
                      : 'bg-gray-950/60 border-gray-700 text-gray-300 hover:border-[#5faaa6]/60 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-white' : 'bg-gray-600 group-hover:bg-[#5faaa6]'}`} />
                    <span className="text-sm font-semibold">{label}</span>
                  </div>
                  <div className={`text-[10px] mt-1 leading-tight ${active ? 'text-gray-900/80' : 'text-gray-400 group-hover:text-gray-300'}`}>
                    {sub}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#5faaa6] mb-4">Conversion Rate Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {SLIDERS.map(({ label, field, min, max, step }) => {
              const vals = assumptions[field] as { conservative: number; base: number; aggressive: number; hybridWound: number }
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
                    aria-label={label}
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
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
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
                3-Year P&amp;L · Excel-aligned · scenario-toggled
              </h3>
              <span className="text-[10px] text-gray-400">
                engine: <span className="font-mono">calcAnnualPL</span> ·
                {' '}flag: <span className="font-mono text-[#5faaa6]">V12_HARDENING</span>
              </span>
            </div>

            {/* Active-scenario context row (top selector is source of truth) */}
            <div className="mb-3 text-[10px] text-gray-400">
              Active: <span className="text-[#5faaa6] font-semibold">
                {WIDGET_SCENARIOS.find(s => s.key === widgetScenario)?.label ?? widgetScenario}
              </span>
              {' — '}
              <span>{WIDGET_SCENARIOS.find(s => s.key === widgetScenario)?.sub}</span>
            </div>

            {/* Hybrid Wound: starting procedure capacity slider (Y1 M1 utilization). */}
            {widgetScenario === 'hybridWound' && (
              <div className="mb-4 p-3 rounded-lg border border-gray-800 bg-gray-950/40">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-gray-300 font-medium">
                    Starting Procedure Capacity
                  </span>
                  <span className="text-xs font-mono text-[#5faaa6]">
                    {Math.round(assumptions.startingProcedureCapacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Starting Procedure Capacity"
                  min={0.10}
                  max={1.00}
                  step={0.01}
                  value={assumptions.startingProcedureCapacity}
                  onChange={(e) => updateAssumption('startingProcedureCapacity', parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-700 accent-[#5faaa6]"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>10%</span>
                  <span>100%</span>
                </div>
                <p className="text-[10px] text-gray-400 italic mt-1.5">
                  Procedure capacity already filled in month 1 from wound care center referrals. Subsequent months ramp the remaining gap to 100% over Year 1.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { label: 'Year 1', sub: 'ramp', pl: pl1 },
                { label: 'Year 2', sub: 'partial stabilization', pl: pl2 },
                { label: 'Year 3', sub: 'steady-state · near-capacity', pl: pl3 },
              ] as const).map(({ label, sub, pl }) => (
                <div key={label} className="bg-gray-950/60 border border-gray-800 rounded-lg p-3">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
                    <span className="text-[9px] text-gray-400 italic">{sub}</span>
                  </div>
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-[11px] text-gray-400 flex-shrink-0">Gross Revenue</span>
                    <span className="text-sm font-mono text-white tabular-nums truncate">
                      <span className="md:hidden">{fmtCurrencyCompact(pl.grossRevenue)}</span>
                      <span className="hidden md:inline">{fmtCurrency(pl.grossRevenue)}</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline gap-2 mt-1">
                    <span className="text-[11px] text-gray-400 flex-shrink-0">EBITDA</span>
                    <span className={`text-sm font-mono tabular-nums truncate ${pl.ebitda < 0 ? 'text-red-400' : 'text-[#5faaa6]'}`}>
                      <span className="md:hidden">{fmtCurrencyCompact(pl.ebitda)}</span>
                      <span className="hidden md:inline">{fmtCurrency(pl.ebitda)}</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline mt-0.5">
                    <span className="text-[10px] text-gray-400">margin</span>
                    <span className={`text-[10px] tabular-nums ${pl.ebitdaMargin < 0 ? 'text-red-400/70' : 'text-gray-400'}`}>
                      {fmtPct(pl.ebitdaMargin)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-gray-400 italic">
              Year 3 reflects stabilized operations; Year 1 reflects the credentialing ramp.
              Three core scenarios isolate single-factor sensitivities — <span className="text-gray-400">Downside</span>{' '}
              models reimbursement pressure (net realization 83%, payer mix drift to 65% commercial);{' '}
              <span className="text-gray-400">Base</span> reflects the New Braunfels demographic
              baseline (75/25 mix, 94% realization);{' '}
              <span className="text-gray-400">Upside</span> models DTC under-65 commercial targeting
              at 85/15 mix.{' '}
              <span className="text-gray-400">Hybrid Wound Care Referral Base</span> models a vein
              clinic embedded inside a wound-care center where internal referrals fill Year 1
              capacity from Month 1 (slider-controlled), ramping to full capacity by Year 2.
              Margins are modeled targets, not guarantees.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard label="Y1 Procedures" value={fmtNumber(y1Procs)} sub={monthsAtCap > 0 ? `${monthsAtCap} mo AT CAPACITY` : `${dash.scenario.maxCapacityPerMonth}/mo cap`} highlight={monthsAtCap > 0} />
          <KpiCard label={<>Blended Rate <TooltipInfo text="Weighted Medicare base $1,408 \u00d7 (gov share + comm share \u00d7 1.496) \u00d7 net realization factor. Base scenario: 25% gov / 75% comm \u00d7 0.94 realization \u2192 ~$1,816/proc. Scenario-sensitive \u2014 Downside $1,545, Upside $1,922." href="/citations?highlight=revenuePerProcedure" /></>} value={fmtCurrency(matureRate, false)} sub="Mature (M5+) / proc" />
          <KpiCard label={<>Revenue / Procedure <TooltipInfo text="Weighted avg across credentialing ramp months" href="/citations?highlight=revenuePerProcedure" /></>} value={fmtCurrency(revPerProc, false)} sub="Before 8% mgmt fee" />
          <KpiCard label="Revenue / Patient" value={fmtCurrency(revPerPatient, false)} sub="Before 8% mgmt fee" />
          <KpiCard label="Cost Per Acquisition" value={fmtCurrency(cpa, false)} sub="Marketing / treated" />
          <KpiCard label="Procs / Patient" value={fmtDecimal(dash.scenario.procsPerPatient, 1)} />
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
          <p className="text-xs text-gray-400 mb-4">
            Raw funnel demand vs {dash.scenario.maxCapacityPerMonth}/mo capacity ceiling — excess demand = patients turned away, validating expansion thesis
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={demandChartData} margin={{ top: 5, right: 24, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, Math.max(dash.scenario.maxCapacityPerMonth * 1.4, 20)]} />
              <Tooltip content={<DemandTooltip cap={dash.scenario.maxCapacityPerMonth} />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 8 }} />
              <ReferenceLine
                y={dash.scenario.maxCapacityPerMonth}
                stroke="#ef4444"
                strokeDasharray="5 3"
                label={{ value: `Capacity: ${dash.scenario.maxCapacityPerMonth}/mo`, fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }}
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
          <table className="mobile-card-table w-full text-sm">
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
                  <td data-label="Stage" className="px-5 py-2.5 text-gray-300 font-medium">{r.stage}</td>
                  <td data-label="Monthly Avg" className="px-5 py-2.5 text-right text-white">{r.stage === 'Gross Revenue' ? fmtCurrency(r.total / 12) : fmtDecimal(r.total / 12, 1)}</td>
                  <td data-label="Annual" className="px-5 py-2.5 text-right text-white">{r.stage === 'Gross Revenue' ? fmtCurrency(r.total) : fmtNumber(r.total)}</td>
                  <td data-label="Conv Rate" className="px-5 py-2.5 text-right text-gray-400">{r.rate !== null ? fmtPct(r.rate) : '\u2014'}</td>
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
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: '#1f2937' }} />
                <Bar dataKey="revenue" name="Gross Revenue" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-300">Revenue Summary</h2>
            {[
              { label: 'Y1 Gross Revenue', value: fmtCurrency(y1Rev), accent: true },
              { label: 'Y2 Gross Revenue', value: fmtCurrency(y2Rev), accent: false },
              { label: 'Y3 Gross Revenue', value: fmtCurrency(y3Rev), accent: false },
              { label: 'Y1 Mgmt Fee (8%)', value: fmtCurrency(dash.y1.mgmtFee), accent: false },
              { label: 'Y1 Net Revenue', value: fmtCurrency(dash.y1.netRevenue), accent: true },
              { label: 'Max Capacity', value: `${dash.scenario.maxCapacityPerMonth}/mo`, accent: false },
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
          <table className="mobile-card-table w-full text-sm">
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
                { label: 'Annual Procedures', vals: [dash.y1.annualProcs, dash.y2.annualProcs, dash.y3.annualProcs], isCurrency: false },
                { label: 'Avg Gross Rev / Proc', vals: [dash.y1.blendedRate, dash.y2.blendedRate, dash.y3.blendedRate], isCurrency: true },
                { label: 'Gross Revenue', vals: [y1Rev, y2Rev, y3Rev], isCurrency: true },
                { label: 'Mgmt Fee (8%)', vals: [dash.y1.mgmtFee, dash.y2.mgmtFee, dash.y3.mgmtFee], isCurrency: true },
                { label: 'Net Revenue', vals: [dash.y1.netRevenue, dash.y2.netRevenue, dash.y3.netRevenue], isCurrency: true },
              ]).map((row, i) => {
                const yearLabels = ['Year 1', 'Year 2', 'Year 3']
                return (
                  <tr key={i} className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${row.label === 'Net Revenue' ? 'bg-gray-800/20 font-semibold' : ''}`}>
                    <td data-label="Metric" className="px-5 py-3 text-gray-300">{row.label}</td>
                    {row.vals.map((v, j) => (
                      <td key={j} data-label={yearLabels[j]} className={`px-5 py-3 text-right font-medium ${v < 0 ? 'text-red-400' : 'text-white'}`}>
                        {row.isCurrency ? fmtCurrency(v) : fmtNumber(v)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
