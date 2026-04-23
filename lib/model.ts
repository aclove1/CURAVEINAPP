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
import { MARKET_PAYER_MIX, V12_HARDENING_ENABLED, calcNetCapacity } from './defaults'

function sv(obj: { conservative: number; base: number; aggressive: number }, scenario: string): number {
  return obj[scenario as keyof typeof obj]
}

function svArr(obj: { conservative: number[]; base: number[]; aggressive: number[] }, scenario: string): number[] {
  return obj[scenario as keyof typeof obj]
}

/* ── Utilities ────────────────────────────────────────────── */

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

/* ── Credentialing ramp — SC!D163:D174 (Base/Conservative scenario) ────────
   Month:          1     2     3     4     5     6–12
   Commercial %: 0.40  0.53  0.67  0.80  0.85   0.85 (= market steady-state)
   Source: Scenario Controls rows 163-174, active scenario D column          */
const CRED_RAMP_COMM = [0.40, 0.53, 0.67, 0.80, 0.85, 0.85, 0.85, 0.85, 0.85, 0.85, 0.85, 0.85]

function getCredentialingMix(month: number, a: Assumptions): { govMix: number; commMix: number } {
  const marketMix = MARKET_PAYER_MIX[a.market] ?? MARKET_PAYER_MIX.forney
  const commPct = month >= 1 && month <= 12
    ? CRED_RAMP_COMM[month - 1]
    : marketMix.commercial
  return { govMix: 1 - commPct, commMix: commPct }
}

/* ── FIX 7 — Varithena toggle: effective procedure mix ────── */

