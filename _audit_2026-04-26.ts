/* AUDIT 2026-04-26 — reconciliation harness.
 *
 * Run: `npx tsx _audit_2026-04-26.ts`
 *
 * Verifies the C-11 (calcKeyMetrics / calcBreakeven Y1-adjustment) and C-12
 * (medicare + commercial + US == gross) fixes hold for all three scenarios.
 * Keep this file: re-run before any model PR merges. Update with new
 * reconciliation tests as new findings ship.
 */
import { DEFAULT_ASSUMPTIONS } from './lib/defaults'
import {
  calcAnnualPL,
  calcFunnelMonth,
  calcRevenueMonth,
  calcCOGSMonth,
  calcOpexMonth,
  calcPLMonth,
  calcKeyMetrics,
  adjustAssumptionsForYear,
} from './lib/model'

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })
const div = (l: string) => console.log('\n' + '='.repeat(70) + '\n  ' + l + '\n' + '='.repeat(70))

let allPass = true

for (const sc of ['conservative', 'base', 'aggressive'] as const) {
  div(`SCENARIO = ${sc.toUpperCase()}`)
  const a = { ...DEFAULT_ASSUMPTIONS, scenario: sc }
  const adjY1 = adjustAssumptionsForYear(1, a)
  const pl1 = calcAnnualPL(1, a)

  // Test 1 — C-8: page-level adjY1 iteration matches calcAnnualPL.
  let pageProcs = 0, pageGross = 0, pageCOGS = 0, pageOpex = 0
  for (let m = 1; m <= 12; m++) {
    pageProcs += calcFunnelMonth(m, adjY1).cappedProcs
    pageGross += calcRevenueMonth(m, adjY1, 1).grossRevenue
    pageCOGS += calcCOGSMonth(m, adjY1).totalCOGS
    pageOpex += calcOpexMonth(m, adjY1, 1).totalOpex
  }
  const t1 = pageProcs === pl1.totalProcs && pageGross === pl1.grossRevenue && pageCOGS === pl1.totalCOGS && pageOpex === pl1.totalOpex
  console.log(`[C-8 ] Page iter (adjY1) vs calcAnnualPL(1):                 ${t1 ? '✓' : '✗'}`)
  if (!t1) { allPass = false; console.log(`  Δprocs=${pageProcs - pl1.totalProcs}  Δgross=$${fmt(pageGross - pl1.grossRevenue)}`) }

  // Test 2 — C-11: calcKeyMetrics avgMonthlyProcs * 12 == y1TotalProcs.
  const km = calcKeyMetrics(a)
  const t2 = Math.abs(km.avgMonthlyProcs * 12 - km.y1TotalProcs) < 1
  console.log(`[C-11] calcKeyMetrics avgMo×12 == y1TotalProcs:              ${t2 ? '✓' : '✗'}  (avgMo=${km.avgMonthlyProcs.toFixed(2)})`)
  if (!t2) allPass = false

  // Test 3 — C-11: stabilizedMonthlyEbitda == M12 EBITDA (adjY1).
  const m12 = calcPLMonth(12, adjY1, 1)
  const t3 = km.stabilizedMonthlyEbitda === m12.ebitda
  console.log(`[C-11] stabilizedMonthlyEbitda == M12 PL EBITDA (adjY1):     ${t3 ? '✓' : '✗'}  ($${fmt(km.stabilizedMonthlyEbitda)})`)
  if (!t3) allPass = false

  // Test 4 — C-11: monthsAtCapacity uses adjY1 cap.
  let expectedCap = 0
  for (let m = 1; m <= 12; m++) if (calcFunnelMonth(m, adjY1).cappedProcs >= adjY1.maxCapacityPerMonth) expectedCap++
  const t4 = km.monthsAtCapacity === expectedCap
  console.log(`[C-11] monthsAtCapacity uses adjY1 cap (${adjY1.maxCapacityPerMonth}/mo):${' '.repeat(Math.max(0, 14 - String(adjY1.maxCapacityPerMonth).length))}${t4 ? '✓' : '✗'}  (km=${km.monthsAtCapacity}/${expectedCap})`)
  if (!t4) allPass = false

  // Test 5 — C-12: medicare + commercial + us == gross every month (exact).
  let maxDelta = 0
  for (let m = 1; m <= 12; m++) {
    const r = calcRevenueMonth(m, adjY1, 1)
    const delta = Math.abs(r.medicareRevenue + r.commercialRevenue + r.usRevenue - r.grossRevenue)
    if (delta > maxDelta) maxDelta = delta
  }
  const t5 = maxDelta === 0
  console.log(`[C-12] med + comm + us == gross (per-month, exact):          ${t5 ? '✓' : '✗'}  (maxΔ=$${maxDelta})`)
  if (!t5) allPass = false

  console.log(`Y1 ground truth: procs=${pl1.totalProcs}  gross=$${fmt(pl1.grossRevenue)}  ebitda=$${fmt(pl1.ebitda)}  margin=${(pl1.ebitdaMargin*100).toFixed(1)}%  break-even=M${km.breakevenMonth}`)
}

div(allPass ? 'ALL TESTS PASS ✓' : 'TESTS FAILED ✗')
process.exit(allPass ? 0 : 1)
