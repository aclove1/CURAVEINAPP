import { NextResponse } from 'next/server'
import { DEFAULT_ASSUMPTIONS, CPT_CODES, INCOME_BUFFER_FACTOR, BUFFER_DISCLOSURE, applyIncomeBuffer } from '@/lib/defaults'
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
      // verify medicareRevenue + commercialRevenue + usRevenue + scleroRevenue == grossRevenue.
      // v14: scleroRevenue added as third bundle line.
      usRevenue: r.usRevenue,
      scleroRevenue: r.scleroRevenue,
    }
  })

  // v14.1 — surface BOTH raw and buffered income figures so external
  // diligence consumers can verify the buffer is applied correctly and
  // see what was haircut. Costs (mgmtFee, COGS) are not buffered.
  const summarize = (pl: typeof y1PL) => ({
    annualProcs:           pl.totalProcs,
    // raw modeled values
    grossRevenue:          pl.grossRevenue,
    mgmtFee:               pl.managementFee,
    netRevenue:            pl.netRevenue,
    totalCOGS:             pl.totalCOGS,
    ebitda:                pl.ebitda,
    ebitdaMargin:          pl.ebitdaMargin,
    // v14.1 buffered (×0.90) — what the dashboard displays
    bufferedGrossRevenue:  applyIncomeBuffer(pl.grossRevenue),
    bufferedNetRevenue:    applyIncomeBuffer(pl.netRevenue),
    bufferedEbitda:        applyIncomeBuffer(pl.ebitda),
  })

  return NextResponse.json({
    _meta: {
      generated:       new Date().toISOString(),
      activeScenario:  a.scenario,
      engine:          'lib/model.ts::calcAnnualPL (v10 shadow retired per AUDIT C-4)',
      note:            'Read-only audit export — no model files modified.',
      // v14.1 — display-layer buffer disclosure for external diligence
      incomeBuffer: {
        factor:        INCOME_BUFFER_FACTOR,
        haircutPct:    Math.round((1 - INCOME_BUFFER_FACTOR) * 100),
        disclosure:    BUFFER_DISCLOSURE,
      },
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
      month:           m.month,
      blendedRate:     m.blendedRate,
      totalProcs:      m.totalProcs,
      grossRevenue:    m.grossRevenue,
      // v14 — surface bundle lines for external diligence reconciliation:
      //   grossRevenue == medicareRevenue + commercialRevenue + usRevenue + scleroRevenue
      medicareRevenue: m.medicareRevenue,
      commercialRevenue: m.commercialRevenue,
      usRevenue:       m.usRevenue,
      scleroRevenue:   m.scleroRevenue,
      commercialPct:   m.grossRevenue > 0
        ? m.commercialRevenue / m.grossRevenue
        : 0,
    })),
  })
}
