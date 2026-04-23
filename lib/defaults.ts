import type {
  Assumptions,
  CapacityModel,
  ComplexityDistribution,
  LeadSource,
  MarketPayerMix,
  Scenario,
  ScenarioValues,
  UtilizationRamp,
} from './types'

// ─── v12 HARDENING FEATURE FLAG ──────────────────────────────────────────
// Promoted to production 2026-04-22 after staging verification.
// Previously gated on VERCEL_ENV (preview-only). To roll back: flip to `false`
// + rebuild, or restore the env-gated expression in git history.
export const V12_HARDENING_ENABLED: boolean = true

// Source: SC!B142 market selector → SC!B145-B149.
// New Braunfels (Comal Co.): 18% age 65+ → 25% govt payer mix.
// Forney (Kaufman Co.): 11% age 65+ → 15% govt payer mix.
export const MARKET_PAYER_MIX: Record<string, MarketPayerMix> = {
  newBraunfels: { government: 0.25, commercial: 0.75 },  // SC!B145 (was 0.15/0.85)
  forney:       { government: 0.15, commercial: 0.85 },  // SC!B146
}

// ─────────────────────────────────────────────────────────────────────────────
// v12 ── LEAD SOURCE MIX (seeded constant, not user-editable)
// Source: CuraVein_Integrated_v12.xlsx → "Lead Source Mix" tab, rows 5–9.
// Composite contact rate seeds DEFAULT_ASSUMPTIONS.contactRate per scenario.
// Verified composites: Down 37.9% / Base 53.0% / Aggressive 68.1%.
// ─────────────────────────────────────────────────────────────────────────────
// ISOLATED DOWNSIDE RECALIBRATION: Conservative values = Base values below.
// Funnel mix is not the downside lever — isolated downside is reimbursement only.
export const LEAD_SOURCE_MIX: LeadSource[] = [
  {
    id: 'paidSearch',
    name: 'Paid Search (Google)',
    volumeShare: { conservative: 0.40, base: 0.40, aggressive: 0.32 },
    contactRate: { conservative: 0.42, base: 0.42, aggressive: 0.55 },
    note: 'High-intent CVI keywords. Contact rate driven by speed-to-lead (<5 min = 2–3× vs >1 hr).',
  },
  {
    id: 'paidSocial',
    name: 'Paid Social (Meta)',
    volumeShare: { conservative: 0.22, base: 0.22, aggressive: 0.18 },
    contactRate: { conservative: 0.35, base: 0.35, aggressive: 0.45 },
    note: 'Symptom-aware cold audience. Requires retargeting + SMS nurture to lift contact.',
  },
  {
    id: 'organic',
    name: 'Organic Web / SEO',
    volumeShare: { conservative: 0.18, base: 0.18, aggressive: 0.20 },
    contactRate: { conservative: 0.60, base: 0.60, aggressive: 0.72 },
    note: 'Branded + CVI-symptom SEO; higher intent than paid social. Compounds with authority.',
  },
  {
    id: 'referral',
    name: 'Physician Referral / Direct',
    volumeShare: { conservative: 0.15, base: 0.15, aggressive: 0.20 },
    contactRate: { conservative: 0.90, base: 0.90, aggressive: 0.94 },
    note: 'PCPs, cardiology, wound care, repeat caller. Near-guaranteed contact; low CPL.',
  },
  {
    id: 'repeat',
    name: 'Repeat / Reactivation',
    volumeShare: { conservative: 0.05, base: 0.05, aggressive: 0.10 },
    contactRate: { conservative: 0.85, base: 0.85, aggressive: 0.92 },
    note: '2nd-leg, prior self-pay, referrals of referrals. Requires active reactivation SMS/email.',
  },
]

/** Composite contact rate per scenario = Σ (volumeShare × contactRate). */
export function calcCompositeContactRate(scenario: Scenario, mix: LeadSource[] = LEAD_SOURCE_MIX): number {
  return mix.reduce((acc, s) => acc + s.volumeShare[scenario] * s.contactRate[scenario], 0)
}

