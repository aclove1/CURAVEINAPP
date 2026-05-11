'use client'

import { INCOME_BUFFER_FACTOR } from '@/lib/defaults'

/**
 * v14.1 — Single-source disclosure block surfaced on Dashboard + P&L.
 * Defines what dollars are included in the per-procedure number (so a
 * reader knows exactly which CPT lines drive each $/procedure value),
 * and notes the conservatism buffers applied to final income figures.
 * Calm visual style — no warning iconography, blends with the dark UI.
 */
export function ModelDisclosure() {
  const haircut = Math.round((1 - INCOME_BUFFER_FACTOR) * 100)
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-lg px-4 py-3 text-[11px] leading-relaxed">
      <div className="text-gray-300">
        <span className="text-gray-100 font-semibold">$/procedure: </span>
        primary ablation{' '}
        <span className="text-gray-500">(36475 RFA · 36482 VenaSeal · 36465/36466 Varithena)</span>
        {' + '}ultrasound allocation{' '}
        <span className="text-gray-500">(93970/93971)</span>
        {' + '}liquid sclero allocation{' '}
        <span className="text-gray-500">(36470/36471)</span>.
      </div>
      <div className="text-gray-300 mt-1.5">
        <span className="text-gray-100 font-semibold">Buffers: </span>
        E&amp;M revenue{' '}
        <span className="text-gray-500">(99203/99204/99213/99214)</span>
        {' '}excluded; final Gross / Net / EBITDA reflect a {haircut}% conservatism haircut.
      </div>
    </div>
  )
}
