'use client'

import { INCOME_BUFFER_FACTOR } from '@/lib/defaults'
import { useModelStore } from '@/lib/store'
import { effectiveProcsPerPatient } from '@/lib/model'
import { fmtCurrency } from '@/lib/formatters'

/**
 * v14.1 — Single-source disclosure block surfaced on Dashboard + P&L.
 * Defines what dollars are included in the per-procedure number and notes
 * the conservatism buffers applied to final income figures.
 *
 * Two responsive variants:
 *   - Desktop (md+): plain-English copy + live per-procedure $ values
 *     (US allocation and sclero allocation at the active scenario).
 *   - Mobile (<md):  compact phrasing, no CPT codes, larger font for
 *                    on-the-phone readability.
 *
 * Live values are derived from the active scenario so the disclosure
 * always reflects the same numbers the dashboard tiles are showing.
 */
export function ModelDisclosure() {
  const { assumptions } = useModelStore()
  const haircut = Math.round((1 - INCOME_BUFFER_FACTOR) * 100)

  const procsPerPt   = effectiveProcsPerPatient(assumptions)
  const usPerPt      = assumptions.usRevenuePerPatient[assumptions.scenario]
  const scleroPerPt  = assumptions.scleroRevenuePerPatient[assumptions.scenario]
  const usPerProc    = procsPerPt > 0 ? usPerPt / procsPerPt : 0
  const scleroPerProc = procsPerPt > 0 ? scleroPerPt / procsPerPt : 0

  return (
    <>
      {/* ── DESKTOP (md+) ─ plain-English, one size up, with live $ values ── */}
      <div className="hidden md:block bg-gray-900/60 border border-gray-800 rounded-lg px-5 py-4 text-sm leading-relaxed text-gray-300">
        <p>
          A <span className="text-white font-semibold">procedure</span> is one
          ablation (RFA or VenaSeal) or one Varithena treatment.{' '}
          <span className="text-white font-semibold">$/procedure</span>{' '}
          = the primary procedure plus the patient&apos;s average ultrasound and
          liquid sclerotherapy revenue allocated per procedure
          {' '}(currently{' '}
          <span className="text-gray-100 font-semibold">{fmtCurrency(usPerProc, false)}</span>
          {' '}US and{' '}
          <span className="text-gray-100 font-semibold">{fmtCurrency(scleroPerProc, false)}</span>
          {' '}sclero per procedure at the active scenario).
        </p>
        <p className="mt-2">
          <span className="text-white font-semibold">Conservatism: </span>
          E&amp;M revenue is excluded from gross revenue as one buffer; final
          year-end EBITDA also reflects a {haircut}% haircut.
        </p>
      </div>

      {/* ── MOBILE (<md) ─ compact, no CPT codes, two sizes up ─────────────── */}
      <div className="md:hidden bg-gray-900/60 border border-gray-800 rounded-lg px-4 py-3 text-base leading-relaxed text-gray-300">
        <p>
          <span className="text-white font-semibold">$/procedure</span> = one
          ablation or Varithena + the per-procedure share of ultrasound and
          liquid sclero revenue (
          <span className="text-gray-100 font-semibold">{fmtCurrency(usPerProc, false)}</span>
          {' '}US and{' '}
          <span className="text-gray-100 font-semibold">{fmtCurrency(scleroPerProc, false)}</span>
          {' '}sclero).
        </p>
        <p className="mt-1.5">
          <span className="text-white font-semibold">Buffers: </span>
          E&amp;M excluded from gross revenue; {haircut}% haircut on year-end EBITDA.
        </p>
      </div>
    </>
  )
}
