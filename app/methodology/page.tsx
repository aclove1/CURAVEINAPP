'use client'

import { useMemo } from 'react'
import { useModelStore } from '@/lib/store'
import { TopBar } from '@/components/layout/TopBar'
import {
  calcOverallBlendedRate,
  effectiveProcsPerPatient,
  effectiveCommercialShare,
  netRealizationMultiplier,
} from '@/lib/model'
import { INCOME_BUFFER_FACTOR, applyIncomeBuffer } from '@/lib/defaults'
import { fmtCurrency, fmtPct, fmtDecimal } from '@/lib/formatters'

// v14.1 — METHODOLOGY PAGE
// Investor-facing "show your work" page. Defines what a procedure is
// financially and makes the $/procedure number line-by-line auditable.
// Reactive to the current scenario (Down / Base / Up / Hybrid).

const PRIMARY_CPTS = [
  { code: '36482', name: 'VenaSeal — Cyanoacrylate Closure',           medicareRate: 1452.78, mixPct: 0.65 },
  { code: '36465', name: 'Varithena foam — single segment',            medicareRate: 1122.16, mixPct: 0.15 },
  { code: '36466', name: 'Varithena foam — multiple segments',         medicareRate: 1253.75, mixPct: 0.10 },
  { code: '36475', name: 'RFA — Endovenous Radiofrequency',            medicareRate: 1700.00, mixPct: 0.10 },
]

