'use client'

import { useMemo, useState } from 'react'
import { useModelStore } from '@/lib/store'
import { calcKeyMetrics, calcVarithenaBlendedRate, normalizeWeights, normalizePayerMix, validateFinancialModel } from '@/lib/model'
import { fmtCurrency, fmtDecimal, fmtPct } from '@/lib/formatters'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { DEFAULT_ASSUMPTIONS } from '@/lib/defaults'
import type { Assumptions, PayerWeights, ProcedurePayerRates } from '@/lib/types'
import { MARKET_PAYER_MIX } from '@/lib/defaults'
import { TooltipInfo } from '@/components/ui/TooltipInfo'
import { getCitationById } from '@/lib/citations'

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
  tooltip,
}: {
  label: React.ReactNode
  field: keyof Assumptions
  isPercent?: boolean
  prefix?: string
  tooltip?: { text: string; href: string }
}) {
  const { assumptions, updateAssumption } = useModelStore()
  const val = assumptions[field] as { conservative: number; base: number; aggressive: number }

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/20">
      <td className="px-4 py-2.5 text-sm text-gray-300">{label}{tooltip && <TooltipInfo text={tooltip.text} href={tooltip.href} />}</td>
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
        <h3 className="text-sm font-semibold text-[#5faaa6]">{title}</h3>
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

const PAYER_KEYS: (keyof PayerWeights)[] = ['aetna', 'bcbs', 'humana', 'uhc', 'medicare']
const PAYER_LABELS: Record<keyof PayerWeights, string> = { aetna: 'Aetna', bcbs: 'BCBS', humana: 'Humana', uhc: 'UHC', medicare: 'Medicare' }

function PayerMixSection() {
  const { assumptions, updateAssumption } = useModelStore()
  const mix = assumptions.payerMix
  const normalized = normalizePayerMix(mix)
  const sum = mix.aetna + mix.bcbs + mix.humana + mix.uhc + mix.medicare

  const handlePayerChange = (field: keyof PayerWeights, raw: number) => {
    const updated = { ...mix, [field]: Math.max(0, raw) }
    updateAssumption('payerMix', normalizeWeights(updated))
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#5faaa6]">Payer Mix</h3>
        <button
          onClick={() => updateAssumption('payerMix', DEFAULT_ASSUMPTIONS.payerMix)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >Reset</button>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/50">
            <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Payer</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">Weight</th>
            <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">Effective</th>
          </tr>
        </thead>
        <tbody>
          {PAYER_KEYS.map((pk) => (
            <tr key={pk} className="border-b border-gray-800 hover:bg-gray-800/20">
              <td className="px-4 py-2.5 text-sm text-gray-300">{PAYER_LABELS[pk]}</td>
              <td className="px-4 py-2.5 text-right">
                <NumberInput
                  value={mix[pk]}
                  isPercent
                  onChange={(v) => handlePayerChange(pk, v)}
                />
              </td>
              <td className="px-4 py-2.5 text-right text-xs text-gray-500">{fmtPct(normalized[pk])}</td>
            </tr>
          ))}
          <tr className="bg-gray-800/30">
            <td className="px-4 py-2.5 text-sm font-semibold text-gray-200">Payer total</td>
            <td className="px-4 py-2.5 text-right text-sm font-semibold text-gray-200">{(sum * 100).toFixed(1)}%</td>
            <td className="px-4 py-2.5 text-right text-xs text-gray-500">100.0%</td>
          </tr>
        </tbody>
      </table>
      <div className="px-4 py-2 border-t border-gray-800">
        <span className="text-xs text-gray-500 italic">Source: CuraVein Referral Tracker</span>
      </div>
    </div>
  )
}

function VarithenaRatesSection() {
  const { assumptions, updateAssumption } = useModelStore()

  function updateRate(cpt: 'varithenaRates36465' | 'varithenaRates36466', payer: keyof ProcedurePayerRates, v: number) {
    updateAssumption(cpt, { ...assumptions[cpt], [payer]: v })
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#5faaa6]">Varithena Rates by Payer</h3>
        <button
          onClick={() => {
            updateAssumption('varithenaRates36465', DEFAULT_ASSUMPTIONS.varithenaRates36465)
            updateAssumption('varithenaRates36466', DEFAULT_ASSUMPTIONS.varithenaRates36466)
          }}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >Reset</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50">
              <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">CPT</th>
              {PAYER_KEYS.map((pk) => (
                <th key={pk} className="text-right px-4 py-2 text-xs text-gray-500 font-medium">{PAYER_LABELS[pk]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['varithenaRates36465', 'varithenaRates36466'] as const).map((cpt) => (
              <tr key={cpt} className="border-b border-gray-800 hover:bg-gray-800/20">
                <td className="px-4 py-2.5 text-sm text-gray-300">{cpt === 'varithenaRates36465' ? '36465' : '36466'}</td>
                {PAYER_KEYS.map((pk) => (
                  <td key={pk} className="px-4 py-2.5 text-right">
                    <NumberInput
                      value={assumptions[cpt][pk]}
                      prefix="$"
                      onChange={(v) => updateRate(cpt, pk, v)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ScenarioPage() {
  const { assumptions, updateAssumption, resetToDefaults } = useModelStore()
  const metrics = useMemo(() => calcKeyMetrics(assumptions), [assumptions])

  const mixSum = assumptions.vsMix + assumptions.rfMix + assumptions.scleroMix + assumptions.varithenaShare

  const handleMixChange = (field: 'vsMix' | 'rfMix' | 'scleroMix' | 'varithenaShare', raw: number) => {
    const updated = {
      vsMix: assumptions.vsMix,
      rfMix: assumptions.rfMix,
      scleroMix: assumptions.scleroMix,
      varithenaShare: assumptions.varithenaShare,
      [field]: Math.max(0, raw),
    }
    const norm = normalizeWeights(updated)
    updateAssumption('vsMix', norm.vsMix)
    updateAssumption('rfMix', norm.rfMix)
    updateAssumption('scleroMix', norm.scleroMix)
    updateAssumption('varithenaShare', norm.varithenaShare)
  }

  useMemo(() => {
    const y1 = metrics
    validateFinancialModel({
      procedureMix: { vsMix: assumptions.vsMix, rfMix: assumptions.rfMix, scleroMix: assumptions.scleroMix, varithenaShare: assumptions.varithenaShare },
      payerMix: assumptions.payerMix,
      varithenaBlendedRate: calcVarithenaBlendedRate(assumptions),
      totalRevenue: y1.y1TotalRevenue,
      totalCOGS: y1.y1TotalRevenue - y1.y1Ebitda - 706000,
      ebitda: y1.y1Ebitda,
      breakevenProcedures: y1.breakevenProcs,
    })
  }, [assumptions, metrics])

  return (
    <div>
      <TopBar title="Scenario Controls" />
      <div className="p-6 space-y-6">

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard label="Avg Monthly Procedures" value={fmtDecimal(metrics.avgMonthlyProcs, 1)} sub="Live preview" />
          <KpiCard label={<>Revenue / Procedure <TooltipInfo text={getCitationById('revenuePerProcedure')?.rationale ?? ''} href="/citations?highlight=revenuePerProcedure" /></>} value={fmtCurrency(metrics.revenuePerProc, false)} />
          <KpiCard label={<>COGS / Procedure <TooltipInfo text={getCitationById('cogsPerProcedure')?.rationale ?? ''} href="/citations?highlight=cogsPerProcedure" /></>} value={fmtCurrency(metrics.cogsPerProc, false)} />
          <KpiCard label="Stabilized EBITDA" value={fmtCurrency(metrics.stabilizedMonthlyEbitda)} highlight={metrics.stabilizedMonthlyEbitda > 0} />
          <KpiCard label="Y1 Total Revenue" value={fmtCurrency(metrics.y1TotalRevenue)} />
          <KpiCard label="Breakeven Month" value={metrics.breakevenMonth ? `Month ${metrics.breakevenMonth}` : 'N/A'} />
        </div>

        <div className="flex flex-wrap items-center gap-4 justify-between">
          {/* FIX 1 — Market Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Market:</span>
            {(['newBraunfels', 'forney'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  updateAssumption('market', m)
                  const mix = MARKET_PAYER_MIX[m]
                  updateAssumption('medicareMix', mix.government)
                  updateAssumption('commercialMix', mix.commercial)
                }}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  assumptions.market === m ? 'bg-[#5faaa6] text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {m === 'newBraunfels' ? 'New Braunfels' : 'Forney'}
              </button>
            ))}
          </div>

          {/* FIX 7 — Varithena Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Varithena Adoption:</span>
            <button
              onClick={() => updateAssumption('varithenaEnabled', !assumptions.varithenaEnabled)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                assumptions.varithenaEnabled ? 'bg-[#5faaa6] text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {assumptions.varithenaEnabled ? 'On' : 'Off'}
            </button>
          </div>

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
            <ScenarioRow label={<>Cost Per Lead ($) <TooltipInfo text={getCitationById('cpl')?.rationale ?? ''} href="/citations?highlight=cpl" /></>} field="cpl" prefix="$" />
            <ScenarioRow label="Contact Rate" field="contactRate" isPercent tooltip={{ text: 'Phone leads convert 25\u201340%; <5 min response increases conversion 21\u00d7', href: 'https://www.invoca.com/reports/the-invoca-call-conversion-benchmarks-report-for-the-healthcare-industry-2025' }} />
            <ScenarioRow label="Booking Rate" field="bookingRate" isPercent tooltip={{ text: '~54% booking rate from contacted leads', href: 'https://www.venatorpm.com/vein-and-vascular-marketing' }} />
            <ScenarioRow label="Show Rate" field="showRate" isPercent tooltip={{ text: 'Healthcare no-show ~18\u201325%', href: 'https://finturf.com/blog/reduce-patient-no-shows/' }} />
            <ScenarioRow label="Treatment Conversion" field="treatmentConversion" isPercent tooltip={{ text: 'Elective consult-to-treatment ~41\u201360%', href: 'https://www.sciencedirect.com/science/article/pii/S1529943024001128' }} />
            <ScenarioRow label="Procedures / Patient" field="procsPerPatient" tooltip={{ text: '2\u20134 CPT codes per patient typical', href: 'https://pubmed.ncbi.nlm.nih.gov/10396491/' }} />
            <SingleRow label="Max Capacity / Month" field="maxCapacityPerMonth" />
          </SectionTable>

          <SectionTable title="Reimbursement" onReset={() => {
            const d = DEFAULT_ASSUMPTIONS
            updateAssumption('medicareRate', d.medicareRate)
            updateAssumption('commercialMultiplier', d.commercialMultiplier)
            updateAssumption('medicareMix', d.medicareMix)
            updateAssumption('commercialMix', d.commercialMix)
          }}>
            <ScenarioRow label={<>Medicare Rate ($) <a href="https://www.cms.gov/medicare/payment/fee-schedules" target="_blank" rel="noopener noreferrer" className="text-[#5faaa6] hover:text-[#7cc4c0] text-[10px] ml-0.5">&#8599;</a></>} field="medicareRate" prefix="$" />
            <ScenarioRow label="Commercial Multiplier (legacy)" field="commercialMultiplier" />
            <SingleRow label="BCBS Multiplier" field="bcbsMultiplier" />
            <SingleRow label="Other Commercial Multiplier" field="otherCommercialMultiplier" />
            <SingleRow label="BCBS Share of Commercial" field="bcbsShareOfCommercial" isPercent />
            <SingleRow label="Medicare/Gov Mix" field="medicareMix" isPercent />
            <SingleRow label="Commercial Mix" field="commercialMix" isPercent />
            <SingleRow label="Management Fee Rate" field="managementFeeRate" isPercent />
            <tr><td colSpan={4} className="px-4 py-2 text-xs text-gray-500 italic">Credentialing ramp applied: full commercial access Month 7+</td></tr>
          </SectionTable>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#5faaa6]">Procedure Mix & Supply Costs</h3>
              <button onClick={() => {
                const d = DEFAULT_ASSUMPTIONS
                updateAssumption('vsMix', d.vsMix)
                updateAssumption('rfMix', d.rfMix)
                updateAssumption('scleroMix', d.scleroMix)
                updateAssumption('varithenaShare', d.varithenaShare)
                updateAssumption('venasealUnitCost', d.venasealUnitCost)
                updateAssumption('rfSupplyCost', d.rfSupplyCost)
                updateAssumption('scleroSupplyCost', d.scleroSupplyCost)
                updateAssumption('wasteFactor', d.wasteFactor)
                updateAssumption('miscConsumables', d.miscConsumables)
                updateAssumption('postProcSupport', d.postProcSupport)
                updateAssumption('venasealPtsPerKit', d.venasealPtsPerKit)
                updateAssumption('varithenaDrugCost', d.varithenaDrugCost)
              }} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Reset</button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Parameter</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium" colSpan={3}>Value</th>
                </tr>
              </thead>
              <tbody>
                {([
                  { label: 'VS Mix', field: 'vsMix' as const },
                  { label: 'RF Mix', field: 'rfMix' as const },
                  { label: 'Sclero Mix', field: 'scleroMix' as const },
                  { label: 'Varithena (36465/36466)', field: 'varithenaShare' as const },
                ] as const).map(({ label, field }) => (
                  <tr key={field} className="border-b border-gray-800 hover:bg-gray-800/20">
                    <td className="px-4 py-2.5 text-sm text-gray-300">{label}</td>
                    <td className="px-4 py-2.5 text-right" colSpan={3}>
                      <NumberInput
                        value={assumptions[field]}
                        isPercent
                        onChange={(v) => handleMixChange(field, v)}
                      />
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-800/30">
                  <td className="px-4 py-2.5 text-sm font-semibold text-gray-200">Mix total</td>
                  <td className="px-4 py-2.5 text-right text-sm font-semibold text-gray-200" colSpan={3}>{(mixSum * 100).toFixed(1)}%</td>
                </tr>
                <tr><td colSpan={4} className="h-2" /></tr>
                <SingleRow label="VenaSeal Unit Cost ($)" field="venasealUnitCost" prefix="$" />
                <SingleRow label="RF Supply Cost ($)" field="rfSupplyCost" prefix="$" />
                <SingleRow label="Sclero Supply Cost ($)" field="scleroSupplyCost" prefix="$" />
                <SingleRow label="Drug cost/procedure ($)" field="varithenaDrugCost" prefix="$" />
                <SingleRow label="Waste Factor" field="wasteFactor" isPercent />
                <SingleRow label="Misc Consumables ($)" field="miscConsumables" prefix="$" />
                <SingleRow label="Post-Proc Support ($)" field="postProcSupport" prefix="$" />
                <SingleRow label="VenaSeal Pts/Kit" field="venasealPtsPerKit" />
              </tbody>
            </table>
          </div>

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
            <ScenarioRow label={<>Y2 Volume Growth <TooltipInfo text={getCitationById('y2GrowthRate')?.rationale ?? ''} href="/citations?highlight=y2GrowthRate" /></>} field="y2VolumeGrowth" isPercent />
            <ScenarioRow label={<>Y3 Volume Growth <TooltipInfo text={getCitationById('y3GrowthRate')?.rationale ?? ''} href="/citations?highlight=y3GrowthRate" /></>} field="y3VolumeGrowth" isPercent />
          </SectionTable>

          <PayerMixSection />
          <VarithenaRatesSection />
        </div>
      </div>
    </div>
  )
}
