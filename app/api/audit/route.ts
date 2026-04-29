import { NextResponse } from 'next/server'
import { DEFAULT_ASSUMPTIONS, CPT_CODES } from '@/lib/defaults'
import {
  calcWeightedMedicareBase,
  calcOverallBlendedRate,
  calcVarithenaCostPerProc,
  calcWeightedSupplyCost,
  calcAnnualPL,
  calcFunnelMonth,
  calcRevenueMonth,
  adjustAssumptionsForYear,
} from '@/lib/model'
import { MONTH_LABELS } from '@/lib/formatters'
import { payerMixByMarket } from '@/lib/payerMix'

// AUDIT.md C-4 resolved: v10 shadow engine retired. Audit endpoint now
// reports directly from calcAnnualPL — matches what the dashboard + all
// other pages show.
export async function GET() {
  const a = DEFAULT_ASSUMPTIONS
  const adjY1 = adjustAssumptionsForYear(1, a)
  const y1PL = calcAnnualPL(1, a)
  const y2PL = calcAnnualPL(2, a)
  const y3PL = calcAnnualPL(3, a)

  const y1Months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const f = calcFunnelMonth(m, adjY1)
    const r = calcRevenueMonth(m, adjY1, 1)
    return {
      month: MONTH_LABELS[i],
      blendedRate: r.blendedRate,
      totalProcs: f.cappedProcs,
      grossRevenue: r.grossRevenue,
      medicareRevenue: r.medicareRevenue,
      commercialRevenue: r.commercialRevenue,
      // AUDIT 2026-04-26 C-12: surfaced so external diligence consumers can
      // verify medicareRevenue + commercialRevenue + usRevenue == grossRevenue.
      usRevenue: r.usRevenue,
    }
  })

  const summarize = (pl: typeof y1PL) => ({
    annualProcs:  pl.totalProcs,
    grossRevenue: pl.grossRevenue,
    mgmtFee:      pl.managementFee,
    netRevenue:   pl.netRevenue,
    totalCOGS:    pl.totalCOGS,
    ebitda:       pl.ebitda,
    ebitdaMargin: pl.ebitdaMargin,
  })

  return NextResponse.json({
    _meta: {
      generated:       new Date().toISOString(),
      activeScenario:  a.scenario,
      engine:          'lib/model.ts::calcAnnualPL (v10 shadow retired per AUDIT C-4)',
      note:            'Read-only audit export — no model files modified.',
    },

    reimbursement: {
      derivedMedicareBase:  calcWeightedMedicareBase(),
      derivedBlendedRate:   calcOverallBlendedRate(a),
    },

    payerMix: {
      defaults: {
        medicareMix:    a.medicareMix,
        commercialMix:  a.commercialMix,
      },
      byMarket:                  payerMixByMarket,
      bcbsShare:                 a.bcbsShareOfCommercial,
      bcbsMultiplier:            a.bcbsMultiplier,
      otherCommercialMultiplier: a.otherCommercialMultiplier,
    },

    procedureMix: {
      venaSeal:      a.vsMix,
      rfa:           a.rfMix,
      sclerotherapy: a.scleroMix,
      varithena:     a.varithenaShare,
    },

    cogs: {
      venasealUnitCost:      a.venasealUnitCost,
      venasealPtsPerKit:     a.venasealPtsPerKit,
      venasealCostPerProc:   a.venasealUnitCost / a.venasealPtsPerKit,
      varithenaCostPerProc:  calcVarithenaCostPerProc(a),
      varithenaDrugCost:     a.varithenaDrugCost,
      scleroSupplyCost:      a.scleroSupplyCost,
      postProcSupport:       a.postProcSupport,
      miscConsumables:       a.miscConsumables,
      wasteFactor:           a.wasteFactor,
      blendedWeightedCogs:   calcWeightedSupplyCost(a),
    },

    funnel: {
      cpl:                 a.cpl,
      contactRate:         a.contactRate,
      bookingRate:         a.bookingRate,
      showRate:            a.showRate,
      treatmentConversion: a.treatmentConversion,
      procsPerPatient:     a.procsPerPatient,
      maxCapacityPerMonth: a.maxCapacityPerMonth,
    },

    growth: {
      y2VolumeGrowth: a.y2VolumeGrowth,
      y3VolumeGrowth: a.y3VolumeGrowth,
    },

    cptTable: CPT_CODES,

    multiYear: {
      y1: summarize(y1PL),
      y2: summarize(y2PL),
      y3: summarize(y3PL),
    },

    monthlyY1: y1Months.map(m => ({
      month:          m.month,
      blendedRate:    m.blendedRate,
      totalProcs:     m.totalProcs,
      grossRevenue:   m.grossRevenue,
      commercialPct:  m.grossRevenue > 0
        ? m.commercialRevenue / m.grossRevenue
        : 0,
    })),
  })
}