export default function MethodologyPage() {
  const { assumptions } = useModelStore()

  // Scenario multiplier = (govShare + commShare × commercial multiplier) × realization
  // Same construction used inside calcOverallBlendedRate — kept inline here so
  // the methodology page is self-documenting and traceable to the engine.
  const buildup = useMemo(() => {
    const commShare = effectiveCommercialShare(assumptions)
    const govShare = 1 - commShare
    const commMult = assumptions.commercialMultiplier[assumptions.scenario]
    const realization = netRealizationMultiplier(assumptions)
    const scenarioMult = (govShare + commShare * commMult) * realization

    const primaryRows = PRIMARY_CPTS.map(c => {
      const adjRate = c.medicareRate * scenarioMult
      const contribution = adjRate * c.mixPct
      return { ...c, adjRate, contribution }
    })
    const weightedPrimary = primaryRows.reduce((s, r) => s + r.contribution, 0)
    const engineBlended = calcOverallBlendedRate(assumptions)

    const procsPerPt = effectiveProcsPerPatient(assumptions)
    const usPerPt = assumptions.usRevenuePerPatient[assumptions.scenario]
    const scleroPerPt = assumptions.scleroRevenuePerPatient[assumptions.scenario]

    const usPerProc = procsPerPt > 0 ? usPerPt / procsPerPt : 0
    const scleroPerProc = procsPerPt > 0 ? scleroPerPt / procsPerPt : 0
    const bundleSubtotal = usPerProc + scleroPerProc

    const rawTotal = weightedPrimary + bundleSubtotal
    const bufferedTotal = applyIncomeBuffer(rawTotal)

    return {
      commShare, govShare, commMult, realization, scenarioMult,
      primaryRows, weightedPrimary, engineBlended,
      procsPerPt, usPerPt, scleroPerPt,
      usPerProc, scleroPerProc, bundleSubtotal,
      rawTotal, bufferedTotal,
    }
  }, [assumptions])

  const scenarioLabel: Record<string, string> = {
    conservative: 'Downside',
    base:         'Base',
    aggressive:   'Upside',
    hybridWound:  'Hybrid Wound Care',
  }
  const sLabel = scenarioLabel[assumptions.scenario] ?? assumptions.scenario
  const haircut = Math.round((1 - INCOME_BUFFER_FACTOR) * 100)

  return (
    <div>
      <TopBar title="Methodology — $/Procedure Build" />
      <div className="p-6 space-y-6 max-w-5xl">

        {/* ── Methodology text ─────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[#5faaa6]">What is a procedure?</h2>
          <p className="text-[13px] text-gray-300 leading-relaxed">
            A <span className="text-white font-semibold">procedure</span> in this calculator represents
            one primary truncal ablation plus its allocated share of the patient&apos;s diagnostic and
            follow-up care. Every dollar in the per-procedure number traces to a billable CPT we
            actually deliver — there is no goodwill, no projected uplift, and no unattributed revenue.
          </p>
          <div className="text-[13px] text-gray-300 leading-relaxed">
            <span className="text-white font-semibold">Build:</span>
            <ol className="list-decimal ml-5 mt-1.5 space-y-1 text-gray-300">
              <li>
                Pick the primary CPT — <span className="text-gray-100">36475 RFA</span> · {' '}
                <span className="text-gray-100">36482 VenaSeal</span> · {' '}
                <span className="text-gray-100">36465 / 36466 Varithena foam</span>.
                Apply payer mix &times; commercial multiplier &times; net realization to get
                the actual collected rate.
              </li>
              <li>
                Weight by procedure mix (VenaSeal 65% / Varithena 25% / RFA 10%) to get the
                blended <span className="text-gray-100">Primary $/procedure</span>.
              </li>
              <li>
                Add the per-procedure share of bundled per-patient lines:
                {' '}<span className="text-gray-100">ultrasound (93970 / 93971)</span> and
                {' '}<span className="text-gray-100">liquid sclerotherapy (36470 / 36471)</span>.
                Allocation divisor = average primary procedures per patient.
              </li>
              <li>
                Apply a {haircut}% conservatism buffer to the final number for investor presentation.
                {' '}<span className="text-gray-100">E&amp;M revenue (99203 / 99204 / 99213 / 99214)</span>
                {' '}is excluded entirely as an additional buffer.
              </li>
            </ol>
          </div>
          <p className="text-[11px] text-gray-400 italic">
            Active scenario: <span className="text-[#5faaa6] font-semibold">{sLabel}</span>.
            Toggle scenarios on the Dashboard to see this page update live.
          </p>
        </section>

        {/* ── Scenario multiplier line ─────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#5faaa6] mb-3">Scenario Multiplier ({sLabel})</h2>
          <div className="font-mono text-[13px] text-gray-300 leading-relaxed">
            ({fmtPct(buildup.govShare)} govt + {fmtPct(buildup.commShare)} comm × {fmtDecimal(buildup.commMult, 3)})
            {' × '}
            {fmtDecimal(buildup.realization, 2)} realization
            {' = '}
            <span className="text-[#5faaa6] font-semibold">{fmtDecimal(buildup.scenarioMult, 3)}</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Applied to every primary CPT&apos;s Medicare rate to get the actual collected rate.
            Commercial multiplier {fmtDecimal(buildup.commMult, 3)} = BCBS 30% × 1.30 + other commercial 70% × 1.58.
            Net realization = collections net of denials &amp; write-offs.
          </p>
        </section>

        {/* ── Primary CPT Mix ──────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-[#5faaa6]">Primary CPT Mix</h2>
            <p className="text-[11px] text-gray-400 mt-1">
              Each procedure encounter bills one of these four codes. Weighted by volume share.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-[11px] text-gray-400">
                <th className="text-left  px-5 py-2.5 font-medium">CPT</th>
                <th className="text-left  px-3 py-2.5 font-medium">Description</th>
                <th className="text-right px-3 py-2.5 font-medium">Mix</th>
                <th className="text-right px-3 py-2.5 font-medium">Medicare</th>
                <th className="text-right px-3 py-2.5 font-medium">× Scenario Mult</th>
                <th className="text-right px-5 py-2.5 font-medium">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {buildup.primaryRows.map(r => (
                <tr key={r.code} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-5 py-2.5 font-mono text-teal-400 font-semibold">{r.code}</td>
                  <td className="px-3 py-2.5 text-gray-300">{r.name}</td>
                  <td className="px-3 py-2.5 text-right text-gray-400">{fmtPct(r.mixPct)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-300">{fmtCurrency(r.medicareRate, false)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-200">{fmtCurrency(r.adjRate, false)}</td>
                  <td className="px-5 py-2.5 text-right text-emerald-400 font-semibold">{fmtCurrency(r.contribution, false)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-800/40 border-t border-gray-800">
                <td colSpan={5} className="px-5 py-3 text-sm font-semibold text-gray-100">Weighted Primary $/procedure</td>
                <td className="px-5 py-3 text-right text-emerald-400 font-bold">{fmtCurrency(buildup.weightedPrimary, false)}</td>
              </tr>
              <tr className="border-t border-gray-800/50">
                <td colSpan={5} className="px-5 py-2 text-[11px] text-gray-400 italic">
                  Engine value (calcOverallBlendedRate) for reconciliation
                </td>
                <td className="px-5 py-2 text-right text-[11px] text-gray-400 font-mono">{fmtCurrency(buildup.engineBlended, false)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* ── Bundle Per Patient ───────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-[#5faaa6]">Bundle Per Patient</h2>
            <p className="text-[11px] text-gray-400 mt-1">
              Per-patient revenue lines allocated across the patient&apos;s primary procedures
              (divisor: <span className="text-gray-200 font-mono">{fmtDecimal(buildup.procsPerPt, 2)}</span> procs/patient,{' '}
              active scenario).
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-[11px] text-gray-400">
                <th className="text-left  px-5 py-2.5 font-medium">Line</th>
                <th className="text-left  px-3 py-2.5 font-medium">CPTs</th>
                <th className="text-right px-3 py-2.5 font-medium">Per Patient</th>
                <th className="text-right px-3 py-2.5 font-medium">÷ {fmtDecimal(buildup.procsPerPt, 2)}</th>
                <th className="text-right px-5 py-2.5 font-medium">$/procedure</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-5 py-2.5 text-gray-200 font-medium">Ultrasound</td>
                <td className="px-3 py-2.5 font-mono text-gray-400 text-xs">93970 · 93971</td>
                <td className="px-3 py-2.5 text-right text-gray-300">{fmtCurrency(buildup.usPerPt, false)}</td>
                <td className="px-3 py-2.5 text-right text-gray-400 font-mono text-[11px]">{fmtCurrency(buildup.usPerPt, false)} ÷ {fmtDecimal(buildup.procsPerPt, 2)}</td>
                <td className="px-5 py-2.5 text-right text-emerald-400 font-semibold">{fmtCurrency(buildup.usPerProc, false)}</td>
              </tr>
              <tr className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-5 py-2.5 text-gray-200 font-medium">Liquid sclerotherapy</td>
                <td className="px-3 py-2.5 font-mono text-gray-400 text-xs">36470 · 36471</td>
                <td className="px-3 py-2.5 text-right text-gray-300">{fmtCurrency(buildup.scleroPerPt, false)}</td>
                <td className="px-3 py-2.5 text-right text-gray-400 font-mono text-[11px]">{fmtCurrency(buildup.scleroPerPt, false)} ÷ {fmtDecimal(buildup.procsPerPt, 2)}</td>
                <td className="px-5 py-2.5 text-right text-emerald-400 font-semibold">{fmtCurrency(buildup.scleroPerProc, false)}</td>
              </tr>
              <tr className="border-b border-gray-800/50 bg-gray-950/40">
                <td className="px-5 py-2.5 text-gray-400 italic">E&amp;M (excluded as buffer)</td>
                <td className="px-3 py-2.5 font-mono text-gray-500 text-xs">99203 · 99204 · 99213 · 99214</td>
                <td className="px-3 py-2.5 text-right text-gray-500 italic">~$654 real-world</td>
                <td className="px-3 py-2.5 text-right text-gray-500 italic">held out</td>
                <td className="px-5 py-2.5 text-right text-gray-500 font-mono">$0</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-gray-800/40 border-t border-gray-800">
                <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-gray-100">Bundle subtotal</td>
                <td className="px-5 py-3 text-right text-emerald-400 font-bold">{fmtCurrency(buildup.bundleSubtotal, false)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* ── Final $/procedure ─────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-[#5faaa6]">Final $/procedure ({sLabel})</h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-800/50">
                <td className="px-5 py-2.5 text-gray-300">Weighted Primary CPT</td>
                <td className="px-5 py-2.5 text-right text-gray-200 font-mono">{fmtCurrency(buildup.weightedPrimary, false)}</td>
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="px-5 py-2.5 text-gray-300">+ Bundle allocation (US + sclero)</td>
                <td className="px-5 py-2.5 text-right text-gray-200 font-mono">{fmtCurrency(buildup.bundleSubtotal, false)}</td>
              </tr>
              <tr className="border-b border-gray-800 bg-gray-800/30">
                <td className="px-5 py-3 text-gray-100 font-semibold">Raw modeled $/procedure</td>
                <td className="px-5 py-3 text-right text-emerald-400 font-bold">{fmtCurrency(buildup.rawTotal, false)}</td>
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="px-5 py-2.5 text-gray-400">× {haircut}% conservatism buffer ({INCOME_BUFFER_FACTOR.toFixed(2)})</td>
                <td className="px-5 py-2.5 text-right text-gray-400 font-mono">× {INCOME_BUFFER_FACTOR.toFixed(2)}</td>
              </tr>
              <tr className="bg-emerald-900/15">
                <td className="px-5 py-3 text-gray-100 font-bold">Dashboard $/procedure (buffered)</td>
                <td className="px-5 py-3 text-right text-emerald-300 font-bold text-base">{fmtCurrency(buildup.bufferedTotal, false)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── Reconciliation note ──────────────────────────────────── */}
        <section className="bg-gray-900/40 border border-gray-800 rounded-lg px-5 py-3 text-[11px] text-gray-400 leading-relaxed">
          <span className="text-gray-200 font-semibold">Reconciliation:</span>{' '}
          The engine reconciles every month to{' '}
          <span className="font-mono text-gray-300">grossRevenue = medicareRevenue + commercialRevenue + usRevenue + scleroRevenue</span>{' '}
          with zero rounding delta. The Y1 dashboard average is slightly lower than the mature
          rate shown above because months 1–5 use a credentialing-ramped blended rate
          (commercial credentialing builds gradually). Full per-month detail is at{' '}
          <a href="/api/audit" className="text-[#5faaa6] hover:underline">/api/audit</a>.
        </section>

      </div>
    </div>
  )
}
