# Sync CuraVein App to Spreadsheet v10

Update the CuraVein Next.js/Zustand app so every financial assumption, funnel parameter, and
scenario value matches `CuraVein_Integrated_v10.xlsx` exactly.

---

## Context

The spreadsheet has two live scenarios:
- **Scenario 1 — Downside** (conservative floor; 120 procs/mo cap)
- **Scenario 2 — Conservative/Base** (primary pitch scenario; 140 procs/mo cap) ← default active

A third "Aggressive" column exists in the sheet but is not used in the app yet; include its
data in the constants but don't expose it in the UI unless already present.

---

## Step 1 — Locate existing scenario / financial constants

Search for the current scenario store and constants files:

```bash
grep -rl "scenario\|blendedRate\|CPL\|funnelRates" src --include="*.ts" --include="*.tsx" | head -20
grep -rl "SCENARIOS\|scenarioData\|downside\|conservative" src --include="*.ts" | head -10
```

Identify:
- The Zustand store file (likely `src/store/` or `src/lib/`)
- Any `constants.ts` / `scenarios.ts` / `modelData.ts` file
- The component(s) that render KPI cards, revenue charts, or the 3-year P&L table

---

## Step 2 — Replace scenario constants with v10 values

Find and **fully replace** the scenario data object (whatever it is currently named) with the
following. Create `src/lib/scenarioData.ts` if it doesn't exist.

