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
  const { activeV10Scenario } = useModelStore()
  const scenario = SCENARIOS[activeV10Scenario]
  const y1Months = runFunnelYear1(scenario)
  const multiYear = calcMultiYearRevenue(scenario, y1Months)
  return { scenario, y1Months, ...multiYear, activeV10Scenario }
}
