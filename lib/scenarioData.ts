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

export const REIMBURSEMENT = {
  medicareBase: 1147,
  commercialMultiplier: 2.55,
  matureMedicarePct: 0.15,
  matureCommercialPct: 0.85,
  matureBlendedRate: 2658,
  mgmtFeeRate: 0.08,
  procsPerPatient: 2.9,
} as const

export const COGS_PER_PROC = {
  venaSealMixPct: 0.65, costPerProc: 400,
  rfAblationMixPct: 0.10, rfCostPerProc: 200,
  scleroMixPct: 0.25, scleroCostPerProc: 65,
  varithenaMixPct: 0.15, varithenaCostPerProc: 40,
  postProcedureSupport: 17.49,
} as const

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
  y2MarketingAnnual: 180_000,
  y3MarketingAnnual: 150_000,
  y2PhysicianSalary: 200_000,
  y3PhysicianSalary: 300_000,
  monthlyFunnel: [
    { month: "Oct '25", marketingSpend: 5200,  cpl: 65, contactRate: 0.280, bookingRate: 0.450, showRate: 0.65, treatmentConv: 0.50, commercialPct: 0.85 },
    { month: "Nov '25", marketingSpend: 6000,  cpl: 62, contactRate: 0.289, bookingRate: 0.459, showRate: 0.66, treatmentConv: 0.52, commercialPct: 0.85 },
    { month: "Dec '25", marketingSpend: 8000,  cpl: 60, contactRate: 0.299, bookingRate: 0.468, showRate: 0.68, treatmentConv: 0.55, commercialPct: 0.85 },
    { month: "Jan '26", marketingSpend: 10000, cpl: 58, contactRate: 0.308, bookingRate: 0.486, showRate: 0.69, treatmentConv: 0.57, commercialPct: 0.85 },
    { month: "Feb '26", marketingSpend: 12000, cpl: 56, contactRate: 0.317, bookingRate: 0.504, showRate: 0.71, treatmentConv: 0.59, commercialPct: 0.85 },
    { month: "Mar '26", marketingSpend: 13500, cpl: 54, contactRate: 0.327, bookingRate: 0.513, showRate: 0.72, treatmentConv: 0.61, commercialPct: 0.85 },
    { month: "Apr '26", marketingSpend: 14000, cpl: 52, contactRate: 0.336, bookingRate: 0.522, showRate: 0.73, treatmentConv: 0.62, commercialPct: 0.85 },
    { month: "May '26", marketingSpend: 14500, cpl: 51, contactRate: 0.341, bookingRate: 0.531, showRate: 0.74, treatmentConv: 0.63, commercialPct: 0.85 },
    { month: "Jun '26", marketingSpend: 15000, cpl: 51, contactRate: 0.345, bookingRate: 0.540, showRate: 0.75, treatmentConv: 0.64, commercialPct: 0.85 },
    { month: "Jul '26", marketingSpend: 15000, cpl: 50, contactRate: 0.350, bookingRate: 0.540, showRate: 0.75, treatmentConv: 0.65, commercialPct: 0.85 },
    { month: "Aug '26", marketingSpend: 15000, cpl: 50, contactRate: 0.350, bookingRate: 0.540, showRate: 0.75, treatmentConv: 0.65, commercialPct: 0.85 },
    { month: "Sep '26", marketingSpend: 15000, cpl: 50, contactRate: 0.350, bookingRate: 0.540, showRate: 0.75, treatmentConv: 0.65, commercialPct: 0.85 },
  ],
}

const CONSERVATIVE: ScenarioConfig = {
  label: 'Conservative / Base',
  matureCpl: 51,
  matureContactRate: 0.40,
  matureBookingRate: 0.60,
  matureShowRate: 0.78,
  matureTreatmentConv: 0.65,
  procsPerPatient: 2.9,
  maxCapacityPerMonth: 140,
  y2ProcGrowthRate: 0.50,
  y3ProcGrowthRate: 0.32,
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
    { month: "Jul '26", marketingSpend: 16000, cpl: 51, contactRate: 0.40, bookingRate: 0.60, showRate: 0.78, treatmentConv: 0.65, commercialPct: 0.85 },
    { month: "Aug '26", marketingSpend: 18000, cpl: 51, contactRate: 0.40, bookingRate: 0.60, showRate: 0.78, treatmentConv: 0.65, commercialPct: 0.85 },
    { month: "Sep '26", marketingSpend: 20000, cpl: 51, contactRate: 0.40, bookingRate: 0.60, showRate: 0.78, treatmentConv: 0.65, commercialPct: 0.85 },
  ],
}

export const SCENARIOS: Record<ScenarioKey, ScenarioConfig> = {
  downside: DOWNSIDE,
  conservative: CONSERVATIVE,
}

export const DEFAULT_SCENARIO: ScenarioKey = 'conservative'
