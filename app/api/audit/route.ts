import { NextResponse } from 'next/server'
import { REIMBURSEMENT, SCENARIOS, DEFAULT_SCENARIO } from '@/lib/scenarioData'
import { DEFAULT_ASSUMPTIONS, CPT_CODES, MARKET_PAYER_MIX } from '@/lib/defaults'
import {
  calcWeightedMedicareBase,
  calcOverallBlendedRate,
  calcVarithenaCostPerProc,
  calcWeightedSupplyCost,
} from '@/lib/model'
import { runFunnelYear1, calcMultiYearRevenue } from '@/lib/v10Calculations'
import { payerMixByMarket } from '@/lib/payerMix'

export async function GET() {
  const scenario = SCENARIOS[DEFAULT_SCENARIO]
  const a        = DEFAULT_ASSUMPTIONS
  const y1Months = runFunnelYear1(scenario)
  const multiYear = calcMultiYearRevenue(scenario, y1Months)

  return NextResponse.json({
    _meta: {
      generated:       new Date().toISOString(),
      activeScenario:  DEFAULT_SCENARIO,
      note:            'Read-only audit export — no model files modified.',
    },

    reimbursement: {
      ...REIMBURSEMENT,
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
      y1: multiYear.y1,
      y2: multiYear.y2,
      y3: multiYear.y3,
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
