export type Scenario = 'conservative' | 'base' | 'aggressive'
export type Market = 'newBraunfels' | 'forney'

export interface ScenarioValues<T = number> {
  conservative: T
  base: T
  aggressive: T
}

export type PayerWeights = {
  aetna: number
  bcbs: number
  humana: number
  uhc: number
  medicare: number
}

export type ProcedurePayerRates = {
  aetna: number
  bcbs: number
  humana: number
  uhc: number
  medicare: number
}

export type ProcedureMix = {
  vsMix: number
  rfMix: number
  scleroMix: number
  varithenaShare: number
}

export type VarithenaState = {
  varithenaShare: number
  varithenaDrugCost: number
  varithenaRates36465: ProcedurePayerRates
  varithenaRates36466: ProcedurePayerRates
}

export type MarketPayerMix = {
  government: number
  commercial: number
}

// Lead source segmentation — seeded constant, not user-editable.
// Composite contact rate = Σ (volumeShare × contactRate) per scenario.
// Source: CuraVein_Integrated_v12.xlsx → "Lead Source Mix" tab (rows 5–9).
export interface LeadSource {
  id: string
  name: string
  volumeShare: ScenarioValues  // share of total leads, must sum to 1.0 within each scenario
  contactRate: ScenarioValues  // probability of reaching a lead from this source
  note: string
}

// ─── v12 HARDENING — Phase 2 structural types ────────────────────────────
// Source: CuraVein_Integrated_v12.xlsx → Scenario Controls rows 250-321
// Gated by V12_HARDENING_ENABLED flag in defaults.ts (preview only).

/** Procedure Complexity Distribution (SC rows 250-263) */
export interface ComplexityDistribution {
  pctLow: number      // share of patients at 1-2 procs
  pctMid: number      // share at 3-4 procs
  pctHigh: number     // share at 5-7 procs
  meanLowProcs: number   // default 1.5
  meanMidProcs: number   // default 3.5
  meanHighProcs: number  // default 6.0
}

/** Structured Capacity Model (SC rows 272-283) */
export interface CapacityModel {
  procDaysPerMonth: number   // Down 16 / Base 18 / Up 20
  procsPerDay: number        // Down 6 / Base 7 / Up 8
  noShowRate: number         // Down 15% / Base 10% / Up 5%
  cancellationRate: number   // Down 8% / Base 5% / Up 3%
}

/** Utilization Ramp (SC rows 292-299): fraction of net capacity used by year */
export interface UtilizationRamp {
  y1: number
  y2: number
  y3: number
}

export interface Assumptions {
  scenario: Scenario
  market: Market
  cpl: ScenarioValues
  contactRate: ScenarioValues
  bookingRate: ScenarioValues
  showRate: ScenarioValues
  treatmentConversion: ScenarioValues
  procsPerPatient: ScenarioValues  // DERIVED at init = expectedPathwayProcs × pathwayCompletion (see defaults.ts)
  // v12: Pathway Economics — replaces flat procsPerPatient input.
  // procsPerPatient is now derived so that v11 callers keep working unchanged.
  expectedPathwayProcs: ScenarioValues  // clinical norm for full bilateral CVI plan (~4.0)
  pathwayCompletion: ScenarioValues     // % of treated patients who complete the full plan
  maxCapacityPerMonth: number           // PEAK physician ceiling (146). Not steady-state — see capacityModel.
  // v12 HARDENING (Phase 2): structural replacements gated by V12_HARDENING_ENABLED.
  complexityDistribution: ScenarioValues<ComplexityDistribution>  // replaces flat expectedPathwayProcs
  capacityModel: ScenarioValues<CapacityModel>                    // replaces flat maxCapacityPerMonth
  utilizationRamp: ScenarioValues<UtilizationRamp>                // Y1/Y2/Y3 capacity utilization
  netRealizationFactor: ScenarioValues                            // Down 83% / Base 94% / Up 96%
  targetedCommercialShare: ScenarioValues                         // Down 65% / Base 75% / Up 85%
  // v12 hardening Path B: US billing per treated patient (93970 + 93971 cadence).
  // Historically excluded from blended procedure rate per Phase C. Re-added as
  // separate revenue line. Per-patient assumption reflects pathway cadence
  // (diagnostic + pre-proc × 2 legs + 2-4 follow-up scans) × blended US rate.
  usRevenuePerPatient: ScenarioValues                             // Down $925 / Base $1,295 / Up $1,480
  medicareRate: ScenarioValues
  commercialMultiplier: ScenarioValues
  bcbsMultiplier: number
  otherCommercialMultiplier: number
  bcbsShareOfCommercial: number
  medicareMix: number
  commercialMix: number
  wasteFactor: number
  miscConsumables: number
  postProcSupport: number
  venasealPtsPerKit: number
  scleroBuffer: number
  vsMix: number
  rfMix: number
  scleroMix: number
  venasealUnitCost: number
  rfSupplyCost: number
  scleroSupplyCost: number
  marketingSpend: ScenarioValues<number[]>
  physicianSalary: number
  rvtSalary: number
  maSalary: number
  frontOfficeSalary: number
  payrollTaxRate: number
  benefitsRate: number
  rent: number
  malpractice: number
  emr: number
  billing: number
  billingPctOfRevenue: number  // outsourced RCM pass-through as % of gross revenue (IS default 2%)
  managementFeeRate: number
  y2VolumeGrowth: ScenarioValues
  y3VolumeGrowth: ScenarioValues
  varithenaShare: number
  varithenaRates36465: ProcedurePayerRates
  varithenaRates36466: ProcedurePayerRates
  varithenaDrugCost: number
  payerMix: PayerWeights
  varithenaEnabled: boolean
}

