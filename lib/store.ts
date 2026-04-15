'use client'

import { create } from 'zustand'
import type { Assumptions, Scenario } from './types'
import { DEFAULT_ASSUMPTIONS } from './defaults'
import type { ScenarioKey } from './scenarioData'
import { SCENARIOS, DEFAULT_SCENARIO } from './scenarioData'
import { runFunnelYear1, calcMultiYearRevenue } from './v10Calculations'

interface ModelStore {
  assumptions: Assumptions
  setScenario: (scenario: Scenario) => void
  updateAssumption: <K extends keyof Assumptions>(key: K, value: Assumptions[K]) => void
  resetToDefaults: () => void
  activeV10Scenario: ScenarioKey
  setV10Scenario: (key: ScenarioKey) => void
}

export const useModelStore = create<ModelStore>((set) => ({
  assumptions: DEFAULT_ASSUMPTIONS,
  setScenario: (scenario) =>
    set((state) => ({ assumptions: { ...state.assumptions, scenario } })),
  updateAssumption: (key, value) =>
    set((state) => ({ assumptions: { ...state.assumptions, [key]: value } })),
  resetToDefaults: () => set({ assumptions: DEFAULT_ASSUMPTIONS }),
  activeV10Scenario: DEFAULT_SCENARIO,
  setV10Scenario: (key) => set({ activeV10Scenario: key }),
}))

export function useV10Results() {
  const { activeV10Scenario, assumptions } = useModelStore()
  const base = SCENARIOS[activeV10Scenario]

  // Pull the active scenario column from tri-value assumption objects
  const sc = assumptions.scenario as string
  function sv<T>(obj: { conservative: T; base: T; aggressive: T }): T {
    return obj[sc as keyof typeof obj] ?? obj.base
  }

  // Scale factors preserve the ramp shape while applying slider deltas.
  // e.g. if user raises show rate from 78%→85%, all ramp months scale up proportionally.
  const contactScale = base.matureContactRate   > 0 ? sv(assumptions.contactRate)         / base.matureContactRate   : 1
  const bookingScale = base.matureBookingRate   > 0 ? sv(assumptions.bookingRate)          / base.matureBookingRate   : 1
  const showScale    = base.matureShowRate      > 0 ? sv(assumptions.showRate)             / base.matureShowRate      : 1
  const treatScale   = base.matureTreatmentConv > 0 ? sv(assumptions.treatmentConversion)  / base.matureTreatmentConv : 1

  const scenario: typeof base = {
    ...base,
    matureContactRate:   sv(assumptions.contactRate),
    matureBookingRate:   sv(assumptions.bookingRate),
    matureShowRate:      sv(assumptions.showRate),
    matureTreatmentConv: sv(assumptions.treatmentConversion),
    procsPerPatient:     sv(assumptions.procsPerPatient),
    maxCapacityPerMonth: assumptions.maxCapacityPerMonth,
    monthlyFunnel: base.monthlyFunnel.map((m, idx) => ({
      ...m,
      cpl:           idx >= 4 ? sv(assumptions.cpl) : m.cpl,
      contactRate:   m.contactRate   * contactScale,
      bookingRate:   m.bookingRate   * bookingScale,
      showRate:      m.showRate      * showScale,
      treatmentConv: m.treatmentConv * treatScale,
    })),
  }

  const y1Months = runFunnelYear1(scenario)
  const multiYear = calcMultiYearRevenue(scenario, y1Months)
  return { scenario, y1Months, ...multiYear, activeV10Scenario }
}