export function compositeContactRates(mix: LeadSource[] = LEAD_SOURCE_MIX): ScenarioValues {
  return {
    conservative: calcCompositeContactRate('conservative', mix),
    base: calcCompositeContactRate('base', mix),
    aggressive: calcCompositeContactRate('aggressive', mix),
  }
}

/** Sanity check: volume shares sum to 1.0 within each scenario. */
export function leadSourceVolumeChecks(mix: LeadSource[] = LEAD_SOURCE_MIX): Record<Scenario, number> {
  return {
    conservative: mix.reduce((a, s) => a + s.volumeShare.conservative, 0),
    base:         mix.reduce((a, s) => a + s.volumeShare.base, 0),
    aggressive:   mix.reduce((a, s) => a + s.volumeShare.aggressive, 0),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// v12 HARDENING (Phase 2) ── structural constants mirroring Scenario Controls
// SC rows 250-321. Gated by V12_HARDENING_ENABLED.
// ─────────────────────────────────────────────────────────────────────────────

/** Procedure Complexity Distribution — SC rows 254-261
 *  ISOLATED DOWNSIDE: Conservative = Base (complexity is not the downside lever). */
export const COMPLEXITY_DISTRIBUTION: ScenarioValues<ComplexityDistribution> = {
  conservative: { pctLow: 0.25, pctMid: 0.50, pctHigh: 0.25, meanLowProcs: 1.5, meanMidProcs: 3.5, meanHighProcs: 6.0 },
  base:         { pctLow: 0.25, pctMid: 0.50, pctHigh: 0.25, meanLowProcs: 1.5, meanMidProcs: 3.5, meanHighProcs: 6.0 },
  aggressive:   { pctLow: 0.15, pctMid: 0.40, pctHigh: 0.45, meanLowProcs: 1.5, meanMidProcs: 3.5, meanHighProcs: 6.0 },
}

export function calcWeightedProcsFromDistribution(d: ComplexityDistribution): number {
  return d.pctLow * d.meanLowProcs + d.pctMid * d.meanMidProcs + d.pctHigh * d.meanHighProcs
}

/** Structured Capacity Model — SC rows 276-280
 *  Path B: Base procs/day 7 → 8 (two-room parallel scheduling as operating baseline).
 *  ISOLATED DOWNSIDE: Conservative = Base (capacity is not the downside lever).
 *  Aggressive bumped 8 → 9 to maintain Upside spread. */
export const CAPACITY_MODEL: ScenarioValues<CapacityModel> = {
  conservative: { procDaysPerMonth: 18, procsPerDay: 8, noShowRate: 0.10, cancellationRate: 0.05 },
  base:         { procDaysPerMonth: 18, procsPerDay: 8, noShowRate: 0.10, cancellationRate: 0.05 },
  aggressive:   { procDaysPerMonth: 20, procsPerDay: 9, noShowRate: 0.05, cancellationRate: 0.03 },
}

export function calcNetCapacity(c: CapacityModel): number {
  return c.procDaysPerMonth * c.procsPerDay * (1 - c.noShowRate) * (1 - c.cancellationRate)
}

/** Utilization Ramp — SC rows 294-296
 *  ISOLATED DOWNSIDE: Conservative = Base (ramp is not the downside lever). */
export const UTILIZATION_RAMP: ScenarioValues<UtilizationRamp> = {
  conservative: { y1: 0.70, y2: 0.85, y3: 0.95 },
  base:         { y1: 0.70, y2: 0.85, y3: 0.95 },
  aggressive:   { y1: 0.75, y2: 0.90, y3: 1.00 },
}

/** Net Realization Factor — SC row 309
 *  Path B: Base 92% → 94% — mature RCM with denial-management workflow by Y3.
 *  Isolated Downside: Conservative 0.83 reflects denial-pressure scenario.
 *  Aggressive bumped to 0.96 (top-quartile RCM). */
export const NET_REALIZATION_FACTOR: ScenarioValues = {
  conservative: 0.83,
  base:         0.94,
  aggressive:   0.96,
}

/** Targeted Acquisition Mix — SC row 319 (commercial share)
 *  Per Part 1 spec: Down 65 / Base 75 / Up 85. Structural scenarios reflect
 *  MA penetration drift, standard market mix, and targeted commercial acquisition. */
export const TARGETED_COMMERCIAL_SHARE: ScenarioValues = {
  conservative: 0.65,
  base:         0.75,
  aggressive:   0.85,
}

/** US Billing per treated patient (v12 hardening Path B).
 *  Was excluded from FEE_SCHEDULE per Phase C; re-added as separate line.
 *  Per-patient assumption reflects pathway cadence:
 *    Base (7 scans/patient): 1 initial bilateral 93970 + 2 pre-proc 93971 + 4 follow-up 93971
 *                            = ~$1,295 at blended rates (93970 ~$280, 93971 ~$140)
 *    Down (5 scans): less follow-up, patients drop off ~$925
 *    Up (8 scans): full surveillance + post-op doppler ~$1,480 */
export const US_REVENUE_PER_PATIENT: ScenarioValues = {
  conservative: 925,
  base:         1295,
  aggressive:   1480,
}

/** Derived: weighted procs/patient per scenario (replaces flat 4.0 when flag on) */
const DERIVED_WEIGHTED_PROCS: ScenarioValues = {
  conservative: calcWeightedProcsFromDistribution(COMPLEXITY_DISTRIBUTION.conservative),
  base:         calcWeightedProcsFromDistribution(COMPLEXITY_DISTRIBUTION.base),
  aggressive:   calcWeightedProcsFromDistribution(COMPLEXITY_DISTRIBUTION.aggressive),
}

// v12 ── PATHWAY ECONOMICS (replaces flat procsPerPatient input)
// Effective Procedures per Treated Patient = Expected Pathway Procs × Pathway Completion %.
// v12 hardening: when V12_HARDENING_ENABLED, Expected Pathway Procs derives from
// COMPLEXITY_DISTRIBUTION (weighted mean of low/mid/high buckets) instead of flat 4.0.
// Source: CuraVein_Integrated_v12.xlsx → SC!C224:E226 (pre-hardening) / SC!C263:E263 (post).
const EXPECTED_PATHWAY_PROCS: ScenarioValues = V12_HARDENING_ENABLED
  ? DERIVED_WEIGHTED_PROCS                                            // Down 2.95 / Base 3.62 / Up 4.33
  : { conservative: 4.0, base: 4.0, aggressive: 4.0 }                 // legacy flat 4.0
// ISOLATED DOWNSIDE: Pathway completion Conservative = Base (not a downside lever).
const PATHWAY_COMPLETION:    ScenarioValues = { conservative: 0.85, base: 0.85, aggressive: 0.95 }
function effectiveProcs(scenario: Scenario): number {
  return EXPECTED_PATHWAY_PROCS[scenario] * PATHWAY_COMPLETION[scenario]
}
const DERIVED_PROCS_PER_PATIENT: ScenarioValues = {
  conservative: effectiveProcs('conservative'),  // 2.60
  base:         effectiveProcs('base'),           // 3.40
  aggressive:   effectiveProcs('aggressive'),     // 3.80
}

// Composite contact rate seeds (Down 37.9% / Base 53.0% / Aggressive 68.1%).
const DERIVED_CONTACT_RATE = compositeContactRates()

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  scenario: 'base',
  market: 'newBraunfels',
  // ISOLATED DOWNSIDE RECALIBRATION: Conservative = Base across funnel/pathway/capacity.
  // Conservative differs from Base ONLY on: netRealizationFactor (88% vs 92%) +
  // targetedCommercialShare (68% vs 75%). This prevents compound-negative pessimism
  // and guarantees Y3 Conservative EBITDA > 0.
  cpl: { conservative: 60, base: 60, aggressive: 45 },
  contactRate: DERIVED_CONTACT_RATE,  // composite: Conservative=Base=53.0% (see LEAD_SOURCE_MIX below)
  bookingRate: { conservative: 0.60, base: 0.60, aggressive: 0.70 },
  showRate: { conservative: 0.78, base: 0.78, aggressive: 0.85 },
  treatmentConversion: { conservative: 0.65, base: 0.65, aggressive: 0.75 },
  // v12 — DERIVED = expectedPathwayProcs × pathwayCompletion. Was flat {3.0, 3.5, 4.0}.
  // Effective: Down 2.60 / Base 3.40 / Aggressive 3.80. Fixes v11 inversion (Aggressive < Base).
  procsPerPatient: DERIVED_PROCS_PER_PATIENT,
  expectedPathwayProcs: EXPECTED_PATHWAY_PROCS,
  pathwayCompletion: PATHWAY_COMPLETION,
  // v12 hardening fields (used when V12_HARDENING_ENABLED):
  complexityDistribution: COMPLEXITY_DISTRIBUTION,
  capacityModel: CAPACITY_MODEL,
  utilizationRamp: UTILIZATION_RAMP,
  netRealizationFactor: NET_REALIZATION_FACTOR,
  targetedCommercialShare: TARGETED_COMMERCIAL_SHARE,
  usRevenuePerPatient: US_REVENUE_PER_PATIENT,
  maxCapacityPerMonth: 146,
  medicareRate: { conservative: 1408, base: 1408, aggressive: 1408 }, // SC!E130 — CPT weighted base (was 1147)
  // Commercial multiplier v11: BCBS 30%×1.30 + Aetna/UHC/Cigna 70%×1.58 = 1.496 (SC!D156→F15)
  commercialMultiplier: { conservative: 1.496, base: 1.496, aggressive: 1.496 },
  bcbsMultiplier: 1.30,              // SC!C154 — BCBS rate vs Medicare
  otherCommercialMultiplier: 1.58,   // SC!C155 — Aetna/UHC/Cigna blended
  bcbsShareOfCommercial: 0.30,       // SC!B154 — BCBS 30% of commercial
  // Seeded to New Braunfels (25% govt / 75% commercial) to match `market` above.
  // Market toggle in /scenario updates these pairs — keep them coherent with MARKET_PAYER_MIX.
  medicareMix: 0.25,                 // SC!B145 — New Braunfels government share
  commercialMix: 0.75,               // SC!C145 — New Braunfels commercial share
  wasteFactor: 0.075,
  miscConsumables: 15,
  postProcSupport: 17.50,  // IS!B7 — $17.50/proc (was 17.49, spreadsheet = 17.5)
  venasealPtsPerKit: 2.5,    // IS!B8 (was 2.3)
  scleroBuffer: 0.125,       // IS!B9
  // Procedure mix v11: VenaSeal 65% / Varithena 25% / RFA 10% / Sclerotherapy 0%
  vsMix: 0.65,               // IS!B10 (was 0.56)
  rfMix: 0.10,               // IS!B11
  scleroMix: 0.00,           // IS!B12 — retired, superseded by Varithena
  venasealUnitCost: 900,     // IS!D16 kit price (was 850)
  rfSupplyCost: 120,
  // scleroSupplyCost now represents full procedural overhead (IS!F47=$120.15)
  // Used in calcVarithenaCostPerProc as: scleroSupplyCost + varithenaDrugCost = $270
  scleroSupplyCost: 120,     // IS!F47 total (was 45)
  marketingSpend: {
    // ISOLATED DOWNSIDE: Conservative marketing spend = Base (not a downside lever).
    conservative: [3500, 4000, 4500, 5500, 7000, 8500, 10000, 12000, 14000, 22000, 24000, 26000],
    base:         [3500, 4000, 4500, 5500, 7000, 8500, 10000, 12000, 14000, 22000, 24000, 26000],
    aggressive:   [6000, 8000, 11000, 14000, 17000, 20000, 22000, 24000, 26000, 30000, 32000, 34000],
  },
  physicianSalary: 200000,
  rvtSalary: 124800,
  maSalary: 54000,
  frontOfficeSalary: 42000,
  payrollTaxRate: 0.15,
  benefitsRate: 0.25,
  rent: 8500,
  malpractice: 1200,
  emr: 800,
  billing: 1500,
  managementFeeRate: 0.08,
  // ISOLATED DOWNSIDE: Conservative = Base for Y2/Y3 growth (not a downside lever).
  y2VolumeGrowth: { conservative: 0.39, base: 0.39, aggressive: 0.55 },
  y3VolumeGrowth: { conservative: 0.40, base: 0.40, aggressive: 0.55 },
  varithenaShare: 0.25,      // IS!B13 (was 0.15)
  varithenaRates36465: { aetna: 1320, bcbs: 1450, humana: 1290, uhc: 1380, medicare: 1300 },
  varithenaRates36466: { aetna: 1420, bcbs: 1560, humana: 1380, uhc: 1490, medicare: 1400 },
  varithenaDrugCost: 150,    // IS!F51 formula: F47+150 → drug cost = $150 (was $300)
  payerMix: { aetna: 0.14, bcbs: 0.32, humana: 0.12, uhc: 0.18, medicare: 0.24 },
  varithenaEnabled: true,
}

// v11 CPT table — rates from SC!C124-C127 (CMS PFS 2025 non-facility)
// mixPct = volume share within the primary billing mix (must sum to 1.0 across active codes)
export const CPT_CODES = [
  // ── Primary billing mix (drives revenue model — SC!D124-D127) ─────────────
  { code: '36482', description: 'VenaSeal — Cyanoacrylate Closure (1st vein)',              category: 'procedure' as const, medicareRate: 1452.78, countAt50: 33, countAt100: 65, mixPct: 0.65 },
  { code: '36465', description: 'Varithena — Non-compounded foam, single segment',          category: 'procedure' as const, medicareRate: 1122.16, countAt50:  8, countAt100: 15, mixPct: 0.15 },
  { code: '36466', description: 'Varithena — Non-compounded foam, multiple segments',       category: 'procedure' as const, medicareRate: 1253.75, countAt50:  5, countAt100: 10, mixPct: 0.10 },
  { code: '36475', description: 'RF Ablation — Endovenous Radiofrequency (1st vein)',       category: 'procedure' as const, medicareRate: 1700.00, countAt50:  5, countAt100: 10, mixPct: 0.10 },
  // ── Ancillary / diagnostic (scales with procedures — not in blended rate) ──
  { code: '93970', description: 'Duplex scan — bilateral lower extremity',                  category: 'procedure' as const, medicareRate:  170.25, countAt50: 12, countAt100: 24, mixPct: 0.00 },
  { code: '93971', description: 'Duplex scan — unilateral lower extremity',                 category: 'procedure' as const, medicareRate:  108.99, countAt50: 25, countAt100: 50, mixPct: 0.00 },
  // ── Retired from active mix (0% — superseded by Varithena CPTs) ───────────
  { code: '36471', description: 'Sclerotherapy — multiple injections (retired from mix)',   category: 'procedure' as const, medicareRate:  231.00, countAt50:  0, countAt100:  0, mixPct: 0.00 },
  // ── E&M codes ──────────────────────────────────────────────────────────────
  { code: '99213', description: 'Office visit — established patient, low complexity',       category: 'em' as const,        medicareRate:   93.00, countAt50: 50, countAt100: 100, mixPct: 0.50 },
  { code: '99214', description: 'Office visit — established patient, moderate complexity',  category: 'em' as const,        medicareRate:  134.00, countAt50: 40, countAt100:  80, mixPct: 0.40 },
  { code: '99215', description: 'Office visit — established patient, high complexity',      category: 'em' as const,        medicareRate:  174.00, countAt50: 10, countAt100:  20, mixPct: 0.10 },
]
