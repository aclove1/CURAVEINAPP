'use client'

import { useMemo, useState } from 'react'
import { useModelStore } from '@/lib/store'
import { calcKeyMetrics } from '@/lib/model'
import { fmtCurrency, fmtDecimal } from '@/lib/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { DEFAULT_ASSUMPTIONS } from '@/lib/defaults'
import type { Assumptions } from '@/lib/types'

function NumberInput({
  value,
  onChange,
  isPercent = false,
  prefix = '',
}: {
  value: number
  onChange: (v: number) => void
  isPercent?: boolean
  prefix?: string
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')

  const display = isPercent
    ? `${(value * 100).toFixed(1)}%`
    : prefix
    ? `${prefix}${value.toLocaleString()}`
    : value.toString()

  return editing ? (
    <input
      autoFocus
      className="w-24 bg-gray-800 border border-blue-500 rounded px-2 py-0.5 text-blue-400 text-sm text-right outline-none"
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => {
        const parsed = parseFloat(raw)
        if (!isNaN(parsed)) onChange(isPercent ? parsed / 100 : parsed)
        setEditing(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  ) : (
    <span
      className="text-blue-400 text-sm cursor-pointer hover:underline font-mono"
      onClick={() => { setRaw(isPercent ? (value * 100).toFixed(1) : value.toString()); setEditing(true) }}
    >
      {display}
    </span>
  )
}

type ScenKey = 'conservative' | 'base' | 'aggressive'
const SCEN_KEYS: ScenKey[] = ['conservative', 'base', 'aggressive']
const SCEN_LABELS = { conservative: 'Conservative', base: 'Base', aggressive: 'Aggressive' }

function ScenarioRow({
  label,
  field,
  isPercent,
  prefix,
}: {
  label: string
  field: keyof Assumptions
  isPercent?: boolean
  prefix?: string
}) {
  const { assumptions, updateAssumption } = useModelStore()
  const val = assumptions[field] as { conservative: number; base: number; aggressive: number }

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/20">
      <td className="px-4 py-2.5 text-sm text-gray-300">{label}</td>
      {SCEN_KEYS.map((sk) => (
        <td key={sk} className="px-4 py-2.5 text-right">
          <NumberInput
            value={val[sk]}
            isPercent={isPercent}
            prefix={prefix}
            onChange={(v) => updateAssumption(field, { ...val, [sk]: v })}
          />
        </td>
      ))}
    </tr>
  )
}

function SingleRow({
  label,
  field,
  isPercent,
  prefix,
}: {
  label: string
  field: keyof Assumptions
  isPercent?: boolean
  prefix?: string
}) {
  const { assumptions, updateAssumption } = useModelStore()
  const value = assumptions[field] as number

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/20">
      <td className="px-4 py-2.5 text-sm text-gray-300">{label}</td>
      <td className="px-4 py-2.5 text-right" colSpan={3}>
        <NumberInput
          value={value}
          isPercent={isPercent}
          prefix={prefix}
          onChange={(v) => updateAssumption(field, v)}
        />
      </td>
    </tr>
  )
}

function SectionTable({
  title,
  children,
  onReset,
}: {
  title: string
  children: React.ReactNode
  onReset: () => void
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        <button onClick={onReset} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Reset</button>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/50">
            <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Parameter</th>
            {SCEN_KEYS.map((sk) => (
              <th key={sk} className="text-right px-4 py-2 text-xs text-gray-500 font-medium">{SCEN_LABELS[sk]}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export default function ScenarioPage() {
  const { assumptions, updateAssumption, resetToDefaults } = useModelStore()
  const metrics = useMemo(() => calcKeyMetrics(assumptions), [assumptions])

  return (
    <div>
      <TopBar title="Scenario Controls" />
      <div className="p-6 space-y-6">

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard label="Avg Monthly Procedures" value={fmtDecimal(metrics.avgMonthlyProcs, 1)} sub="Live preview" />
          <KpiCard label="Revenue / Procedure" value={fmtCurrency(metrics.revenuePerProc, false)} />
          <KpiCard label="COGS / Procedure" value={fmtCurrency(metrics.cogsPerProc, false)} />
          <KpiCard label="Stabilized EBITDA" value={fmtCurrency(metrics.stabilizedMonthlyEbitda)} highlight={metrics.stabilizedMonthlyEbitda > 0} />
          <KpiCard label="Y1 Total Revenue" value={fmtCurrency(metrics.y1TotalRevenue)} />
          <KpiCard label="Breakeven Month" value={metrics.breakevenMonth ? `Month ${metrics.breakevenMonth}` : 'N/A'} />
        </div>

        <div className="flex justify-end">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
          >
            Reset All to Defaults
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionTable title="DTC Funnel" onReset={() => {
            const d = DEFAULT_ASSUMPTIONS
            updateAssumption('cpl', d.cpl)
            updateAssumption('contactRate', d.contactRate)
            updateAssumption('bookingRate', d.bookingRate)
            updateAssumption('showRate', d.showRate)
            updateAssumption('treatmentConversion', d.treatmentConversion)
            updateAssumption('procsPerPatient', d.procsPerPatient)
          }}>
            <ScenarioRow label="Cost Per Lead ($)" field="cpl" prefix="$" />
            <ScenarioRow label="Contact Rate" field="contactRate" isPercent />
            <ScenarioRow label="Booking Rate" field="bookingRate" isPercent />
            <ScenarioRow label="Show Rate" field="showRate" isPercent />
            <ScenarioRow label="Treatment Conversion" field="treatmentConversion" isPercent />
            <ScenarioRow label="Procedures / Patient" field="procsPerPatient" />
            <SingleRow label="Max Capacity / Month" field="maxCapacityPerMonth" />
          </SectionTable>

          <SectionTable title="Reimbursement" onReset={() => {
            const d = DEFAULT_ASSUMPTIONS
            updateAssumption('medicareRate', d.medicareRate)
            updateAssumption('commercialMultiplier', d.commercialMultiplier)
            updateAssumption('medicareMix', d.medicareMix)
            updateAssumption('commercialMix', d.commercialMix)
          }}>
            <ScenarioRow label="Medicare Rate ($)" field="medicareRate" prefix="$" />
            <ScenarioRow label="Commercial Multiplier" field="commercialMultiplier" />
            <SingleRow label="Medicare Mix" field="medicareMix" isPercent />
            <SingleRow label="Commercial Mix" field="commercialMix" isPercent />
            <SingleRow label="Management Fee Rate" field="managementFeeRate" isPercent />
          </SectionTable>

          <SectionTable title="Supply Costs" onReset={() => {
            const d = DEFAULT_ASSUMPTIONS
            updateAssumption('venasealUnitCost', d.venasealUnitCost)
            updateAssumption('rfSupplyCost', d.rfSupplyCost)
            updateAssumption('scleroSupplyCost', d.scleroSupplyCost)
            updateAssumption('wasteFactor', d.wasteFactor)
            updateAssumption('miscConsumables', d.miscConsumables)
            updateAssumption('postProcSupport', d.postProcSupport)
            updateAssumption('venasealPtsPerKit', d.venasealPtsPerKit)
            updateAssumption('vsMix', d.vsMix)
            updateAssumption('rfMix', d.rfMix)
            updateAssumption('scleroMix', d.scleroMix)
          }}>
            <SingleRow label="VenaSeal Unit Cost ($)" field="venasealUnitCost" prefix="$" />
            <SingleRow label="RF Supply Cost ($)" field="rfSupplyCost" prefix="$" />
            <SingleRow label="Sclero Supply Cost ($)" field="scleroSupplyCost" prefix="$" />
            <SingleRow label="Waste Factor" field="wasteFactor" isPercent />
            <SingleRow label="Misc Consumables ($)" field="miscConsumables" prefix="$" />
            <SingleRow label="Post-Proc Support ($)" field="postProcSupport" prefix="$" />
            <SingleRow label="VenaSeal Pts/Kit" field="venasealPtsPerKit" />
            <SingleRow label="VS Mix" field="vsMix" isPercent />
            <SingleRow label="RF Mix" field="rfMix" isPercent />
            <SingleRow label="Sclero Mix" field="scleroMix" isPercent />
          </SectionTable>

          <SectionTable title="Personnel & Fixed Costs" onReset={() => {
            const d = DEFAULT_ASSUMPTIONS
            updateAssumption('physicianSalary', d.physicianSalary)
            updateAssumption('rvtSalary', d.rvtSalary)
            updateAssumption('maSalary', d.maSalary)
            updateAssumption('frontOfficeSalary', d.frontOfficeSalary)
            updateAssumption('payrollTaxRate', d.payrollTaxRate)
            updateAssumption('benefitsRate', d.benefitsRate)
            updateAssumption('rent', d.rent)
            updateAssumption('malpractice', d.malpractice)
            updateAssumption('emr', d.emr)
            updateAssumption('billing', d.billing)
          }}>
            <SingleRow label="Physician Salary Y1 ($)" field="physicianSalary" prefix="$" />
            <SingleRow label="RVT Salary ($)" field="rvtSalary" prefix="$" />
            <SingleRow label="MA Salary ($)" field="maSalary" prefix="$" />
            <SingleRow label="Front Office ($)" field="frontOfficeSalary" prefix="$" />
            <SingleRow label="Payroll Tax Rate" field="payrollTaxRate" isPercent />
            <SingleRow label="Benefits Rate" field="benefitsRate" isPercent />
            <SingleRow label="Rent (monthly)" field="rent" prefix="$" />
            <SingleRow label="Malpractice (monthly)" field="malpractice" prefix="$" />
            <SingleRow label="EMR (monthly)" field="emr" prefix="$" />
            <SingleRow label="Billing (base monthly)" field="billing" prefix="$" />
          </SectionTable>

          <SectionTable title="Volume Growth" onReset={() => {
            const d = DEFAULT_ASSUMPTIONS
            updateAssumption('y2VolumeGrowth', d.y2VolumeGrowth)
            updateAssumption('y3VolumeGrowth', d.y3VolumeGrowth)
          }}>
            <ScenarioRow label="Y2 Volume Growth" field="y2VolumeGrowth" isPercent />
            <ScenarioRow label="Y3 Volume Growth" field="y3VolumeGrowth" isPercent />
          </SectionTable>
        </div>
      </div>
    </div>
  )
}
