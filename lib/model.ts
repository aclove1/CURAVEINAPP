import type {
  Assumptions,
  PayerWeights,
  ProcedurePayerRates,
  ProcedureMix,
  FunnelMonth,
  RevenueMonth,
  COGSMonth,
  OpexMonth,
  PLMonth,
  AnnualPL,
  KeyMetrics,
} from './types'

function sv(obj: { conservative: number; base: number; aggressive: number }, scenario: string): number {
  return obj[scenario as keyof typeof obj]
}

function svArr(obj: { conservative: number[]; base: number[]; aggressive: number[] }, scenario: string): number[] {
  return obj[scenario as keyof typeof obj]
}

/* ── Step 4 — Normalization + Safety Utilities ───────────── */

export function normalizeWeights<T extends Record<string, number>>(obj: T): T {
  const sum = Object.values(obj).reduce((a, b) => a + b, 0)
  if (!sum) return obj
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v / sum])
  ) as T
}

export function safeDivide(a: number, b: number): number {
  return !b || !isFinite(b) ? 0 : a / b
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

/* ── Mix normalization ────────────────────────────────────── */

export function normalizeProcedureMix(a: Assumptions): { vs: number; rf: number; sclero: number; varithena: number } {
  const mix: ProcedureMix = { vsMix: a.vsMix, rfMix: a.rfMix, scleroMix: a.scleroMix, varithenaShare: a.varithenaShare }
  const norm = normalizeWeights(mix)
  return { vs: norm.vsMix, rf: norm.rfMix, sclero: norm.scleroMix, varithena: norm.varithenaShare }
}

export function normalizePayerMix(mix: PayerWeights): PayerWeights {
  return normalizeWeights(mix)
}

/* ── Payer-blended reimbursement ──────────────────────────── */

export function getBlendedPayerRate(rates: ProcedurePayerRates, mix: PayerWeights): number {
  const nm = normalizePayerMix(mix)
  return (
    rates.aetna * nm.aetna +
    rates.bcbs * nm.bcbs +
    rates.humana * nm.humana +
    rates.uhc * nm.uhc +
    rates.medicare * nm.medicare
  )
}

/* ── Step 5 — Varithena blended rate (three-step) ────────── */

export function calcVarithenaBlendedRate(a: Assumptions): number {
  // STEP A — payer-weight CPT 36465
  const blended36465: number =
    (a.varithenaRates36465.aetna    * a.payerMix.aetna)   +
    (a.varithenaRates36465.bcbs     * a.payerMix.bcbs)    +
    (a.varithenaRates36465.humana   * a.payerMix.humana)  +
    (a.varithenaRates36465.uhc      * a.payerMix.uhc)     +
    (a.varithenaRates36465.medicare * a.payerMix.medicare)

  // STEP B — payer-weight CPT 36466
  const blended36466: number =
    (a.varithenaRates36466.aetna    * a.payerMix.aetna)   +
    (a.varithenaRates36466.bcbs     * a.payerMix.bcbs)    +
    (a.varithenaRates36466.humana   * a.payerMix.humana)  +
    (a.varithenaRates36466.uhc      * a.payerMix.uhc)     +
    (a.varithenaRates36466.medicare * a.payerMix.medicare)

  // STEP C — CPT-weight the two blended values
  const varithenaBlendedRate: number = (blended36465 * 0.7) + (blended36466 * 0.3)

  return varithenaBlendedRate
}

/* ── Step 6 — Varithena cost ──────────────────────────────── */

export function calcVarithenaCostPerProc(a: Assumptions): number {
  const sclerotherapyCost = a.scleroSupplyCost * (1 + a.scleroBuffer) * (1 + a.wasteFactor)
  return (0.75 * sclerotherapyCost) + a.varithenaDrugCost
}

/* ── Funnel ───────────────────────────────────────────────── */

export function calcFunnelMonth(month: number, a: Assumptions): FunnelMonth {
  const idx = month - 1
  const spend = svArr(a.marketingSpend, a.scenario)[idx] ?? 0
  const cpl = sv(a.cpl, a.scenario)
  const leads = Math.floor(spend / cpl)
  const contacts = Math.floor(leads * sv(a.contactRate, a.scenario))
  const booked = Math.floor(contacts * sv(a.bookingRate, a.scenario))
  const shows = Math.floor(booked * sv(a.showRate, a.scenario))
  const treated = Math.floor(shows * sv(a.treatmentConversion, a.scenario))
  const rawProcs = Math.round(treated * sv(a.procsPerPatient, a.scenario))
  const cappedProcs = Math.min(rawProcs, a.maxCapacityPerMonth)
  const utilization = cappedProcs / a.maxCapacityPerMonth
  const excessDemand = Math.max(0, rawProcs - a.maxCapacityPerMonth)
  return { month, leads, contacts, booked, shows, treated, rawProcs, cappedProcs, utilization, excessDemand, marketingSpend: spend }
}

/* ── Blended rates (legacy ablation/sclero + Varithena) ──── */

export function calcBlendedRate(a: Assumptions): number {
  const medicareRate = sv(a.medicareRate, a.scenario)
  const multiplier = sv(a.commercialMultiplier, a.scenario)
  return Math.round(medicareRate * (a.medicareMix + a.commercialMix * multiplier))
}

export function calcOverallBlendedRate(a: Assumptions): number {
  const mix = normalizeProcedureMix(a)
  const nonVarithenaRate = calcBlendedRate(a)
  const varithenaRate = calcVarithenaBlendedRate(a)
  return Math.round(
    (mix.vs + mix.rf + mix.sclero) * nonVarithenaRate +
    mix.varithena * varithenaRate
  )
}

/* ── Revenue ──────────────────────────────────────────────── */

export function calcRevenueMonth(month: number, a: Assumptions): RevenueMonth {
  const funnel = calcFunnelMonth(month, a)
  const procs = funnel.cappedProcs
  const blendedRate = calcOverallBlendedRate(a)
  const medicareRate = sv(a.medicareRate, a.scenario)
  const commercialRate = Math.round(medicareRate * sv(a.commercialMultiplier, a.scenario))
  const grossRevenue = procs * blendedRate
  const managementFee = -Math.round(a.managementFeeRate * grossRevenue)
  const netRevenue = grossRevenue + managementFee
  const medicareRevenue = Math.round(procs * a.medicareMix * medicareRate)
  const commercialRevenue = Math.round(procs * a.commercialMix * commercialRate)
  return { month, blendedRate, grossRevenue, managementFee, netRevenue, medicareRevenue, commercialRevenue, procs }
}

/* ── COGS ─────────────────────────────────────────────────── */

export function calcWeightedSupplyCost(a: Assumptions): number {
  const mix = normalizeProcedureMix(a)
  const venasealPerProc = (a.venasealUnitCost / a.venasealPtsPerKit) * (1 + a.wasteFactor)
  const rfPerProc = a.rfSupplyCost * (1 + a.wasteFactor)
  const scleroPerProc = a.scleroSupplyCost * (1 + a.scleroBuffer) * (1 + a.wasteFactor)
  const varithenaPerProc = calcVarithenaCostPerProc(a)
  return (
    mix.vs * venasealPerProc +
    mix.rf * rfPerProc +
    mix.sclero * scleroPerProc +
    mix.varithena * varithenaPerProc +
    a.miscConsumables +
    a.postProcSupport
  )
}

export function calcCOGSMonth(month: number, a: Assumptions): COGSMonth {
  const funnel = calcFunnelMonth(month, a)
  const procs = funnel.cappedProcs
  const mix = normalizeProcedureMix(a)
  const venasealCost = Math.round(procs * mix.vs * (a.venasealUnitCost / a.venasealPtsPerKit) * (1 + a.wasteFactor))
  const rfCost = Math.round(procs * mix.rf * a.rfSupplyCost * (1 + a.wasteFactor))
  const scleroCost = Math.round(procs * mix.sclero * a.scleroSupplyCost * (1 + a.scleroBuffer) * (1 + a.wasteFactor))
  const varithenaCost = Math.round(procs * mix.varithena * calcVarithenaCostPerProc(a))
  const postProcCost = Math.round(procs * a.postProcSupport)
  const miscCost = Math.round(procs * a.miscConsumables)
  const totalCOGS = venasealCost + rfCost + scleroCost + varithenaCost + postProcCost + miscCost
  return { month, venasealCost, rfCost, scleroCost, varithenaCost, postProcCost, miscCost, totalCOGS, procs }
}

/* ── OpEx ─────────────────────────────────────────────────── */

export function calcPersonnelCost(a: Assumptions): number {
  const baseSalaries = a.physicianSalary + a.rvtSalary + a.maSalary + a.frontOfficeSalary
  return Math.round(baseSalaries * (1 + a.payrollTaxRate + a.benefitsRate) / 12)
}

export function calcOpexMonth(month: number, a: Assumptions): OpexMonth {
  const idx = month - 1
  const marketing = svArr(a.marketingSpend, a.scenario)[idx] ?? 0
  const personnelTotal = calcPersonnelCost(a)
  const rev = calcRevenueMonth(month, a)
  const billingCost = Math.round(a.billing + rev.grossRevenue * 0.02)
  const totalOpex = personnelTotal + marketing + a.rent + a.malpractice + a.emr + billingCost
  return { month, personnelTotal, marketing, rent: a.rent, malpractice: a.malpractice, emr: a.emr, billing: billingCost, totalOpex }
}

/* ── Monthly P&L ──────────────────────────────────────────── */

export function calcPLMonth(month: number, a: Assumptions): PLMonth {
  const rev = calcRevenueMonth(month, a)
  const cogs = calcCOGSMonth(month, a)
  const opex = calcOpexMonth(month, a)
  const grossProfit = rev.netRevenue - cogs.totalCOGS
  const grossMargin = rev.netRevenue > 0 ? grossProfit / rev.netRevenue : 0
  const ebitda = grossProfit - opex.totalOpex
  const ebitdaMargin = rev.netRevenue > 0 ? ebitda / rev.netRevenue : 0
  return {
    month,
    grossRevenue: rev.grossRevenue,
    managementFee: rev.managementFee,
    netRevenue: rev.netRevenue,
    totalCOGS: cogs.totalCOGS,
    grossProfit,
    grossMargin,
    totalOpex: opex.totalOpex,
    ebitda,
    ebitdaMargin,
    procs: rev.procs,
  }
}

/* ── Year-over-year conversion rate improvements ─────────── */

const CONVERSION_CAPS = {
  contactRate: 0.55,
  bookingRate: 0.70,
  showRate: 0.85,
  treatmentConversion: 0.75,
}

const Y2_IMPROVEMENT = 0.10
const Y3_IMPROVEMENT = 0.15

function boostScenarioValues(
  base: { conservative: number; base: number; aggressive: number },
  factor: number,
  cap: number,
): { conservative: number; base: number; aggressive: number } {
  return {
    conservative: Math.min(base.conservative * (1 + factor), cap),
    base: Math.min(base.base * (1 + factor), cap),
    aggressive: Math.min(base.aggressive * (1 + factor), cap),
  }
}

function adjustAssumptionsForYear(year: 1 | 2 | 3, a: Assumptions): Assumptions {
  if (year === 1) return a

  // Y2: 10% improvement on Y1 base rates
  const y2 = {
    ...a,
    contactRate: boostScenarioValues(a.contactRate, Y2_IMPROVEMENT, CONVERSION_CAPS.contactRate),
    bookingRate: boostScenarioValues(a.bookingRate, Y2_IMPROVEMENT, CONVERSION_CAPS.bookingRate),
    showRate: boostScenarioValues(a.showRate, Y2_IMPROVEMENT, CONVERSION_CAPS.showRate),
    treatmentConversion: boostScenarioValues(a.treatmentConversion, Y2_IMPROVEMENT, CONVERSION_CAPS.treatmentConversion),
  }
  if (year === 2) return y2

  // Y3: 15% improvement on top of Y2 rates
  return {
    ...y2,
    contactRate: boostScenarioValues(y2.contactRate, Y3_IMPROVEMENT, CONVERSION_CAPS.contactRate),
    bookingRate: boostScenarioValues(y2.bookingRate, Y3_IMPROVEMENT, CONVERSION_CAPS.bookingRate),
    showRate: boostScenarioValues(y2.showRate, Y3_IMPROVEMENT, CONVERSION_CAPS.showRate),
    treatmentConversion: boostScenarioValues(y2.treatmentConversion, Y3_IMPROVEMENT, CONVERSION_CAPS.treatmentConversion),
  }
}

/* ── Step 8 — Annual P&L (funnel-driven) ─────────────────── */

export function calcAnnualPL(year: 1 | 2 | 3, a: Assumptions): AnnualPL {
  const FIXED_OPEX = 706000

  const adj = adjustAssumptionsForYear(year, a)

  let totalProcs = 0
  let grossRevenue = 0
  let totalCOGS = 0

  for (let m = 1; m <= 12; m++) {
    const pl = calcPLMonth(m, adj)
    totalProcs += pl.procs
    grossRevenue += pl.grossRevenue
    totalCOGS += pl.totalCOGS
  }

  const managementFee = -Math.round(a.managementFeeRate * grossRevenue)
  const netRevenue = grossRevenue + managementFee
  const grossProfit = netRevenue - totalCOGS
  const grossMargin = netRevenue > 0 ? grossProfit / netRevenue : 0
  const totalOpex = FIXED_OPEX
  const ebitda = roundCurrency(grossRevenue - totalCOGS - FIXED_OPEX)
  const ebitdaMargin = netRevenue > 0 ? ebitda / netRevenue : 0

  console.group(`[CuraVein Diag] calcAnnualPL — Y${year}`)
  console.log('Conversion rates (funnel-driven):')
  console.log('  contactRate:', sv(adj.contactRate, adj.scenario).toFixed(4))
  console.log('  bookingRate:', sv(adj.bookingRate, adj.scenario).toFixed(4))
  console.log('  showRate:', sv(adj.showRate, adj.scenario).toFixed(4))
  console.log('  treatmentConversion:', sv(adj.treatmentConversion, adj.scenario).toFixed(4))
  console.log('  procsPerPatient:', sv(adj.procsPerPatient, adj.scenario))
  if (year >= 2) console.log('  Y2 improvement: +10%, caps:', JSON.stringify(CONVERSION_CAPS))
  if (year === 3) console.log('  Y3 improvement: +15% on Y2 rates, same caps')
  console.log('Volume (from funnel):')
  console.log('  totalProcs:', totalProcs, ' monthlyAvg:', (totalProcs / 12).toFixed(1))
  console.log('  grossRevenue:', grossRevenue)
  console.log('  totalCOGS:', totalCOGS)
  console.log('  EBITDA:', ebitda)
  console.groupEnd()

  return { year, grossRevenue, managementFee, netRevenue, totalCOGS, grossProfit, grossMargin, totalOpex, ebitda, ebitdaMargin, totalProcs }
}

/* ── Breakeven ────────────────────────────────────────────── */

export function calcBreakeven(a: Assumptions): { monthlyBreakevenProcs: number; breakevenMonth: number | null } {
  const blendedRate = calcOverallBlendedRate(a)
  const weightedCogs = calcWeightedSupplyCost(a)
  const fixedMonthly = calcPersonnelCost(a) + a.rent + a.malpractice + a.emr + a.billing
  const contributionMarginRate = blendedRate * (1 - a.managementFeeRate) - weightedCogs
  const monthlyBreakevenProcs = contributionMarginRate > 0 ? Math.ceil(safeDivide(fixedMonthly, contributionMarginRate)) : 9999

  let breakevenMonth: number | null = null
  let cumulativeProfit = 0
  for (let m = 1; m <= 12; m++) {
    const pl = calcPLMonth(m, a)
    cumulativeProfit += pl.ebitda
    if (cumulativeProfit > 0 && breakevenMonth === null) {
      breakevenMonth = m
    }
  }
  if (breakevenMonth === null) {
    for (let m = 13; m <= 36; m++) {
      const baseMonth = ((m - 1) % 12) + 1
      const pl = calcPLMonth(baseMonth, a)
      cumulativeProfit += pl.ebitda
      if (cumulativeProfit > 0) { breakevenMonth = m; break }
    }
  }

  return { monthlyBreakevenProcs, breakevenMonth }
}

/* ── Key Metrics ──────────────────────────────────────────── */

export function calcKeyMetrics(a: Assumptions): KeyMetrics {
  let totalProcs = 0
  let totalGrossRevenue = 0
  let totalCOGS = 0
  let totalMarketing = 0
  let totalTreated = 0
  const monthlyEbitdas: number[] = []

  for (let m = 1; m <= 12; m++) {
    const pl = calcPLMonth(m, a)
    const funnel = calcFunnelMonth(m, a)
    totalProcs += pl.procs
    totalGrossRevenue += pl.grossRevenue
    totalCOGS += pl.totalCOGS
    totalMarketing += funnel.marketingSpend
    totalTreated += funnel.treated
    monthlyEbitdas.push(pl.ebitda)
  }

  const avgMonthlyProcs = totalProcs / 12
  const revenuePerProc = totalProcs > 0 ? totalGrossRevenue / totalProcs : 0
  const cogsPerProc = totalProcs > 0 ? totalCOGS / totalProcs : 0
  const stabilizedMonthlyEbitda = monthlyEbitdas[11] ?? 0
  const procsPerPatient = sv(a.procsPerPatient, a.scenario)
  const totalPatients = procsPerPatient > 0 ? totalProcs / procsPerPatient : 0
  const revenuePerPatient = totalPatients > 0 ? totalGrossRevenue / totalPatients : 0
  const costPerAcquisition = totalTreated > 0 ? totalMarketing / totalTreated : 0

  const { monthlyBreakevenProcs, breakevenMonth } = calcBreakeven(a)
  const y1 = calcAnnualPL(1, a)
  const y2 = calcAnnualPL(2, a)
  const y3 = calcAnnualPL(3, a)

  return {
    avgMonthlyProcs,
    revenuePerProc,
    cogsPerProc,
    stabilizedMonthlyEbitda,
    revenuePerPatient,
    costPerAcquisition,
    breakevenProcs: monthlyBreakevenProcs,
    breakevenMonth,
    y1TotalRevenue: y1.grossRevenue,
    y1TotalProcs: y1.totalProcs,
    y2TotalRevenue: y2.grossRevenue,
    y3TotalRevenue: y3.grossRevenue,
    y1Ebitda: y1.ebitda,
    y2Ebitda: y2.ebitda,
    y3Ebitda: y3.ebitda,
  }
}

/* ── Step 10 — Validation ─────────────────────────────────── */

export function validateFinancialModel(params: {
  procedureMix: ProcedureMix
  payerMix: PayerWeights
  varithenaBlendedRate: number
  totalRevenue: number
  totalCOGS: number
  ebitda: number
  breakevenProcedures: number
}): void {
  const mixSum =
    params.procedureMix.vsMix +
    params.procedureMix.rfMix +
    params.procedureMix.scleroMix +
    params.procedureMix.varithenaShare

  const payerSum =
    params.payerMix.aetna +
    params.payerMix.bcbs +
    params.payerMix.humana +
    params.payerMix.uhc +
    params.payerMix.medicare

  const checks: { label: string; pass: boolean }[] = [
    { label: 'Procedure mix sums to 1.0',    pass: Math.abs(mixSum - 1.0) < 0.001 },
    { label: 'Payer mix sums to 1.0',         pass: Math.abs(payerSum - 1.0) < 0.001 },
    { label: 'varithenaBlendedRate is finite', pass: isFinite(params.varithenaBlendedRate) && !isNaN(params.varithenaBlendedRate) },
    { label: 'totalRevenue is finite',         pass: isFinite(params.totalRevenue) },
    { label: 'totalCOGS is finite',            pass: isFinite(params.totalCOGS) },
    { label: 'ebitda is finite',               pass: isFinite(params.ebitda) },
    { label: 'breakevenProcedures is finite',  pass: isFinite(params.breakevenProcedures) },
  ]

  checks.forEach(({ label, pass }) => {
    if (!pass) console.warn(`[CuraVein Model] VALIDATION FAILED: ${label}`)
  })
}

/* ── All months helper ────────────────────────────────────── */

export function calcAllMonths(a: Assumptions) {
  return Array.from({ length: 12 }, (_, i) => i + 1).map(m => ({
    funnel: calcFunnelMonth(m, a),
    revenue: calcRevenueMonth(m, a),
    cogs: calcCOGSMonth(m, a),
    opex: calcOpexMonth(m, a),
    pl: calcPLMonth(m, a),
  }))
}
