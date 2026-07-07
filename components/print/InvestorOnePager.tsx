'use client'

import { fmtCurrency, fmtNumber, fmtPct, fmtDecimal } from '@/lib/formatters'

/**
 * InvestorOnePager
 *
 * Print-only, single-page (US Letter) snapshot of the model at the
 * currently-selected scenario and slider inputs. Hidden on screen
 * (`hidden print:block`); the dashboard's screen content is wrapped in
 * `print:hidden`, so window.print() from the Export button renders ONLY
 * this component. Light palette — this is a paper artifact, not the app UI.
 *
 * All numbers are passed in pre-computed from the dashboard so this stays
 * a pure presentational component with zero engine logic (no drift risk
 * against calcAnnualPL).
 */

export interface OnePagerYear {
  label: string
  procs: number
  blendedRate: number
  grossRevenue: number
  mgmtFee: number
  netRevenue: number
  ebitda: number
  ebitdaMargin: number
}

export interface OnePagerProps {
  scenarioLabel: string
  scenarioSub: string
  inputs: { label: string; value: string }[]
  kpis: { label: string; value: string; sub?: string }[]
  years: OnePagerYear[]
  bridge: {
    leads: number
    contacts: number
    booked: number
    shows: number
    treated: number
    procs: number
    rev: number
  }
  maxCapacity: number
}

const TEAL = '#4A8C89'