```typescript
// ─────────────────────────────────────────────────────────────────────────────
// CuraVein Scenario Data — source of truth: CuraVein_Integrated_v10.xlsx
// Last synced: 2026-04-12
// ─────────────────────────────────────────────────────────────────────────────

export type ScenarioKey = 'downside' | 'conservative';

export interface MonthlyFunnel {
  month: string;           // e.g. "Oct '25"
  marketingSpend: number;  // $
  cpl: number;             // $ cost per lead
  contactRate: number;     // 0–1
  bookingRate: number;     // 0–1
  showRate: number;        // 0–1
  treatmentConv: number;   // 0–1
  commercialPct: number;   // 0–1  (credentialing ramp — affects blended rate)
}

export interface ScenarioConfig {
  label: string;
  // Mature / summary funnel rates (used in sensitivity tables)
  matureCpl: number;
  matureContactRate: number;
  matureBookingRate: number;
  matureShowRate: number;
  matureTreatmentConv: number;
  procsPerPatient: number;
  maxCapacityPerMonth: number;
  // Multi-year growth
  y2ProcGrowthRate: number;
  y3ProcGrowthRate: number;
  y2MarketingAnnual: number;
  y3MarketingAnnual: number;
  y2PhysicianSalary: number;
  y3PhysicianSalary: number;
  // 12-month funnel ramp
  monthlyFunnel: MonthlyFunnel[];
}

// ── REIMBURSEMENT (shared across scenarios) ──────────────────────────────────
export const REIMBURSEMENT = {
  medicareBase: 1147,          // CPT-weighted Medicare base rate (CMS PFS 2024)
  commercialMultiplier: 2.55,  // TX payer-weighted: UHC/Aetna/BCBS (RFA 2.56×, VenaSeal 2.06×, Varithena 1.50×)
  matureMedicarePct: 0.15,     // 15% Medicare/Tricare at stable operations
  matureCommercialPct: 0.85,   // 85% commercial at stable operations
  matureBlendedRate: 2658,     // = 1147 × (0.15 + 0.85 × 2.55)
  mgmtFeeRate: 0.08,           // 8% MSO management fee
  procsPerPatient: 2.9,        // Average procedures per treated patient
} as const;

// ── COGS (shared) ────────────────────────────────────────────────────────────
export const COGS_PER_PROC = {
  venaSealMixPct: 0.65,   costPerProc: 400,   // negotiated vendor pricing
  rfAblationMixPct: 0.10, rfCostPerProc: 200,
  scleroMixPct: 0.25,     scleroCostPerProc: 65,
  varithenaMixPct: 0.15,  varithenaCostPerProc: /* derived from sheet */ 40,
  postProcedureSupport: 17.49,  // $/proc blended post-procedure support
} as const;

// ── SCENARIO 1 — DOWNSIDE ────────────────────────────────────────────────────
const DOWNSIDE: ScenarioConfig = {
  label: 'Downside',
  matureCpl: 50,
  matureContactRate: 0.35,
  matureBookingRate: 0.54,
  matureShowRate: 0.75,
  matureTreatmentConv: 0.65,
  procsPerPatient: 2.9,
  maxCapacityPerMonth: 120,
  y2ProcGrowthRate: 0.464,   // 46.4% → Y2 = 1,119 procs
  y3ProcGrowthRate: 0.749,   // 74.9% → Y3 = 1,440 procs (cap)
  y2MarketingAnnual: 180_000,
  y3MarketingAnnual: 150_000,
  y2PhysicianSalary: 200_000,
  y3PhysicianSalary: 300_000,
  monthlyFunnel: [
    { month: "Oct '25", marketingSpend: 5200,  cpl: 65, contactRate: 0.280, bookingRate: 0.450, showRate: 0.65, treatmentConv: 0.50, commercialPct: 0.85 },
    { month: "Nov '25", marketingSpend: 6000,  cpl: 62, contactRate: 0.289, bookingRate: 0.459, showRate: 0.66, treatmentConv: 0.52, commercialPct: 0.85 },
    { month: "Dec '25", marketingSpend: 8000,  cpl: 60, contactRate: 0.299, bookingRate: 0.468, showRate: 0.68, treatmentConv: 0.55, commercialPct: 0.85 },
    { month: "Jan '26", marketingSpend: 10000, cpl: 58, contactRate: 0.308, bookingRate: 0.486, showRate: 0.69, treatmentConv: 0.57, commercialPct: 0.85 },
    { month: "Feb '26", marketingSpend: 12000, cpl: 56, contactRate: 0.317, bookingRate: 0.504, showRate: 0.71, treatmentConv: 0.59, commercialPct: 0.85 },
    { month: "Mar '26", marketingSpend: 13500, cpl: 54, contactRate: 0.327, bookingRate: 0.513, showRate: 0.72, treatmentConv: 0.61, commercialPct: 0.85 },
    { month: "Apr '26", marketingSpend: 14000, cpl: 52, contactRate: 0.336, bookingRate: 0.522, showRate: 0.73, treatmentConv: 0.62, commercialPct: 0.85 },
    { month: "May '26", marketingSpend: 14500, cpl: 51, contactRate: 0.341, bookingRate: 0.531, showRate: 0.74, treatmentConv: 0.63, commercialPct: 0.85 },
    { month: "Jun '26", marketingSpend: 15000, cpl: 51, contactRate: 0.345, bookingRate: 0.540, showRate: 0.75, treatmentConv: 0.64, commercialPct: 0.85 },
    { month: "Jul '26", marketingSpend: 15000, cpl: 50, contactRate: 0.350, bookingRate: 0.540, showRate: 0.75, treatmentConv: 0.65, commercialPct: 0.85 },
    { month: "Aug '26", marketingSpend: 15000, cpl: 50, contactRate: 0.350, bookingRate: 0.540, showRate: 0.75, treatmentConv: 0.65, commercialPct: 0.85 },
    { month: "Sep '26", marketingSpend: 15000, cpl: 50, contactRate: 0.350, bookingRate: 0.540, showRate: 0.75, treatmentConv: 0.65, commercialPct: 0.85 },
  ],
};

// ── SCENARIO 2 — CONSERVATIVE / BASE (default active) ────────────────────────
const CONSERVATIVE: ScenarioConfig = {
  label: 'Conservative / Base',
  matureCpl: 51,
  matureContactRate: 0.40,
  matureBookingRate: 0.60,
  matureShowRate: 0.78,
  matureTreatmentConv: 0.65,
  procsPerPatient: 2.9,
  maxCapacityPerMonth: 140,
  y2ProcGrowthRate: 0.50,    // 50%  → Y2 = 1,149 procs
  y3ProcGrowthRate: 0.32,    // 32%  → Y3 = 1,517 procs (below 1,680 cap)
  y2MarketingAnnual: 180_000,
  y3MarketingAnnual: 150_000,
  y2PhysicianSalary: 200_000,
  y3PhysicianSalary: 300_000,
  // Credentialing ramp: commercialPct ramps 40% → 85% as payers credential (M1–M5)
  // blendedRate = 1147 × (commercialPct × 2.55 + (1−commercialPct) × 1.0)
  monthlyFunnel: [
    { month: "Oct '25", marketingSpend: 3500,  cpl: 66, contactRate: 0.30, bookingRate: 0.55, showRate: 0.75, treatmentConv: 0.60, commercialPct: 0.40 },
    { month: "Nov '25", marketingSpend: 4000,  cpl: 64, contactRate: 0.31, bookingRate: 0.55, showRate: 0.75, treatmentConv: 0.61, commercialPct: 0.53 },
    { month: "Dec '25", marketingSpend: 4500,  cpl: 62, contactRate: 0.32, bookingRate: 0.56, showRate: 0.76, treatmentConv: 0.62, commercialPct: 0.67 },
    { month: "Jan '26", marketingSpend: 5500,  cpl: 60, contactRate: 0.34, bookingRate: 0.57, showRate: 0.76, treatmentConv: 0.63, commercialPct: 0.80 },
    { month: "Feb '26", marketingSpend: 7000,  cpl: 58, contactRate: 0.36, bookingRate: 0.58, showRate: 0.77, treatmentConv: 0.63, commercialPct: 0.85 },
    { month: "Mar '26", marketingSpend: 8500,  cpl: 56, contactRate: 0.38, bookingRate: 0.58, showRate: 0.77, treatmentConv: 0.64, commercialPct: 0.85 },
    { month: "Apr '26", marketingSpend: 10000, cpl: 54, contactRate: 0.39, bookingRate: 0.59, showRate: 0.78, treatmentConv: 0.64, commercialPct: 0.85 },
    { month: "May '26", marketingSpend: 12000, cpl: 52, contactRate: 0.40, bookingRate: 0.60, showRate: 0.78, treatmentConv: 0.65, commercialPct: 0.85 },
    { month: "Jun '26", marketingSpend: 14000, cpl: 52, contactRate: 0.40, bookingRate: 0.60, showRate: 0.78, treatmentConv: 0.65, commercialPct: 0.85 },
    { month: "Jul '26", marketingSpend: 16000, cpl: 51, contactRate: 0.40, bookingRate: 0.60, showRate: 0.78, treatmentConv: 0.65, commercialPct: 0.85 },
    { month: "Aug '26", marketingSpend: 18000, cpl: 51, contactRate: 0.40, bookingRate: 0.60, showRate: 0.78, treatmentConv: 0.65, commercialPct: 0.85 },
    { month: "Sep '26", marketingSpend: 20000, cpl: 51, contactRate: 0.40, bookingRate: 0.60, showRate: 0.78, treatmentConv: 0.65, commercialPct: 0.85 },
  ],
};

export const SCENARIOS: Record<ScenarioKey, ScenarioConfig> = {
  downside: DOWNSIDE,
  conservative: CONSERVATIVE,
};

export const DEFAULT_SCENARIO: ScenarioKey = 'conservative';
```

