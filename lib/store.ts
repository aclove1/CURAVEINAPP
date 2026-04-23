'use client'

import { create } from 'zustand'
import type { Assumptions, Scenario } from './types'
import { DEFAULT_ASSUMPTIONS } from './defaults'

interface ModelStore {
  assumptions: Assumptions
  setScenario: (scenario: Scenario) => void
  updateAssumption: <K extends keyof Assumptions>(key: K, value: Assumptions[K]) => void
  resetToDefaults: () => void
}

export const useModelStore = create<ModelStore>((set) => ({
  assumptions: DEFAULT_ASSUMPTIONS,
  setScenario: (scenario) =>
    set((state) => ({ assumptions: { ...state.assumptions, scenario } })),
  updateAssumption: (key, value) =>
    set((state) => ({ assumptions: { ...state.assumptions, [key]: value } })),
  resetToDefaults: () => set({ assumptions: DEFAULT_ASSUMPTIONS }),
}))

// AUDIT.md C-4 resolved: useV10Results and v10 shadow engine retired.
// All consumers now use calcAnnualPL + calcFunnelMonth from lib/model.ts
// directly (see app/page.tsx for the `dash` useMemo pattern).