export function InvestorOnePager({ scenarioLabel, scenarioSub, inputs, kpis, years, bridge, maxCapacity }: OnePagerProps) {
  const bridgeRows = [
    { stage: 'Leads', total: bridge.leads, rate: null as number | null },
    { stage: 'Contacts', total: bridge.contacts, rate: bridge.leads > 0 ? bridge.contacts / bridge.leads : 0 },
    { stage: 'Booked', total: bridge.booked, rate: bridge.contacts > 0 ? bridge.booked / bridge.contacts : 0 },
    { stage: 'Shows', total: bridge.shows, rate: bridge.booked > 0 ? bridge.shows / bridge.booked : 0 },
    { stage: 'Treated', total: bridge.treated, rate: bridge.shows > 0 ? bridge.treated / bridge.shows : 0 },
    { stage: 'Procedures', total: bridge.procs, rate: bridge.treated > 0 ? bridge.procs / bridge.treated : 0 },
  ]

  const plRows: { label: string; fmt: (y: OnePagerYear) => string; strong?: boolean }[] = [
    { label: 'Annual Procedures', fmt: y => fmtNumber(y.procs) },
    { label: 'Avg Gross Rev / Procedure', fmt: y => fmtCurrency(y.blendedRate) },
    { label: 'Gross Revenue', fmt: y => fmtCurrency(y.grossRevenue) },
    { label: 'Mgmt Fee (8%)', fmt: y => fmtCurrency(y.mgmtFee) },
    { label: 'Net Revenue', fmt: y => fmtCurrency(y.netRevenue), strong: true },
    { label: 'EBITDA', fmt: y => fmtCurrency(y.ebitda), strong: true },
    { label: 'EBITDA Margin', fmt: y => fmtPct(y.ebitdaMargin) },
  ]

  return (
    <div id="investor-onepager" className="hidden print:block bg-white text-gray-900" style={{ fontSize: '11px', lineHeight: 1.35 }}>
      {/* Header */}
      <div className="flex items-start justify-between pb-3 mb-4" style={{ borderBottom: `3px solid ${TEAL}` }}>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            CuraVein&trade; Practice Development Model
          </h1>
          <p className="text-gray-600 mt-0.5" style={{ fontSize: '11px' }}>
            Interactive pro forma for launching, acquiring, and scaling a venous disease clinic.
          </p>
        </div>
        <div className="text-right flex-shrink-0 ml-6">
          <div className="font-semibold" style={{ color: TEAL }}>curavein.app</div>
          <div className="text-gray-500" style={{ fontSize: '10px' }} suppressHydrationWarning>
            Snapshot · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Scenario banner */}
      <div className="rounded-md px-3 py-2 mb-4" style={{ backgroundColor: '#eef6f5', border: `1px solid ${TEAL}` }}>
        <span className="font-bold uppercase tracking-wider" style={{ color: TEAL, fontSize: '10px' }}>Active Scenario</span>
        <span className="font-bold text-gray-900 ml-2">{scenarioLabel}</span>
        <span className="text-gray-600 ml-2">— {scenarioSub}</span>
      </div>

      {/* Inputs as entered */}
      <div className="mb-4">
        <h2 className="font-bold uppercase tracking-wider text-gray-500 mb-1.5" style={{ fontSize: '10px' }}>
          Model Inputs (as entered)
        </h2>
        <div className="grid grid-cols-6 gap-2">
          {inputs.map((inp, i) => (
            <div key={i} className="rounded border border-gray-300 px-2 py-1.5">
              <div className="text-gray-500" style={{ fontSize: '9px' }}>{inp.label}</div>
              <div className="font-bold text-gray-900" style={{ fontSize: '13px' }}>{inp.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-4">
        <h2 className="font-bold uppercase tracking-wider text-gray-500 mb-1.5" style={{ fontSize: '10px' }}>
          Key Metrics — Year 1
        </h2>
        <div className="grid grid-cols-6 gap-2">
          {kpis.map((k, i) => (
            <div key={i} className="rounded border border-gray-300 px-2 py-1.5">
              <div className="text-gray-500" style={{ fontSize: '9px' }}>{k.label}</div>
              <div className="font-bold" style={{ fontSize: '13px', color: TEAL }}>{k.value}</div>
              {k.sub && <div className="text-gray-400" style={{ fontSize: '8px' }}>{k.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* 3-Year P&L */}
      <div className="mb-4">
        <h2 className="font-bold uppercase tracking-wider text-gray-500 mb-1.5" style={{ fontSize: '10px' }}>
          3-Year Summary
        </h2>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th className="text-left px-2 py-1.5 font-semibold text-gray-600 border border-gray-300">Metric</th>
              {years.map(y => (
                <th key={y.label} className="text-right px-2 py-1.5 font-semibold text-gray-600 border border-gray-300">{y.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plRows.map((row, i) => (
              <tr key={i} style={row.strong ? { backgroundColor: '#eef6f5' } : undefined}>
                <td className={`px-2 py-1 border border-gray-300 ${row.strong ? 'font-bold' : ''} text-gray-800`}>{row.label}</td>
                {years.map(y => (
                  <td key={y.label} className={`px-2 py-1 border border-gray-300 text-right tabular-nums ${row.strong ? 'font-bold' : ''} text-gray-900`}>
                    {row.fmt(y)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Y1 Funnel Bridge */}
      <div className="mb-4">
        <h2 className="font-bold uppercase tracking-wider text-gray-500 mb-1.5" style={{ fontSize: '10px' }}>
          Year 1 Funnel Bridge
        </h2>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              {bridgeRows.map(r => (
                <th key={r.stage} className="text-right px-2 py-1.5 font-semibold text-gray-600 border border-gray-300">{r.stage}</th>
              ))}
              <th className="text-right px-2 py-1.5 font-semibold text-gray-600 border border-gray-300">Gross Revenue</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {bridgeRows.map(r => (
                <td key={r.stage} className="px-2 py-1 border border-gray-300 text-right tabular-nums font-medium">
                  {fmtNumber(r.total)}
                  {r.rate !== null && <span className="text-gray-400 ml-1" style={{ fontSize: '8px' }}>({fmtPct(r.rate, 0)})</span>}
                </td>
              ))}
              <td className="px-2 py-1 border border-gray-300 text-right tabular-nums font-bold" style={{ color: TEAL }}>
                {fmtCurrency(bridge.rev)}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="text-gray-500 mt-1" style={{ fontSize: '9px' }}>
          Annual totals · stage-to-stage conversion in parentheses · capacity ceiling {fmtDecimal(maxCapacity, 0)} procedures/month.
        </p>
      </div>

      {/* Footer / disclosures */}
      <div className="pt-2 text-gray-500" style={{ borderTop: '1px solid #d1d5db', fontSize: '8.5px' }}>
        Income figures (gross revenue, net revenue, EBITDA) reflect a 10% conservatism buffer; per-procedure and funnel
        metrics are raw operational values. Engine: calcAnnualPL (Excel-aligned v12). Margins are modeled targets, not
        guarantees. Generated from the live interactive model at curavein.app — adjust any assumption and re-export.
        &copy; CuraVein&trade; · Aaron C. Love, DO.
      </div>
    </div>
  )
}
