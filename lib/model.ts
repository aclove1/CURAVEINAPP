import type {
  Assumptions,
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

export function calcBlendedRate(a: Assumptions): number {
  const medicareRate = sv(a.medicareRate, a.scenario)
  const multiplier = sv(a.commercialMultiplier, a.scenario)
  return Math.round(medicareRate * (a.medicareMix + a.commercialMix * multiplier))
}

export function calcRevenueMonth(month: number, a: Assumptions): RevenueMonth {
  const funnel = calcFunnelMonth(month, a)
  const procs = funnel.cappedProcs
  const blendedRate = calcBlendedRate(a)
  const medicareRate = sv(a.medicareRate, a.scenario)
  const commercialRate = Math.round(medicareRate * sv(a.commercialMultiplier, a.scenario))
  const grossRevenue = procs * blendedRate
  const managementFee = -Math.round(a.managementFeeRate * grossRevenue)
  const netRevenue = grossRevenue + managementFee
  const medicareRevenue = Math.round(procs * a.medicareMix * medicareRate)
  const commercialRevenue = Math.round(procs * a.commercialMix * commercialRate)
  return { month, blendedRate, grossRevenue, managementFee, netRevenue, medicareRevenue, commercialRevenue, procs }
}

export function calcWeightedSupplyCost(a: Assumptions): number {
  const venasealPerProc = (a.venasealUnitCost / a.venasealPtsPerKit) * (1 + a.wasteFactor)
  const rfPerProc = a.rfSupplyCost * (1 + a.wasteFactor)
  const scleroPerProc = a.scleroSupplyCost * (1 + a.scleroBuffer) * (1 + a.wasteFactor)
  return a.vsMix * venasealPerProc + a.rfMix * rfPerProc + a.scleroMix * scleroPerProc + a.miscConsumables + a.postProcSupport
}

export function calcCOGSMonth(month: number, a: Assumptions): COGSMonth {
  const funnel = calcFunnelMonth(month, a)
  const procs = funnel.cappedProcs
  const venasealCost = Math.round(procs * a.vsMix * (a.venasealUnitCost / a.venasealPtsPerKit) * (1 + a.wasteFactor))
  const rfCost = Math.round(procs * a.rfMix * a.rfSupplyCost * (1 + a.wasteFactor))
  const scleroCost = Math.round(procs * a.scleroMix * a.scleroSupplyCost * (1 + a.scleroBuffer) * (1 + a.wasteFactor))
  const postProcCost = Math.round(procs * a.postProcSupport)
  const miscCost = Math.round(procs * a.miscConsumables)
  const totalCOGS = venasealCost + rfCost + scleroCost + postProcCost + miscCost
  return { month, venasealCost, rfCost, scleroCost, postProcCost, miscCost, totalCOGS, procs }
}

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

export function calcAnnualPL(year: 1 | 2 | 3, a: Assumptions): AnnualPL {
  let totalProcs = 0
  let grossRevenue = 0
  let managementFee = 0
  let netRevenue = 0
  let totalCOGS = 0
  let totalOpex = 0

  const blendedRate = calcBlendedRate(a)
  const weightedCogs = calcWeightedSupplyCost(a)
  const personnelAnnual = calcPersonnelCost(a) * 12

  let physicianSalary = a.physicianSalary
  if (year === 2) physicianSalary = a.physicianSalary
  if (year === 3) physicianSalary = 300000

  const y2Growth = sv(a.y2VolumeGrowth, a.scenario)
  const y3Growth = sv(a.y3VolumeGrowth, a.scenario)

  for (let m = 1; m <= 12; m++) {
    const pl = calcPLMonth(m, a)
    let procs = pl.procs
    if (year === 2) procs = Math.min(Math.round(procs * (1 + y2Growth)), a.maxCapacityPerMonth)
    if (year === 3) {
      const y2Procs = Math.min(Math.round(procs * (1 + y2Growth)), a.maxCapacityPerMonth)
      procs = Math.min(Math.round(y2Procs * (1 + y3Growth)), a.maxCapacityPerMonth)
    }
    totalProcs += procs
    grossRevenue += procs * blendedRate
    totalCOGS += Math.round(procs * weightedCogs)
  }

  managementFee = -Math.round(a.managementFeeRate * grossRevenue)
  netRevenue = grossRevenue + managementFee

  const marketingTotal = svArr(a.marketingSpend, a.scenario).reduce((s, v) => s + v, 0)
  const billingTotal = Math.round(a.billing * 12 + grossRevenue * 0.02)

  let annualPersonnel = personnelAnnual
  if (year === 3) {
    annualPersonnel = Math.round((a.rvtSalary + a.maSalary + a.frontOfficeSalary + physicianSalary) * (1 + a.payrollTaxRate + a.benefitsRate))
  }

  totalOpex = annualPersonnel + marketingTotal + a.rent * 12 + a.malpractice * 12 + a.emr * 12 + billingTotal

  const grossProfit = netRevenue - totalCOGS
  const grossMargin = netRevenue > 0 ? grossProfit / netRevenue : 0
  const ebitda = grossProfit - totalOpex
  const ebitdaMargin = netRevenue > 0 ? ebitda / netRevenue : 0

  return { year, grossRevenue, managementFee, netRevenue, totalCOGS, grossProfit, grossMargin, totalOpex, ebitda, ebitdaMargin, totalProcs }
}

export function calcBreakeven(a: Assumptions): { monthlyBreakevenProcs: number; breakevenMonth: number | null } {
  const blendedRate = calcBlendedRate(a)
  const weightedCogs = calcWeightedSupplyCost(a)
  const fixedMonthly = calcPersonnelCost(a) + a.rent + a.malpractice + a.emr + a.billing
  const contributionMarginRate = blendedRate * (1 - a.managementFeeRate) - weightedCogs
  const monthlyBreakevenProcs = contributionMarginRate > 0 ? Math.ceil(fixedMonthly / contributionMarginRate) : 9999

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

export function calcAllMonths(a: Assumptions) {
  return Array.from({ length: 12 }, (_, i) => i + 1).map(m => ({
    funnel: calcFunnelMonth(m, a),
    revenue: calcRevenueMonth(m, a),
    cogs: calcCOGSMonth(m, a),
    opex: calcOpexMonth(m, a),
    pl: calcPLMonth(m, a),
  }))
}
