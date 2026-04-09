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
