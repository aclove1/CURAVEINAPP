export type ScenarioKey = 'downside' | 'conservative'

export interface MonthlyFunnel {
  month: string
  marketingSpend: number
  cpl: number
  contactRate: number
  bookingRate: number
  showRate: number
  treatmentConv: number
  commercialPct: number
}

export interface ScenarioConfig {
  label: string
  matureCpl: number
  matureContactRate: number
  matureBookingRate: number
  matureShowRate: number
  matureTreatmentConv: number
  procsPerPatient: number
  maxCapacityPerMonth: number
  y2ProcGrowthRate: number
  y3ProcGrowthRate: number
  y2MarketingAnnual: number
  y3MarketingAnnual: number
  y2PhysicianSalary: number
  y3PhysicianSalary: number
  monthlyFunnel: MonthlyFunnel[]
}

// CPT Medicare rates are in lib/defaults.ts CPT_CODES and lib/model.ts FEE_SCHEDULE.
// Single source of truth — no duplicate rate constants here.

/* ── Reimbursement Constants (v11) ───────────────────────────── */
// Medicare weighted base $1,408 = SUMPRODUCT(CPT rates × volume shares).
// Commercial multiplier 1.496 = BCBS 30%×1.30 + Aetna/UHC/Cigna 70%×1.58 (SC!D156).
// Blended rate $2,002 = $1,408 × (15% govt + 85% comm × 1.496) — Forney market.

export const REIMBURSEMENT = {
  medicareBase: 1408,           // SC!E130 — CPT weighted Medicare base
  commercialMultiplier: 1.496,  // SC!F15 → D156 (derived from channel block)
  matureMedicarePct: 0.15,      // SC!F16 — Forney market (15% govt)
  matureCommercialPct: 0.85,    // SC!F17 — Forney market (85% commercial)
  matureBlendedRate: 2002,      // SC!F18 = ROUND(1408×(0.15+0.85×1.496),0)
  mgmtFeeRate: 0.08,
  procsPerEpisode: 3.5,         // SC!F12 — procedures per treated episode (Base)
} as const

// COGS inputs are in lib/defaults.ts (vsMix, rfMix, varithenaShare, etc.).
// Channel block inputs are in lib/defaults.ts and Scenario Controls.
// Single source of truth — no duplicate constants here.

const DOWNSIDE: ScenarioConfig = {
  label: 'Downside',
  matureCpl: 50,
  matureContactRate: 0.35,
  matureBookingRate: 0.54,
  matureShowRate: 0.75,
  matureTreatmentConv: 0.65,
  procsPerPatient: 2.9,
  maxCapacityPerMonth: 120,
  y2ProcGrowthRate: 0.464,
  y3ProcGrowthRate: 0.749,
  y2MarketingAnnual: 120_000,
  y3MarketingAnnual: 120_000,
  y2PhysicianSalary: 200_000,
  y3PhysicianSalary: 300_000,
  monthlyFunnel: [
    { month: "Oct '25", marketingSpend: 3500,  cpl: 65, contactRate: 0.280, bookingRate: 0.450, showRate: 0.65, treatmentConv: 0.50, commercialPct: 0.25 },
    { month: "Nov '25", marketingSpend: 4000,  cpl: 62, contactRate: 0.289, bookingRate: 0.459, showRate: 0.66, treatmentConv: 0.52, commercialPct: 0.35 },
    { month: "Dec '25", marketingSpend: 5000,  cpl: 60, contactRate: 0.299, bookingRate: 0.468, showRate: 0.68, treatmentConv: 0.55, commercialPct: 0.45 },
    { month: "Jan '26", marketingSpend: 6000,  cpl: 58, contactRate: 0.308, bookingRate: 0.486, showRate: 0.69, treatmentConv: 0.57, commercialPct: 0.55 },
    { month: "Feb '26", marketingSpend: 8000,  cpl: 56, contactRate: 0.317, bookingRate: 0.504, showRate: 0.71, treatmentConv: 0.59, commercialPct: 0.65 },
    { month: "Mar '26", marketingSpend: 10000, cpl: 54, contactRate: 0.327, bookingRate: 0.513, showRate: 0.72, treatmentConv: 0.61, commercialPct: 0.70 },
    { month: "Apr '26", marketingSpend: 10000, cpl: 52, contactRate: 0.336, bookingRate: 0.522, showRate: 0.73, treatmentConv: 0.62, commercialPct: 0.75 },
    { month: "May '26", marketingSpend: 10000, cpl: 51, contactRate: 0.341, bookingRate: 0.531, showRate: 0.74, treatmentConv: 0.63, commercialPct: 0.78 },
    { month: "Jun '26", marketingSpend: 10000, cpl: 51, contactRate: 0.345, bookingRate: 0.540, showRate: 0.75, treatmentConv: 0.64, commercialPct: 0.80 },
    { month: "Jul '26", marketingSpend: 10000, cpl: 50, contactRate: 0.350, bookingRate: 0.540, showRate: 0.75, treatmentConv: 0.65, commercialPct: 0.82 },
    { month: "Aug '26", marketingSpend: 10000, cpl: 50, contactRate: 0.350, bookingRate: 0.540, showRate: 0.75, treatmentConv: 0.65, commercialPct: 0.85 },
    { month: "Sep '26", marketingSpend: 10000, cpl: 50, contactRate: 0.350, bookingRate: 0.540, showRate: 0.75, treatmentConv: 0.65, commercialPct: 0.85 },
  ],
}

