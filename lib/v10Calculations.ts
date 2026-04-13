import { ScenarioConfig, REIMBURSEMENT } from './scenarioData'

export function calcBlendedRate(commercialPct: number): number {
  const medicarePct = 1 - commercialPct
  return Math.round(
    REIMBURSEMENT.medicareBase *
    (medicarePct * 1.0 + commercialPct * REIMBURSEMENT.commercialMultiplier)
  )
}

export interface MonthResult {
  month: string
  marketingSpend: number
  leads: number
  contacts: number
  booked: number
  shows: number
  treatedPatients: number
  rawProcs: number
  totalProcs: number
  utilizationPct: number
  blendedRate: number
  grossRevenue: number
  medicareRevenue: number
  commercialRevenue: number
}

export function runFunnelYear1(scenario: ScenarioConfig): MonthResult[] {
  return scenario.monthlyFunnel.map((m) => {
    const blendedRate = calcBlendedRate(m.commercialPct)
    const leads       = Math.floor(m.marketingSpend / m.cpl)
    const contacts    = Math.floor(leads * m.contactRate)
    const booked      = Math.floor(contacts * m.bookingRate)
    const shows       = Math.floor(booked * m.showRate)
    const treated     = Math.floor(shows * m.treatmentConv)
    const rawProcs    = Math.round(treated * scenario.procsPerPatient)
    const totalProcs  = Math.min(rawProcs, scenario.maxCapacityPerMonth)
    const grossRevenue    = totalProcs * blendedRate
    const medicareRevenue = Math.round(grossRevenue * (1 - m.commercialPct))
    const commercialRevenue = Math.round(grossRevenue * m.commercialPct)
    return {
      month: m.month,
      marketingSpend: m.marketingSpend,
      leads, contacts, booked, shows,
      treatedPatients: treated,
      rawProcs, totalProcs,
      utilizationPct: totalProcs / scenario.maxCapacityPerMonth,
      blendedRate,
      grossRevenue,
      medicareRevenue,
      commercialRevenue,
    }
  })
}

export interface YearSummary {
  annualProcs: number
  blendedRate: number
  grossRevenue: number
  mgmtFee: number
  netRevenue: number
}

export function calcMultiYearRevenue(
  scenario: ScenarioConfig,
  y1Months: MonthResult[]
): { y1: YearSummary; y2: YearSummary; y3: YearSummary } {
  const matureRate = REIMBURSEMENT.matureBlendedRate
  const cap        = scenario.maxCapacityPerMonth * 12

  const y1Procs = y1Months.reduce((s, m) => s + m.totalProcs, 0)
  const y1Rev   = y1Months.reduce((s, m) => s + m.grossRevenue, 0)

  const y2Procs = Math.min(Math.round(y1Procs * (1 + scenario.y2ProcGrowthRate)), cap)
  const y2Rev   = y2Procs * matureRate

  const y3Procs = Math.min(Math.round(y2Procs * (1 + scenario.y3ProcGrowthRate)), cap)
  const y3Rev   = y3Procs * matureRate

  const toSummary = (procs: number, rev: number): YearSummary => ({
    annualProcs: procs,
    blendedRate: matureRate,
    grossRevenue: rev,
    mgmtFee: -Math.round(rev * REIMBURSEMENT.mgmtFeeRate),
    netRevenue: Math.round(rev * (1 - REIMBURSEMENT.mgmtFeeRate)),
  })

  return {
    y1: { ...toSummary(y1Procs, y1Rev), blendedRate: y1Procs > 0 ? Math.round(y1Rev / y1Procs) : 0 },
    y2: toSummary(y2Procs, y2Rev),
    y3: toSummary(y3Procs, y3Rev),
  }
}
