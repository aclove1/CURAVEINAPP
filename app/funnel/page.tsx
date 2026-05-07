'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend
} from 'recharts'
import { useRouter } from 'next/navigation'
import { useModelStore } from '@/lib/store'
import { calcFunnelMonth, adjustAssumptionsForYear, effectiveProcsPerPatient } from '@/lib/model'
import { fmtNumber, fmtPct, fmtCurrency, MONTH_LABELS } from '@/lib/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { getCitationById } from '@/lib/citations'
import { LEAD_SOURCE_MIX, calcCompositeContactRate } from '@/lib/defaults'

const HEADER_CITATIONS: Record<string, string> = {
  Contacts: 'contactRate',
  Booked: 'bookingRate',
  Shows: 'showRate',
  Treated: 'treatmentRate',
  Procs: 'proceduresPerPatient',
}

function CitationIcon({ citationId }: { citationId: string }) {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const citation = getCitationById(citationId)
  if (!citation) return null

  return (
    <span
      className="inline-flex items-center ml-1.5"
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 })
        setShow(true)
      }}
      onMouseLeave={() => setShow(false)}
    >
      <span
        className="text-[#5faaa6] cursor-pointer text-[10px] select-none hover:text-[#7cc4c0]"
        onClick={() => router.push(`/citations?highlight=${citationId}`)}
      >
        &#9432;
      </span>
      {show && pos && (
        <span
          className="fixed z-[9999] w-56 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-xs text-gray-300 shadow-lg pointer-events-none"
          style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
        >
          <span className="font-mono text-[#5faaa6]">{citation.value}</span>
          <span className="text-gray-400"> — </span>
          <span className="font-normal">{citation.rationale}</span>
        </span>
      )}
    </span>
  )
}

function utilColor(u: number) {
  if (u >= 0.95) return '#ef4444'
  if (u >= 0.75) return '#f59e0b'
  return '#14b8a6'
}