const CONSERVATIVE: ScenarioConfig = {
  label: 'Conservative / Base',
  matureCpl: 51,               // SC!D7 — channel-derived blended CPL
  matureContactRate: 0.40,     // SC!D8
  matureBookingRate: 0.60,     // SC!D9
  matureShowRate: 0.78,        // SC!D10
  matureTreatmentConv: 0.65,   // SC!D11
  procsPerPatient: 3.5,        // SC!D12 — procedures per treated episode
  maxCapacityPerMonth: 146,    // SC!D45
  y2ProcGrowthRate: 0.39,      // SC!D37
  y3ProcGrowthRate: 0.40,      // SC!D38
  y2MarketingAnnual: 180_000,
  y3MarketingAnnual: 150_000,
  y2PhysicianSalary: 200_000,
  y3PhysicianSalary: 300_000,
  monthlyFunnel: [
    { month: "Oct '25", marketingSpend: 3500,  cpl: 66, contactRate: 0.30, bookingRate: 0.55, showRate: 0.75, treatmentConv: 0.60, commercialPct: 0.40 },
    { month: "Nov '25", marketingSpend: 4000,  cpl: 64, contactRate: 0.31, bookingRate: 0.55, showRate: 0.75, treatmentConv: 0.61, commercialPct: 0.53 },
    { month: "Dec '25", marketingSpend: 4500,  cpl: 62, contactRate: 0.32, bookingRate: 0.56, showRate: 0.76, treatmentConv: 0.62, commercialPct: 0.67 },
    { month: "Jan '26", marketingSpend: 5500,  cpl: 60, contactRate: 0.34, bookingRate: 0.57, showRate: 0.76, treatmentConv: 0.63, commercialPct: 0.80 },
    { month: "Feb '26", marketingSpend: 7000,  cpl: 58, contactRate: 0.36, bookingRate: 0.58, showRate: 0.77, treatmentConv: 0.63, commercialPct: 0.85 },
    { month: "Mar '26", marketingSpend: 8500,  cpl: 56, contactRate: 0.38, bookingRate: 0.58, showRate: 0.77, treatmentConv: 0.64, commercialPct: 0.85 },
    { month: "Apr '26", marketingSpend: 10000, cpl: 54, contactRate: 0.39, bookingRate: 0.59, showRate: 0.78, treatmentConv: 0.64, commercialPct: 0.85 },
    { month: "May '26", marketingSpend: 12000, cpl: 52, contactRate: 0.40, bookingRate: 0.60, showRate: 0.78, treatmentConv: 0.65, commercialPct: 0.85 },
    { month: "Jun '26", marketingSpend: 14000, cpl: 52, contactRate: 0.40, bookingRate: 0.60, showRate: 0.78, treatmentConv: 0.65, commercialPct: 0.85 },
    { month: "Jul '26", marketingSpend: 22000, cpl: 51, contactRate: 0.40, bookingRate: 0.60, showRate: 0.78, treatmentConv: 0.65, commercialPct: 0.85 },
    { month: "Aug '26", marketingSpend: 24000, cpl: 51, contactRate: 0.40, bookingRate: 0.60, showRate: 0.78, treatmentConv: 0.65, commercialPct: 0.85 },
    { month: "Sep '26", marketingSpend: 26000, cpl: 51, contactRate: 0.40, bookingRate: 0.60, showRate: 0.78, treatmentConv: 0.65, commercialPct: 0.85 },
  ],
}

export const SCENARIOS: Record<ScenarioKey, ScenarioConfig> = {
  downside: DOWNSIDE,
  conservative: CONSERVATIVE,
}

export const DEFAULT_SCENARIO: ScenarioKey = 'conservative'