export function effectiveProcedureMix(a: Assumptions): { vs: number; rf: number; sclero: number; varithena: number } {
  if (!a.varithenaEnabled || a.varithenaShare <= 0) {
    const sum = a.vsMix + a.rfMix + a.scleroMix
    if (sum === 0) return { vs: 0.33, rf: 0.33, sclero: 0.34, varithena: 0 }
    return { vs: a.vsMix / sum, rf: a.rfMix / sum, sclero: a.scleroMix / sum, varithena: 0 }
  }
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

/* ── Varithena blended rate (three-step) ─────────────────── */

export function calcVarithenaBlendedRate(a: Assumptions): number {
  const blended36465: number =
    (a.varithenaRates36465.aetna    * a.payerMix.aetna)   +
    (a.varithenaRates36465.bcbs     * a.payerMix.bcbs)    +
    (a.varithenaRates36465.humana   * a.payerMix.humana)  +
    (a.varithenaRates36465.uhc      * a.payerMix.uhc)     +
    (a.varithenaRates36465.medicare * a.payerMix.medicare)

  const blended36466: number =
    (a.varithenaRates36466.aetna    * a.payerMix.aetna)   +
    (a.varithenaRates36466.bcbs     * a.payerMix.bcbs)    +
    (a.varithenaRates36466.humana   * a.payerMix.humana)  +
    (a.varithenaRates36466.uhc      * a.payerMix.uhc)     +
    (a.varithenaRates36466.medicare * a.payerMix.medicare)

  return (blended36465 * 0.7) + (blended36466 * 0.3)
}

/* ── Varithena cost (v11) ─────────────────────────────────── */
// Formula aligned to IS!F51 = F47 + 150.
// F47 = all sclerotherapy procedural supplies ($120.15, stored in scleroSupplyCost).
// $150 = Varithena polidocanol microfoam drug cost per patient (varithenaDrugCost).
// No additional buffer/waste — F47 already includes waste factor from spreadsheet.

export function calcVarithenaCostPerProc(a: Assumptions): number {
  return a.scleroSupplyCost + a.varithenaDrugCost  // $120 + $150 = $270
}

/* ── v12 HARDENING (Phase 2) — Structural helpers ──────────
   Gated by V12_HARDENING_ENABLED (preview only until promoted). Each helper
   returns the hardened value if the flag is on, else falls back to the legacy
   flat Assumptions field. This preserves Y1/Y2/Y3 math when flag is off.    */

/** Effective monthly throughput ceiling for a given year.
 *  Hardening: net capacity × utilization ramp.
 *  Legacy: maxCapacityPerMonth (flat 146). */
export function effectiveMonthlyCapacity(a: Assumptions, year: 1 | 2 | 3 = 1): number {
  if (!V12_HARDENING_ENABLED) return a.maxCapacityPerMonth
  const cap = a.capacityModel?.[a.scenario]
  const ramp = a.utilizationRamp?.[a.scenario]
  if (!cap || !ramp) return a.maxCapacityPerMonth
  const net = calcNetCapacity(cap)
  const util = year === 1 ? ramp.y1 : year === 2 ? ramp.y2 : ramp.y3
  return net * util
}

/** Net realization factor applied to gross blended rate.
 *  Hardening: Down 88% / Base 92% / Up 95%.
 *  Legacy: 1.0 (no adjustment). */
export function netRealizationMultiplier(a: Assumptions): number {
  if (!V12_HARDENING_ENABLED) return 1.0
  return a.netRealizationFactor?.[a.scenario] ?? 1.0
}

/** Targeted commercial share (replaces market-demographic mix when flag on).
 *  Hardening: Down 65% / Base 75% / Up 85%.
 *  Legacy: a.commercialMix. */
export function effectiveCommercialShare(a: Assumptions): number {
  if (!V12_HARDENING_ENABLED) return a.commercialMix
  return a.targetedCommercialShare?.[a.scenario] ?? a.commercialMix
}

/* ── v12 ── Pathway Economics: effective procs/patient ─────
   Effective procs = Expected Full Pathway Procs × Pathway Completion %.
   Used so that if a caller updates expectedPathwayProcs or pathwayCompletion
   live (e.g., scenario page slider), calcFunnelMonth stays in sync without
   the caller needing to recompute procsPerPatient manually.
   Falls back to a.procsPerPatient if pathway fields are absent (legacy).    */

export function effectiveProcsPerPatient(a: Assumptions, scenario: string = a.scenario): number {
  if (a.expectedPathwayProcs && a.pathwayCompletion) {
    return sv(a.expectedPathwayProcs, scenario) * sv(a.pathwayCompletion, scenario)
  }
  return sv(a.procsPerPatient, scenario)
}

/* ── Funnel ───────────────────────────────────────────────── */

export function calcFunnelMonth(month: number, a: Assumptions): FunnelMonth {
  const idx = month - 1
  const spend = svArr(a.marketingSpend, a.scenario)[idx] ?? 0
  const cpl = sv(a.cpl, a.scenario)
  const leads = Math.round(spend / cpl)
  const contacts = Math.round(leads * sv(a.contactRate, a.scenario))
  const booked = Math.round(contacts * sv(a.bookingRate, a.scenario))
  const shows = Math.round(booked * sv(a.showRate, a.scenario))
  const treated = Math.round(shows * sv(a.treatmentConversion, a.scenario))
  const rawProcs = Math.round(treated * effectiveProcsPerPatient(a))
  // v12 HARDENING: a.maxCapacityPerMonth is pre-set by adjustAssumptionsForYear
  // to (net capacity × utilization ramp) for the active year when flag is on.
  const cappedProcs = Math.min(rawProcs, a.maxCapacityPerMonth)
  const utilization = a.maxCapacityPerMonth > 0 ? cappedProcs / a.maxCapacityPerMonth : 0
  const excessDemand = Math.max(0, rawProcs - a.maxCapacityPerMonth)
  return { month, leads, contacts, booked, shows, treated, rawProcs, cappedProcs, utilization, excessDemand, marketingSpend: spend }
}

/* ── FIX 10 — BCBS-separated blended commercial multiplier ── */

function blendedCommercialMultiplier(a: Assumptions): number {
  const bcbsShare = a.bcbsShareOfCommercial
  const otherShare = 1 - bcbsShare
  return bcbsShare * a.bcbsMultiplier + otherShare * a.otherCommercialMultiplier
}

/* ── Weighted fee schedule blended rate ────────────────────── */

// v11 CPT fee schedule — 4 procedure codes only (top-revenue, last-touch billing mix).
// Source: SC!C124-C127 (Medicare rates), SC!D124-D127 (volume shares).
// Weighted base = SUMPRODUCT(rates, shares) = $1,408 (SC!E130).
// US scans excluded from blended rate per Phase C: D128=D129=0.
const FEE_SCHEDULE = [
  { code: '36482', medicareFee: 1452.78, volumeShare: 0.65 },  // VenaSeal — dominant @ 65% (SC!D125)
  { code: '36465', medicareFee: 1122.16, volumeShare: 0.15 },  // Varithena single segment (SC!D126)
  { code: '36466', medicareFee: 1253.75, volumeShare: 0.10 },  // Varithena multi-segment (SC!D127)
  { code: '36475', medicareFee: 1700.00, volumeShare: 0.10 },  // RFA (SC!D124)
]

export function calcWeightedMedicareBase(): number {
  return FEE_SCHEDULE.reduce((sum, f) => sum + f.medicareFee * f.volumeShare, 0)
}

export function calcOverallBlendedRate(a: Assumptions): number {
  const medicareBase = calcWeightedMedicareBase()
  const commMultiplier = blendedCommercialMultiplier(a)
  // v12 HARDENING: use targeted commercial share (Base 75%, Up 85%, Down 65%) when flag on,
  // then apply net realization factor. Legacy: market-derived commercialMix × 1.0.
  const commShare = effectiveCommercialShare(a)
  const govShare = 1 - commShare
  const gross = medicareBase * (govShare + commShare * commMultiplier)
  return Math.round(gross * netRealizationMultiplier(a))
}

/* ── FIX 2 — Month-specific blended rate with credentialing ── */

function calcMonthBlendedRate(month: number, a: Assumptions): number {
  const medicareBase = calcWeightedMedicareBase()
  const commMultiplier = blendedCommercialMultiplier(a)
  const { govMix, commMix } = getCredentialingMix(month, a)
  // v12 HARDENING: credentialing mix still ramps M1-M6; after that, targeted share takes over.
  // Apply net realization factor uniformly.
  const gross = medicareBase * (govMix + commMix * commMultiplier)
  return Math.round(gross * netRealizationMultiplier(a))
}

/* ── Revenue ──────────────────────────────────────────────── */

export function calcRevenueMonth(month: number, a: Assumptions): RevenueMonth {
  const funnel = calcFunnelMonth(month, a)
  const procs = funnel.cappedProcs
  const blendedRate = calcMonthBlendedRate(month, a)
  const { govMix, commMix } = getCredentialingMix(month, a)
  const medicareRate = sv(a.medicareRate, a.scenario)
  const commMultiplier = blendedCommercialMultiplier(a)
  const commercialRate = Math.round(medicareRate * commMultiplier)
  const procRevenue = procs * blendedRate
  // v12 hardening Path B: US billing as separate revenue line per treated patient.
  // Was excluded from FEE_SCHEDULE per Phase C. usRevenuePerPatient covers the
  // pathway scan cadence (1 diagnostic + 2 pre-proc + 4 follow-up).
  // Billed patients = procs / effective-procs-per-patient (capacity-capped).
  const procsPerPt = effectiveProcsPerPatient(a)
  const billedPatients = procsPerPt > 0 ? procs / procsPerPt : 0
  const usRevenue = V12_HARDENING_ENABLED
    ? Math.round(billedPatients * sv(a.usRevenuePerPatient, a.scenario))
    : 0
  const grossRevenue = procRevenue + usRevenue
  const managementFee = -Math.round(a.managementFeeRate * grossRevenue)
  const netRevenue = grossRevenue + managementFee
  const medicareRevenue = Math.round(procs * govMix * medicareRate)
  const commercialRevenue = Math.round(procs * commMix * commercialRate)
  return { month, blendedRate, grossRevenue, managementFee, netRevenue, medicareRevenue, commercialRevenue, procs }
}

/* ── COGS ─────────────────────────────────────────────────── */

export function calcWeightedSupplyCost(a: Assumptions): number {
  const mix = effectiveProcedureMix(a)
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
  const mix = effectiveProcedureMix(a)
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
// v12: raised contactRate cap from 0.55 → 0.80 to accommodate the new
// source-mix composite (Aggressive Y1 = 0.68; with Y2+Y3 boost compounds to ~0.86,
// clamped at 0.80). Added pathwayCompletion to the boost list — operationally
// this improves with retention infrastructure (financial counselor, auto-rebook).
// procsPerPatient is NOT boosted directly; it's derived live from expected×completion
// via effectiveProcsPerPatient() so the pathway-completion boost flows through.

const CONVERSION_CAPS = {
  contactRate: 0.80,           // v12: was 0.55 (too low for source-mix composite)
  bookingRate: 0.75,           // v12: was 0.70 — referral-heavy mix can exceed
  showRate: 0.92,              // v12: was 0.85 — 3-touch confirmation protocols reach 90%+
  treatmentConversion: 0.78,   // v12: was 0.75 — unchanged floor; slight headroom
  pathwayCompletion: 0.97,     // v12 NEW: saturation ceiling for full-pathway completion
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

export function adjustAssumptionsForYear(year: 1 | 2 | 3, a: Assumptions): Assumptions {
  // v12 HARDENING: bake year-specific effective capacity into maxCapacityPerMonth.
  // Previously a.maxCapacityPerMonth was a flat 146 across all years; now it's
  // (net capacity × utilization ramp for `year`). Applied in every year including Y1.
  const withCapacity: Assumptions = V12_HARDENING_ENABLED
    ? { ...a, maxCapacityPerMonth: Math.round(effectiveMonthlyCapacity(a, year)) }
    : a
  if (year === 1) return withCapacity
  const y2 = {
    ...withCapacity,
    contactRate: boostScenarioValues(a.contactRate, Y2_IMPROVEMENT, CONVERSION_CAPS.contactRate),
    bookingRate: boostScenarioValues(a.bookingRate, Y2_IMPROVEMENT, CONVERSION_CAPS.bookingRate),
    showRate: boostScenarioValues(a.showRate, Y2_IMPROVEMENT, CONVERSION_CAPS.showRate),
    treatmentConversion: boostScenarioValues(a.treatmentConversion, Y2_IMPROVEMENT, CONVERSION_CAPS.treatmentConversion),
    pathwayCompletion: boostScenarioValues(a.pathwayCompletion, Y2_IMPROVEMENT, CONVERSION_CAPS.pathwayCompletion),
  }
  if (year === 2) return y2
  return {
    ...y2,
    contactRate: boostScenarioValues(y2.contactRate, Y3_IMPROVEMENT, CONVERSION_CAPS.contactRate),
    bookingRate: boostScenarioValues(y2.bookingRate, Y3_IMPROVEMENT, CONVERSION_CAPS.bookingRate),
    showRate: boostScenarioValues(y2.showRate, Y3_IMPROVEMENT, CONVERSION_CAPS.showRate),
    treatmentConversion: boostScenarioValues(y2.treatmentConversion, Y3_IMPROVEMENT, CONVERSION_CAPS.treatmentConversion),
    pathwayCompletion: boostScenarioValues(y2.pathwayCompletion, Y3_IMPROVEMENT, CONVERSION_CAPS.pathwayCompletion),
  }
}

/* ── Annual P&L (funnel-driven) ───────────────────────────── */
// Annual totals are summed directly from monthly P&L so that the P&L page
// "Monthly Y1" and "3-Year Annual" views reconcile exactly. Prior versions
// used a hardcoded FIXED_OPEX = $706,000 that omitted marketing and ignored
// the management fee, overstating EBITDA by the mgmt fee + marketing spend.

export function calcAnnualPL(year: 1 | 2 | 3, a: Assumptions): AnnualPL {
  const adj = adjustAssumptionsForYear(year, a)

  let totalProcs = 0
  let grossRevenue = 0
  let totalCOGS = 0
  let totalOpex = 0

  for (let m = 1; m <= 12; m++) {
    const pl = calcPLMonth(m, adj)
    totalProcs += pl.procs
    grossRevenue += pl.grossRevenue
    totalCOGS += pl.totalCOGS
    totalOpex += pl.totalOpex
  }

  const managementFee = -Math.round(a.managementFeeRate * grossRevenue)
  const netRevenue = grossRevenue + managementFee
  const grossProfit = netRevenue - totalCOGS
  const grossMargin = netRevenue > 0 ? grossProfit / netRevenue : 0
  const ebitda = roundCurrency(grossProfit - totalOpex)
  const ebitdaMargin = netRevenue > 0 ? ebitda / netRevenue : 0

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
      const yr = m <= 12 ? 1 : m <= 24 ? 2 : 3
      const adj = adjustAssumptionsForYear(yr as 1 | 2 | 3, a)
      const pl = calcPLMonth(baseMonth, adj)
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
  let monthsAtCapacity = 0
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
    if (funnel.cappedProcs >= a.maxCapacityPerMonth) monthsAtCapacity++
  }

  const avgMonthlyProcs = totalProcs / 12
  const revenuePerProc = totalProcs > 0 ? totalGrossRevenue / totalProcs : 0
  const cogsPerProc = totalProcs > 0 ? totalCOGS / totalProcs : 0
  const stabilizedMonthlyEbitda = monthlyEbitdas[11] ?? 0
  const procsPerPatient = effectiveProcsPerPatient(a)  // v12: derived from pathway economics
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
    y2TotalProcs: y2.totalProcs,
    y3TotalRevenue: y3.grossRevenue,
    y3TotalProcs: y3.totalProcs,
    y1Ebitda: y1.ebitda,
    y2Ebitda: y2.ebitda,
    y3Ebitda: y3.ebitda,
    monthsAtCapacity,
  }
}

/* ── Funnel Bridge (FIX 5) ────────────────────────────────── */

export interface FunnelBridge {
  leads: { monthlyAvg: number; annual: number }
  contacts: { monthlyAvg: number; annual: number; rate: number }
  booked: { monthlyAvg: number; annual: number; rate: number }
  shows: { monthlyAvg: number; annual: number; rate: number }
  treated: { monthlyAvg: number; annual: number; rate: number }
  procedures: { monthlyAvg: number; annual: number; rate: number }
  revenue: { monthlyAvg: number; annual: number }
  plProcsMatch: boolean
  plRevenueMatch: boolean
}

export function calcFunnelBridge(a: Assumptions): FunnelBridge {
  let leads = 0, contacts = 0, booked = 0, shows = 0, treated = 0, procs = 0, revenue = 0
  let plProcs = 0, plRevenue = 0

  for (let m = 1; m <= 12; m++) {
    const f = calcFunnelMonth(m, a)
    const pl = calcPLMonth(m, a)
    leads += f.leads
    contacts += f.contacts
    booked += f.booked
    shows += f.shows
    treated += f.treated
    procs += f.cappedProcs
    revenue += pl.grossRevenue
    plProcs += pl.procs
    plRevenue += pl.grossRevenue
  }

  return {
    leads: { monthlyAvg: leads / 12, annual: leads },
    contacts: { monthlyAvg: contacts / 12, annual: contacts, rate: leads > 0 ? contacts / leads : 0 },
    booked: { monthlyAvg: booked / 12, annual: booked, rate: contacts > 0 ? booked / contacts : 0 },
    shows: { monthlyAvg: shows / 12, annual: shows, rate: booked > 0 ? shows / booked : 0 },
    treated: { monthlyAvg: treated / 12, annual: treated, rate: shows > 0 ? treated / shows : 0 },
    procedures: { monthlyAvg: procs / 12, annual: procs, rate: treated > 0 ? procs / treated : 0 },
    revenue: { monthlyAvg: revenue / 12, annual: revenue },
    plProcsMatch: procs === plProcs,
    plRevenueMatch: revenue === plRevenue,
  }
}

/* ── Validation ───────────────────────────────────────────── */

export function validateFinancialModel(params: {
  procedureMix: ProcedureMix
  payerMix: PayerWeights
  varithenaBlendedRate: number
  totalRevenue: number
  totalCOGS: number
  ebitda: number
  breakevenProcedures: number
}): void {
  const mixSum = params.procedureMix.vsMix + params.procedureMix.rfMix + params.procedureMix.scleroMix + params.procedureMix.varithenaShare
  const payerSum = params.payerMix.aetna + params.payerMix.bcbs + params.payerMix.humana + params.payerMix.uhc + params.payerMix.medicare
  const checks: { label: string; pass: boolean }[] = [
    { label: 'Procedure mix sums to 1.0', pass: Math.abs(mixSum - 1.0) < 0.001 },
    { label: 'Payer mix sums to 1.0', pass: Math.abs(payerSum - 1.0) < 0.001 },
    { label: 'varithenaBlendedRate is finite', pass: isFinite(params.varithenaBlendedRate) && !isNaN(params.varithenaBlendedRate) },
    { label: 'totalRevenue is finite', pass: isFinite(params.totalRevenue) },
    { label: 'totalCOGS is finite', pass: isFinite(params.totalCOGS) },
    { label: 'ebitda is finite', pass: isFinite(params.ebitda) },
    { label: 'breakevenProcedures is finite', pass: isFinite(params.breakevenProcedures) },
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