export default function FunnelPage() {
  const { assumptions } = useModelStore()
  const [tableYear, setTableYear] = useState<1 | 2 | 3>(1)

  // AUDIT 2026-04-24 C-8: iterate against Y1-adjusted assumptions so the top-
  // of-page KPI row (total/avg/peak procs, months-at-capacity) reconciles with
  // the dashboard and with calcAnnualPL(1). Raw assumptions use maxCapacity=146
  // while adjusted Y1 Base uses ~86 → 29% inter-page divergence pre-fix.
  const adjY1 = useMemo(() => adjustAssumptionsForYear(1, assumptions), [assumptions])
  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => calcFunnelMonth(i + 1, adjY1)),
    [adjY1]
  )

  const tableMonths = useMemo(() => {
    const adj = adjustAssumptionsForYear(tableYear, assumptions)
    return Array.from({ length: 12 }, (_, i) => calcFunnelMonth(i + 1, adj))
  }, [assumptions, tableYear])

  const waterfallData = useMemo(() => months.map((m, i) => ({
    month: MONTH_LABELS[i],
    Leads: m.leads,
    Contacts: m.contacts,
    Booked: m.booked,
    Shows: m.shows,
    Treated: m.treated,
    Procedures: m.cappedProcs,
  })), [months])

  const utilizationData = useMemo(() => months.map((m, i) => ({
    month: MONTH_LABELS[i],
    utilization: Math.round(m.utilization * 100),
    excessDemand: m.excessDemand,
    color: utilColor(m.utilization),
  })), [months])

  const totalProcs = months.reduce((s, m) => s + m.cappedProcs, 0)
  const avgMonthly = totalProcs / 12
  const peakMonth = Math.max(...months.map((m) => m.cappedProcs))
  const monthsAtCapacity = months.filter((m) => m.utilization >= 1).length

  const COLORS: Record<string, string> = {
    Leads: '#6b7280',
    Contacts: '#9ca3af',
    Booked: '#60a5fa',
    Shows: '#34d399',
    Treated: '#a78bfa',
    Procedures: '#14b8a6',
  }

  const HEADERS = ['Month', 'Mktg Spend', 'Leads', 'Contacts', 'Booked', 'Shows', 'Treated', 'Procs', 'Utilization']

  return (
    <div>
      <TopBar title="DTC Acquisition Funnel" />
      <div className="p-6 space-y-6">

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 border-l-4 border-l-[#5faaa6]">
          <h3 className="text-white font-bold text-sm mb-1.5">The Funnel Is Everything</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Every patient outcome begins with how well you get people in the door. From first contact through scheduling, consultation, and treatment — each conversion step compounds. A 5% improvement at every stage doubles your treated patient volume. <span className="italic">Script every touchpoint.</span>
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Y1 Procedures" value={fmtNumber(totalProcs)} />
          <KpiCard label="Avg Monthly Procedures" value={avgMonthly.toFixed(1)} />
          <KpiCard label="Peak Month" value={fmtNumber(peakMonth)} sub="procedures" />
          <KpiCard label="Months at Capacity" value={`${monthsAtCapacity} / 12`} highlight={monthsAtCapacity > 3} />
        </div>

        {/* v12 — Lead Source Mix (seeded, read-only). Composite contact rate seeds the Funnel. */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300">
                Lead Source Mix
                <span className="ml-2 text-[10px] font-normal text-gray-400 uppercase tracking-wider">v12 · seeded</span>
              </h2>
              <div className="text-xs text-gray-400">
                Composite contact rate (active scenario):{' '}
                <span className="text-[#5faaa6] font-semibold">
                  {fmtPct(calcCompositeContactRate(assumptions.scenario))}
                </span>
                <span className="ml-2 text-gray-400">
                  → effective procs/patient: <span className="text-gray-300">{effectiveProcsPerPatient(assumptions).toFixed(2)}</span>
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              A single contact rate hides what actually drives revenue. Composite = Σ (volume share × per-source contact rate).
              Shifting volume from paid social → physician referral lifts the composite by 2–3 points and adds ~5–10% revenue.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-950 text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Source</th>
                  <th className="px-3 py-2 text-right font-medium">Volume %</th>
                  <th className="px-3 py-2 text-right font-medium">Contact Rate</th>
                  <th className="px-3 py-2 text-right font-medium">Contribution</th>
                  <th className="px-4 py-2 text-left font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {LEAD_SOURCE_MIX.map((s) => {
                  const sc = assumptions.scenario
                  const v = s.volumeShare[sc]
                  const c = s.contactRate[sc]
                  return (
                    <tr key={s.id} className="border-t border-gray-800">
                      <td className="px-4 py-2 font-medium text-white">{s.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtPct(v)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtPct(c)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[#5faaa6]">{fmtPct(v * c)}</td>
                      <td className="px-4 py-2 text-gray-400 italic">{s.note}</td>
                    </tr>
                  )
                })}
                <tr className="border-t border-gray-700 bg-gray-950/60 font-semibold">
                  <td className="px-4 py-2 text-gray-400 uppercase tracking-wider text-[10px]">Composite</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-400">
                    {fmtPct(LEAD_SOURCE_MIX.reduce((a, s) => a + s.volumeShare[assumptions.scenario], 0))}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#5faaa6]">
                    {fmtPct(calcCompositeContactRate(assumptions.scenario))}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#5faaa6]">
                    {fmtPct(calcCompositeContactRate(assumptions.scenario))}
                  </td>
                  <td className="px-4 py-2 text-gray-400 italic">Σ across 5 sources — feeds funnel contact rate</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* v12 — Pathway Economics summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">
              Pathway Economics
              <span className="ml-2 text-[10px] font-normal text-gray-400 uppercase tracking-wider">v12</span>
            </h2>
            <div className="text-xs text-gray-400">
              Treatment Conversion (Shows → ≥1 procedure) is the gate; pathway completion drives revenue per patient.
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-4">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Expected Pathway Procs</div>
              <div className="text-xl font-semibold text-white mt-1">
                {assumptions.expectedPathwayProcs[assumptions.scenario].toFixed(1)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">Bilateral CVI plan: 2 ablations + sclero per leg</div>
            </div>
            <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-4">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Pathway Completion %</div>
              <div className="text-xl font-semibold text-white mt-1">
                {fmtPct(assumptions.pathwayCompletion[assumptions.scenario])}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">Drops to 65% w/ weak counseling; 95% w/ active rebook</div>
            </div>
            <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-4">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Effective Procs / Patient</div>
              <div className="text-xl font-semibold text-[#5faaa6] mt-1">
                {effectiveProcsPerPatient(assumptions).toFixed(2)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">= Expected × Completion. Drives revenue/patient.</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Monthly Funnel — Leads → Procedures</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={waterfallData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #374151', borderRadius: 8, fontSize: 12, color: '#ffffff' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              {(['Leads', 'Contacts', 'Booked', 'Shows', 'Treated', 'Procedures'] as const).map((key) => (
                <Bar key={key} dataKey={key} fill={COLORS[key]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Capacity Utilization</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={utilizationData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid #374151', borderRadius: 8, fontSize: 12, color: '#ffffff' }}
                  formatter={(v: unknown) => [`${v}%`, 'Utilization']}
                />
                <Bar dataKey="utilization" radius={[3, 3, 0, 0]}>
                  {utilizationData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Excess Demand (unmet procedures)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={utilizationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid #374151', borderRadius: 8, fontSize: 12, color: '#ffffff' }}
                  formatter={(v: unknown) => [v as number, 'Excess Demand']}
                />
                <Line type="monotone" dataKey="excessDemand" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">Monthly Funnel Detail</h2>
            <div className="flex gap-1">
              {([1, 2, 3] as const).map((y) => (
                <button
                  key={y}
                  onClick={() => setTableYear(y)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    tableYear === y
                      ? 'bg-[#5faaa6] text-gray-950 font-semibold'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Y{y}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {HEADERS.map((h) => (
                    <th
                      key={h}
                      className={`${h === 'Month' ? 'text-left' : 'text-right'} px-4 py-2.5 text-xs text-gray-400 font-medium`}
                    >
                      {h}
                      {HEADER_CITATIONS[h] && <CitationIcon citationId={HEADER_CITATIONS[h]} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableMonths.map((m, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-2.5 text-gray-300 font-medium">{MONTH_LABELS[i]}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtCurrency(m.marketingSpend, false)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtNumber(m.leads)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtNumber(m.contacts)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtNumber(m.booked)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtNumber(m.shows)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtNumber(m.treated)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-white">{fmtNumber(m.cappedProcs)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span style={{ color: utilColor(m.utilization) }}>{fmtPct(m.utilization)}</span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-800/30 font-semibold">
                  <td className="px-4 py-2.5 text-gray-200">Total</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtCurrency(tableMonths.reduce((s, m) => s + m.marketingSpend, 0), false)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtNumber(tableMonths.reduce((s, m) => s + m.leads, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtNumber(tableMonths.reduce((s, m) => s + m.contacts, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtNumber(tableMonths.reduce((s, m) => s + m.booked, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtNumber(tableMonths.reduce((s, m) => s + m.shows, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtNumber(tableMonths.reduce((s, m) => s + m.treated, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-white">{fmtNumber(tableMonths.reduce((s, m) => s + m.cappedProcs, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{fmtPct(tableMonths.reduce((s, m) => s + m.cappedProcs, 0) / (adjustAssumptionsForYear(tableYear, assumptions).maxCapacityPerMonth * 12))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