export interface FunnelMonth {
  month: number
  leads: number
  contacts: number
  booked: number
  shows: number
  treated: number
  rawProcs: number
  cappedProcs: number
  utilization: number
  excessDemand: number
  marketingSpend: number
}

export interface RevenueMonth {
  month: number
  blendedRate: number
  grossRevenue: number
  managementFee: number
  netRevenue: number
  medicareRevenue: number
  commercialRevenue: number
  // AUDIT 2026-04-26 C-12: US billing surfaced as own field so callers can
  // reconcile grossRevenue = medicareRevenue + commercialRevenue + usRevenue.
  // Previously usRevenue was bundled into grossRevenue with no breakout, and
  // the medicare/commercial split omitted realization — diverging from the
  // gross by ~6%.
  usRevenue: number
  procs: number
}

export interface COGSMonth {
  month: number
  venasealCost: number
  rfCost: number
  scleroCost: number
  varithenaCost: number
  postProcCost: number
  miscCost: number
  totalCOGS: number
  procs: number
}

export interface OpexMonth {
  month: number
  personnelTotal: number
  marketing: number
  rent: number
  malpractice: number
  emr: number
  billing: number
  totalOpex: number
}

export interface PLMonth {
  month: number
  grossRevenue: number
  managementFee: number
  netRevenue: number
  totalCOGS: number
  grossProfit: number
  grossMargin: number
  totalOpex: number
  ebitda: number
  ebitdaMargin: number
  procs: number
}

export interface AnnualPL {
  year: 1 | 2 | 3
  grossRevenue: number
  managementFee: number
  netRevenue: number
  totalCOGS: number
  grossProfit: number
  grossMargin: number
  totalOpex: number
  ebitda: number
  ebitdaMargin: number
  totalProcs: number
}

export interface KeyMetrics {
  avgMonthlyProcs: number
  revenuePerProc: number
  cogsPerProc: number
  stabilizedMonthlyEbitda: number
  revenuePerPatient: number
  costPerAcquisition: number
  breakevenProcs: number
  breakevenMonth: number | null
  y1TotalRevenue: number
  y1TotalProcs: number
  y2TotalRevenue: number
  y2TotalProcs: number
  y3TotalRevenue: number
  y3TotalProcs: number
  y1Ebitda: number
  y2Ebitda: number
  y3Ebitda: number
  monthsAtCapacity: number
}

export interface CPTCode {
  code: string
  description: string
  category: 'procedure' | 'em'
  medicareRate: number
  countAt50: number
  countAt100: number
  mixPct: number
}