---

## Step 3 — Update / create core calculation functions

Create or update `src/lib/calculations.ts`:

```typescript
import { ScenarioConfig, REIMBURSEMENT } from './scenarioData';

/** Blended reimbursement rate for a given commercial payer mix % */
export function calcBlendedRate(commercialPct: number): number {
  const medicarePct = 1 - commercialPct;
  return Math.round(
    REIMBURSEMENT.medicareBase *
    (medicarePct * 1.0 + commercialPct * REIMBURSEMENT.commercialMultiplier)
  );
}

export interface MonthResult {
  month: string;
  marketingSpend: number;
  leads: number;
  contacts: number;
  booked: number;
  shows: number;
  treatedPatients: number;
  rawProcs: number;
  totalProcs: number;           // capacity-capped
  utilizationPct: number;
  blendedRate: number;
  grossRevenue: number;
  medicareRevenue: number;
  commercialRevenue: number;
}

/** Run the 12-month Y1 funnel for a scenario */
export function runFunnelYear1(scenario: ScenarioConfig): MonthResult[] {
  return scenario.monthlyFunnel.map((m) => {
    const blendedRate = calcBlendedRate(m.commercialPct);
    const leads       = Math.floor(m.marketingSpend / m.cpl);
    const contacts    = Math.floor(leads * m.contactRate);
    const booked      = Math.floor(contacts * m.bookingRate);
    const shows       = Math.floor(booked * m.showRate);
    const treated     = Math.floor(shows * m.treatmentConv);
    const rawProcs    = Math.round(treated * scenario.procsPerPatient);
    const totalProcs  = Math.min(rawProcs, scenario.maxCapacityPerMonth);
    const grossRevenue    = totalProcs * blendedRate;
    const medicareRevenue = Math.round(grossRevenue * (1 - m.commercialPct));
    const commercialRevenue = Math.round(grossRevenue * m.commercialPct);
    return {
      month: m.month,
      marketingSpend: m.marketingSpend,
      leads, contacts, booked, shows,
      treatedPatients: treated,
      rawProcs, totalProcs,
      utilizationPct: totalProcs / scenario.maxCapacityPerMonth,
      blendedRate,
      grossRevenue,
      medicareRevenue,
      commercialRevenue,
    };
  });
}

export interface YearSummary {
  annualProcs: number;
  blendedRate: number;
  grossRevenue: number;
  mgmtFee: number;
  netRevenue: number;
}

/** Compute Y1/Y2/Y3 summaries from a scenario */
export function calcMultiYearRevenue(
  scenario: ScenarioConfig,
  y1Months: MonthResult[]
): { y1: YearSummary; y2: YearSummary; y3: YearSummary } {
  const matureRate = REIMBURSEMENT.matureBlendedRate;
  const cap        = scenario.maxCapacityPerMonth * 12;

  const y1Procs = y1Months.reduce((s, m) => s + m.totalProcs, 0);
  const y1Rev   = y1Months.reduce((s, m) => s + m.grossRevenue, 0);

  const y2Procs   = Math.min(Math.round(y1Procs * (1 + scenario.y2ProcGrowthRate)), cap);
  const y2Rev     = y2Procs * matureRate;

  const y3Procs   = Math.min(Math.round(y2Procs * (1 + scenario.y3ProcGrowthRate)), cap);
  const y3Rev     = y3Procs * matureRate;

  const toSummary = (procs: number, rev: number): YearSummary => ({
    annualProcs: procs,
    blendedRate: matureRate,
    grossRevenue: rev,
    mgmtFee: -Math.round(rev * REIMBURSEMENT.mgmtFeeRate),
    netRevenue: Math.round(rev * (1 - REIMBURSEMENT.mgmtFeeRate)),
  });

  return {
    y1: { ...toSummary(y1Procs, y1Rev), blendedRate: Math.round(y1Rev / y1Procs) },
    y2: toSummary(y2Procs, y2Rev),
    y3: toSummary(y3Procs, y3Rev),
  };
}
```

