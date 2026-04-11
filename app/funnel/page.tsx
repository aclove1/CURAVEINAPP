'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend
} from 'recharts'
import { useRouter } from 'next/navigation'
import { useModelStore } from '@/lib/store'
import { calcFunnelMonth } from '@/lib/model'
import { fmtNumber, fmtPct, fmtCurrency, MONTH_LABELS } from '@/lib/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { getCitationById } from '@/lib/citations'

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
  const citation = getCitationById(citationId)
  if (!citation) return null

  return (
    <span
      className="relative inline-flex items-center ml-1.5"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span
        className="text-[#5faaa6] cursor-pointer text-[10px] select-none hover:text-[#7cc4c0]"
        onClick={() => router.push(`/citations?highlight=${citationId}`)}
      >
        &#9432;
      </span>
      {show && (
        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-56 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-xs text-gray-300 shadow-lg pointer-events-none">
          <span className="font-mono text-[#5faaa6]">{citation.value}</span>
          <span className="text-gray-500"> — </span>
          <span>{citation.rationale}</span>
          <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700" />
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

  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => calcFunnelMonth(i + 1, assumptions)),
    [assumptions]
  )

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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Y1 Procedures" value={fmtNumber(totalProcs)} />
          <KpiCard label="Avg Monthly Procedures" value={avgMonthly.toFixed(1)} />
          <KpiCard label="Peak Month" value={fmtNumber(peakMonth)} sub="procedures" />
          <KpiCard label="Months at Capacity" value={`${monthsAtCapacity} / 12`} highlight={monthsAtCapacity > 3} />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Monthly Funnel — Leads → Procedures</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={waterfallData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
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
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
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
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: unknown) => [v as number, 'Excess Demand']}
                />
                <Line type="monotone" dataKey="excessDemand" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Monthly Funnel Detail</h2>
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
                {months.map((m, i) => (
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
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtCurrency(months.reduce((s, m) => s + m.marketingSpend, 0), false)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtNumber(months.reduce((s, m) => s + m.leads, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtNumber(months.reduce((s, m) => s + m.contacts, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtNumber(months.reduce((s, m) => s + m.booked, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtNumber(months.reduce((s, m) => s + m.shows, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtNumber(months.reduce((s, m) => s + m.treated, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-white">{fmtNumber(totalProcs)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{fmtPct(totalProcs / (assumptions.maxCapacityPerMonth * 12))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
