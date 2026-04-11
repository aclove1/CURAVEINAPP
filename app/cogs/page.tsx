'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useModelStore } from '@/lib/store'
import { calcCOGSMonth, calcWeightedSupplyCost, calcRevenueMonth, calcVarithenaCostPerProc } from '@/lib/model'
import { fmtCurrency, fmtPct, MONTH_LABELS } from '@/lib/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'

const DONUT_COLORS = ['#14b8a6', '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b']

export default function CogsPage() {
  const { assumptions } = useModelStore()

  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => calcCOGSMonth(i + 1, assumptions)),
    [assumptions]
  )

  const revMonths = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => calcRevenueMonth(i + 1, assumptions)),
    [assumptions]
  )

  const totalCOGS = months.reduce((s, m) => s + m.totalCOGS, 0)
  const totalProcs = months.reduce((s, m) => s + m.procs, 0)
  const cogsPerProc = totalProcs > 0 ? totalCOGS / totalProcs : 0
  const weightedCost = calcWeightedSupplyCost(assumptions)

  const totVS = months.reduce((s, m) => s + m.venasealCost, 0)
  const totRF = months.reduce((s, m) => s + m.rfCost, 0)
  const totScl = months.reduce((s, m) => s + m.scleroCost, 0)
  const totVar = months.reduce((s, m) => s + m.varithenaCost, 0)
  const totPost = months.reduce((s, m) => s + m.postProcCost, 0)
  const totMisc = months.reduce((s, m) => s + m.miscCost, 0)

  const donutData = [
    { name: 'VenaSeal', value: totVS },
    { name: 'RF Ablation', value: totRF },
    { name: 'Sclerotherapy', value: totScl },
    { name: 'Varithena', value: totVar },
    { name: 'Post-Proc Support', value: totPost + totMisc },
  ]

  const sensitivityRows = [
    { label: 'Base', factor: 1 },
    { label: '+10%', factor: 1.1 },
    { label: '-10%', factor: 0.9 },
  ]

  const totalNetRev = revMonths.reduce((s, m) => s + m.netRevenue, 0)

  return (
    <div>
      <TopBar title="Cost of Goods — Procedure Supplies" />
      <div className="p-6 space-y-6">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Y1 Supply COGS" value={fmtCurrency(totalCOGS)} />
          <KpiCard label="COGS / Procedure" value={fmtCurrency(cogsPerProc, false)} />
          <KpiCard label="Weighted Supply Cost" value={fmtCurrency(weightedCost, false)} sub="per procedure" />
          <KpiCard label="Gross Margin (post-COGS)" value={fmtPct((totalNetRev - totalCOGS) / totalNetRev)} highlight />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Y1 Supply Cost Breakdown</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="value" paddingAngle={3}>
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: unknown) => [fmtCurrency(v as number), '']}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {donutData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: DONUT_COLORS[i] }} />
                    <span className="text-gray-400">{d.name}</span>
                  </div>
                  <span className="text-gray-200 font-medium">{fmtPct(d.value / totalCOGS)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-300">Cost Per Procedure by Type</h2>
            <div className="space-y-3">
              {[
                { label: 'VenaSeal', cost: (assumptions.venasealUnitCost / assumptions.venasealPtsPerKit) * (1 + assumptions.wasteFactor), mix: assumptions.vsMix },
                { label: 'RF Ablation', cost: assumptions.rfSupplyCost * (1 + assumptions.wasteFactor), mix: assumptions.rfMix },
                { label: 'Sclerotherapy', cost: assumptions.scleroSupplyCost * (1 + assumptions.scleroBuffer) * (1 + assumptions.wasteFactor), mix: assumptions.scleroMix },
                { label: 'Varithena', cost: calcVarithenaCostPerProc(assumptions), mix: assumptions.varithenaShare },
                { label: 'Misc Consumables', cost: assumptions.miscConsumables, mix: 1 },
                { label: 'Post-Proc Support', cost: assumptions.postProcSupport, mix: 1 },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <div className="text-sm text-gray-200">{row.label}</div>
                    <div className="text-xs text-gray-500">{fmtPct(row.mix)} mix</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">{fmtCurrency(row.cost, false)}</div>
                    <div className="text-xs text-gray-500">per procedure</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-200">Weighted Supply Cost</span>
                <span className="text-teal-400 font-bold">{fmtCurrency(weightedCost, false)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">COGS Sensitivity — Supply Cost Impact</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium">Scenario</th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">Cost / Proc</th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">Total Y1 COGS</th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">Gross Profit</th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">Gross Margin</th>
              </tr>
            </thead>
            <tbody>
              {sensitivityRows.map((row, i) => {
                const adjCost = weightedCost * row.factor
                const adjTotalCOGS = adjCost * totalProcs
                const grossProfit = totalNetRev - adjTotalCOGS
                const grossMargin = totalNetRev > 0 ? grossProfit / totalNetRev : 0
                return (
                  <tr key={i} className={`border-b border-gray-800/50 ${i === 0 ? 'bg-yellow-500/5' : 'hover:bg-gray-800/30'}`}>
                    <td className="px-5 py-3 text-gray-300">{row.label}</td>
                    <td className="px-5 py-3 text-right text-gray-300">{fmtCurrency(adjCost, false)}</td>
                    <td className="px-5 py-3 text-right text-orange-400">{fmtCurrency(adjTotalCOGS)}</td>
                    <td className="px-5 py-3 text-right text-emerald-400">{fmtCurrency(grossProfit)}</td>
                    <td className="px-5 py-3 text-right text-teal-400">{fmtPct(grossMargin)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Monthly COGS Detail — Year 1</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">Month</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Procs</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">VenaSeal</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">RF</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Sclero</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Varithena</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Post-Proc</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Misc</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-400 font-medium">Total COGS</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-2.5 text-gray-300 font-medium">{MONTH_LABELS[i]}</td>
                    <td className="px-4 py-2.5 text-right text-blue-400">{m.procs}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtCurrency(m.venasealCost)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtCurrency(m.rfCost)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtCurrency(m.scleroCost)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtCurrency(m.varithenaCost)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtCurrency(m.postProcCost)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{fmtCurrency(m.miscCost)}</td>
                    <td className="px-4 py-2.5 text-right text-orange-400 font-semibold">{fmtCurrency(m.totalCOGS)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-800/30 font-semibold">
                  <td className="px-4 py-2.5 text-gray-200">Total</td>
                  <td className="px-4 py-2.5 text-right text-blue-400">{totalProcs}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtCurrency(totVS)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtCurrency(totRF)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtCurrency(totScl)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtCurrency(totVar)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtCurrency(totPost)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-200">{fmtCurrency(totMisc)}</td>
                  <td className="px-4 py-2.5 text-right text-orange-400">{fmtCurrency(totalCOGS)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