---

## Step 4 — Update Zustand scenario store

Find the existing Zustand store (`useStore`, `useScenarioStore`, or similar). Update it to:

```typescript
import { create } from 'zustand';
import { ScenarioKey, SCENARIOS, DEFAULT_SCENARIO } from '@/lib/scenarioData';
import { runFunnelYear1, calcMultiYearRevenue } from '@/lib/calculations';

interface ScenarioState {
  activeScenario: ScenarioKey;
  setScenario: (key: ScenarioKey) => void;
}

export const useScenarioStore = create<ScenarioState>((set) => ({
  activeScenario: DEFAULT_SCENARIO,
  setScenario: (key) => set({ activeScenario: key }),
}));

/** Selector — use this in components instead of computing inline */
export function useScenarioResults() {
  const { activeScenario } = useScenarioStore();
  const scenario = SCENARIOS[activeScenario];
  const y1Months = runFunnelYear1(scenario);
  return { scenario, y1Months, ...calcMultiYearRevenue(scenario, y1Months) };
}
```

---

## Step 5 — Update scenario selector UI

Find the existing scenario toggle / dropdown component. Update it so:
- Options are exactly: `"Downside"` and `"Conservative / Base"`
- Default selected: `"Conservative / Base"`
- On change: calls `useScenarioStore.getState().setScenario(key)`

If no selector exists, create `src/components/ScenarioSelector.tsx`:

```tsx
'use client';
import { useScenarioStore } from '@/store/scenarioStore';
import { SCENARIOS, ScenarioKey } from '@/lib/scenarioData';

export function ScenarioSelector() {
  const { activeScenario, setScenario } = useScenarioStore();
  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm font-medium text-gray-600">Scenario:</span>
      {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => (
        <button
          key={key}
          onClick={() => setScenario(key)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeScenario === key
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {SCENARIOS[key].label}
        </button>
      ))}
    </div>
  );
}
```

---

## Step 6 — Update KPI / summary cards

Find components that display revenue KPIs. Replace hardcoded values with `useScenarioResults()`:

