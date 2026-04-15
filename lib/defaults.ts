import type { Assumptions, MarketPayerMix } from './types'

// Source: SC!B142 market selector → SC!B145-B149.
// New Braunfels (Comal Co.): 18% age 65+ → 25% govt payer mix.
// Forney (Kaufman Co.): 11% age 65+ → 15% govt payer mix.
export const MARKET_PAYER_MIX: Record<string, MarketPayerMix> = {
  newBraunfels: { government: 0.25, commercial: 0.75 },  // SC!B145 (was 0.15/0.85)
  forney:       { government: 0.15, commercial: 0.85 },  // SC!B146
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  scenario: 'base',
  market: 'newBraunfels',
  cpl: { conservative: 75, base: 60, aggressive: 45 },
  contactRate: { conservative: 0.30, base: 0.40, aggressive: 0.50 },
  bookingRate: { conservative: 0.50, base: 0.60, aggressive: 0.70 },
  showRate: { conservative: 0.70, base: 0.78, aggressive: 0.85 },
  treatmentConversion: { conservative: 0.55, base: 0.65, aggressive: 0.75 },
  procsPerPatient: { conservative: 3.0, base: 3.5, aggressive: 4.0 },
  maxCapacityPerMonth: 146,
  medicareRate: { conservative: 1147, base: 1147, aggressive: 1147 },
  // Commercial multiplier v11: BCBS 30%×1.30 + Aetna/UHC/Cigna 70%×1.58 = 1.496 (SC!D156→F15)
  commercialMultiplier: { conservative: 1.496, base: 1.496, aggressive: 1.496 },
  bcbsMultiplier: 1.30,              // SC!C154 — BCBS rate vs Medicare
  otherCommercialMultiplier: 1.58,   // SC!C155 — Aetna/UHC/Cigna blended
  bcbsShareOfCommercial: 0.30,       // SC!B154 — BCBS 30% of commercial
  medicareMix: 0.15,                 // SC!F16 — Forney market
  commercialMix: 0.85,               // SC!F17 — Forney market
  wasteFactor: 0.075,
  miscConsumables: 15,
  postProcSupport: 17.49,  // IS!B7 — aligned to spreadsheet (was 17.50)
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
    // v11 SC conservative ramp (scaled ~85% of base)
    conservative: [3000, 3500, 4000, 5000, 6000, 7500, 9000, 10000, 12000, 18000, 20000, 22000],
    // v11 SC base ramp (Oct–Sep)
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
  y2VolumeGrowth: { conservative: 0.30, base: 0.39, aggressive: 0.55 },
  y3VolumeGrowth: { conservative: 0.30, base: 0.40, aggressive: 0.55 },
  varithenaShare: 0.25,      // IS!B13 (was 0.15)
  varithenaRates36465: { aetna: 1320, bcbs: 1450, humana: 1290, uhc: 1380, medicare: 1300 },
  varithenaRates36466: { aetna: 1420, bcbs: 1560, humana: 1380, uhc: 1490, medicare: 1400 },
  varithenaDrugCost: 150,    // IS!F51 formula: F47+150 → drug cost = $150 (was $300)
  payerMix: { aetna: 0.14, bcbs: 0.32, humana: 0.12, uhc: 0.18, medicare: 0.24 },
  varithenaEnabled: true,
}

export const CPT_CODES = [
  { code: '36475', description: 'Endovenous RF 1st vein', category: 'procedure' as const, medicareRate: 890, countAt50: 22, countAt100: 44, mixPct: 0.10 },
  { code: '36476', description: 'Endovenous RF each add vein', category: 'procedure' as const, medicareRate: 420, countAt50: 14, countAt100: 28, mixPct: 0.06 },
  { code: '36478', description: 'Endovenous laser 1st vein', category: 'procedure' as const, medicareRate: 890, countAt50: 10, countAt100: 20, mixPct: 0.05 },
  { code: '36479', description: 'Endovenous laser each add vein', category: 'procedure' as const, medicareRate: 420, countAt50: 6, countAt100: 12, mixPct: 0.03 },
  { code: '36482', description: 'VenaSeal 1st vein', category: 'procedure' as const, medicareRate: 1150, countAt50: 34, countAt100: 68, mixPct: 0.15 },
  { code: '36483', description: 'VenaSeal each add vein', category: 'procedure' as const, medicareRate: 580, countAt50: 22, countAt100: 44, mixPct: 0.10 },
  { code: '36470', description: 'Sclerotherapy single vein', category: 'procedure' as const, medicareRate: 290, countAt50: 30, countAt100: 60, mixPct: 0.14 },
  { code: '36471', description: 'Sclerotherapy multiple veins', category: 'procedure' as const, medicareRate: 420, countAt50: 20, countAt100: 40, mixPct: 0.09 },
  { code: '93971', description: 'Duplex scan lower extremity unilateral', category: 'procedure' as const, medicareRate: 280, countAt50: 50, countAt100: 100, mixPct: 0.23 },
  { code: '93970', description: 'Duplex scan lower extremity bilateral', category: 'procedure' as const, medicareRate: 380, countAt50: 12, countAt100: 24, mixPct: 0.05 },
  { code: '99213', description: 'Office visit est patient low complexity', category: 'em' as const, medicareRate: 93, countAt50: 50, countAt100: 100, mixPct: 0.50 },
  { code: '99214', description: 'Office visit est patient moderate complexity', category: 'em' as const, medicareRate: 134, countAt50: 40, countAt100: 80, mixPct: 0.40 },
  { code: '99215', description: 'Office visit est patient high complexity', category: 'em' as const, medicareRate: 174, countAt50: 10, countAt100: 20, mixPct: 0.10 },
]