```tsx
'use client';
import { useScenarioResults } from '@/store/scenarioStore';

export function RevenueSummaryCards() {
  const { y1, y2, y3, scenario } = useScenarioResults();

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)}M`
      : `$${(n / 1_000).toFixed(0)}K`;

  return (
    <div className="grid grid-cols-3 gap-4">
      <KpiCard label="Y1 Gross Revenue" value={fmt(y1.grossRevenue)}
               sub={`${y1.annualProcs} procedures`} />
      <KpiCard label="Y2 Gross Revenue" value={fmt(y2.grossRevenue)}
               sub={`${y2.annualProcs} procedures`} />
      <KpiCard label="Y3 Gross Revenue" value={fmt(y3.grossRevenue)}
               sub={`${y3.annualProcs} procedures · ${scenario.maxCapacityPerMonth}/mo cap`} />
    </div>
  );
}
```

Expected outputs (Conservative / Base active):
| | Y1 | Y2 | Y3 |
|---|---|---|---|
| Annual Procs | 766 | 1,149 | 1,517 |
| Blended Rate | $2,658 | $2,658 | $2,658 |
| Gross Revenue | **$2,010,140** | **$3,054,042** | **$4,032,186** |
| Mgmt Fee (8%) | ($160,811) | ($244,323) | ($322,575) |
| Net Revenue | $1,849,329 | $2,809,719 | $3,709,611 |

Expected outputs (Downside active):
| | Y1 | Y2 | Y3 |
|---|---|---|---|
| Annual Procs | ~596 | ~872 | ~1,440 |
| Gross Revenue | **~$1.64M** | **~$2.32M** | **~$3.83M** |

---

## Step 7 — Update the Y1 monthly chart / table

Find the monthly revenue or procedure chart component. Replace its data source with:

```tsx
import { useScenarioResults } from '@/store/scenarioStore';

export function MonthlyRevenueChart() {
  const { y1Months } = useScenarioResults();

  const chartData = y1Months.map((m) => ({
    month: m.month,
    revenue: m.grossRevenue,
    procs: m.totalProcs,
    medicare: m.medicareRevenue,
    commercial: m.commercialRevenue,
  }));
  // pass chartData to your existing chart component
}
```

Conservative / Base Y1 monthly gross revenue reference:
```
Oct '25: $14,727  |  Nov: $13,116  |  Dec: $13,359  |  Jan: $15,151
Feb '26: $19,536  |  Mar: $24,321  |  Apr: $32,295  |  May: $38,275
Jun '26: $43,857  |  Jul: $49,838  |  Aug: $54,223  |  Sep: varies
```

Conservative / Base Y1 monthly procedure counts:
```
Oct: 15 | Nov: 17 | Dec: 26 | Jan: 38 | Feb: 49 | Mar: 61
Apr: 81 | May: 96 | Jun: 110 | Jul: 125 | Aug: 136 | Sep: 140 (cap)
```

---

## Step 8 — Verify outputs in the browser

After all changes, run:

```bash
npm run dev
```

Then check in the browser:

1. **Scenario toggle** — switching shows different revenue figures
2. **Conservative/Base KPIs**: Y1=$2.01M, Y2=$3.05M, Y3=$4.03M ✓
3. **Downside KPIs**: Y1≈$1.64M, Y2≈$2.32M, Y3≈$3.83M ✓
4. **Blended rate** shows $2,658 for both (mature mix)
5. **Y1 monthly chart**: starts low (~$14K M1), reaches ~$54K by M11 (Conservative)
6. **Max capacity note**: 140/mo for Conservative, 120/mo for Downside

Run TypeScript check:
```bash
npx tsc --noEmit
```

Fix any type errors before finishing.

---

## Key numbers at a glance

| Parameter | Downside | Conservative/Base |
|---|---|---|
| Max procs/month | 120 | **140** |
| Mature CPL | $50 | $51 |
| Mature contact rate | 35% | 40% |
| Mature booking rate | 54% | 60% |
| Mature show rate | 75% | 78% |
| Mature treatment conv | 65% | 65% |
| Procs/patient | 2.9 | 2.9 |
| Y2 proc growth | 46.4% | 50.0% |
| Y3 proc growth | 74.9% | 32.0% |
| Medicare base | $1,147 | $1,147 |
| Commercial multiplier | 2.55× | 2.55× |
| Mature blended rate | $2,658 | $2,658 |
| Y1 Gross Revenue | ~$1.64M | **$2.01M** |
| Y2 Gross Revenue | ~$2.32M | **$3.05M** |
| Y3 Gross Revenue | ~$3.83M | **$4.03M** |

Credentialing ramp (Conservative/Base only — commercial % by month):
`40% → 53% → 67% → 80% → 85% → 85% → 85% → 85% → 85% → 85% → 85% → 85%`
