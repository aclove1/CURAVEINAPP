# Add: Medicare Rate View Toggle

## Goal
Add a toggle that switches all financial projections between two modes:
- **Blended** (default) — current payer mix: 85% commercial × 1.89 mult + 15% Medicare
- **Medicare Only** — every procedure reimbursed at pure CMS allowable rate ($949 weighted base)

This lets the user instantly see the floor scenario and understand how much revenue
comes from commercial premium vs. what Medicare alone would generate.

---

## Step 1 — Read these files first

```
lib/model.ts        — find calcBlendedRate, calcKeyMetrics, calcFunnelMonth
lib/store.ts        — find Zustand store shape and updateAssumption
lib/types.ts        — find Assumptions interface and RateMode if it exists
lib/defaults.ts     — find DEFAULT_ASSUMPTIONS
app/page.tsx        — find KPI cards and the Controls section header
```

---

## Step 2 — Add `rateViewMode` to the store

In `lib/store.ts`, add to the store state:

```typescript
rateViewMode: 'blended' | 'medicare'
```

Initial value: `'blended'`

Add a setter action:
```typescript
setRateViewMode: (mode: 'blended' | 'medicare') => set({ rateViewMode: mode }),
```

---

## Step 3 — Update `calcBlendedRate` in `lib/model.ts`

```typescript
export function calcBlendedRate(
  a: Assumptions,
  mode: 'blended' | 'medicare' = 'blended'
): number {
  const base = a.medicareBase  // weighted CMS base = $949
  if (mode === 'medicare') return Math.round(base)
  const mult = a.commMultiplier   // 1.89
  return Math.round(base * (a.medicareMix + a.commercialMix * mult))
}
```

---

## Step 4 — Thread `rateViewMode` through `calcKeyMetrics`

`calcKeyMetrics` is likely called in `app/page.tsx` or a hook. Add `rateViewMode` as a parameter:

```typescript
export function calcKeyMetrics(
  a: Assumptions,
  rateViewMode: 'blended' | 'medicare' = 'blended'
): KeyMetrics {
  // ... existing logic ...
  const revenuePerProc = calcBlendedRate(a, rateViewMode)
  // All revenue calculations should use this revenuePerProc
}
```

Inside `calcFunnelMonth` — if it computes monthly revenue, also accept and pass `rateViewMode`:
```typescript
const monthRate = calcBlendedRate(a, rateViewMode)
const grossRevenue = procs * monthRate
```

---

## Step 5 — Add the toggle UI in `app/page.tsx`

Add near the top of the page, below the scenario selector (Conservative / Base / Aggressive):

```tsx
{/* Rate View Toggle */}
<div className="flex items-center gap-2 mt-2">
  <span className="text-xs text-gray-400 uppercase tracking-wider">Rate View</span>
  <button
    onClick={() => setRateViewMode(rateViewMode === 'blended' ? 'medicare' : 'blended')}
    className={`
      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
      ${rateViewMode === 'medicare' ? 'bg-blue-600' : 'bg-gray-600'}
    `}
  >
    <span className={`
      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
      ${rateViewMode === 'medicare' ? 'translate-x-6' : 'translate-x-1'}
    `} />
  </button>
  <span className={`text-xs font-semibold ${rateViewMode === 'medicare' ? 'text-blue-400' : 'text-gray-400'}`}>
    {rateViewMode === 'medicare' ? 'Medicare Only' : 'Blended (Commercial + Medicare)'}
  </span>
</div>
```

When `rateViewMode === 'medicare'`, also show a banner below the toggle:
```tsx
{rateViewMode === 'medicare' && (
  <div className="mt-1 px-3 py-1.5 rounded bg-blue-900/40 border border-blue-700/50 text-xs text-blue-300">
    📋 <strong>Medicare Rate View</strong> — All procedures at CMS allowable rates only ($949 weighted base).
    Commercial premium suspended. This is the floor-case reimbursement scenario.
  </div>
)}
```

---

## Step 6 — Wire `rateViewMode` to `calcKeyMetrics` call

Find where `calcKeyMetrics(assumptions)` is called. Update:

```typescript
const { rateViewMode, setRateViewMode } = useStore()
const metrics = calcKeyMetrics(assumptions, rateViewMode)
```

---

## Step 7 — Add comparison delta on Revenue/Procedure KPI card

On the Revenue/Procedure card, show the Medicare rate and delta when in blended mode:

```tsx
<div className="text-xs text-gray-500 mt-1">
  {rateViewMode === 'blended'
    ? `Medicare base: $${calcBlendedRate(assumptions, 'medicare').toLocaleString()} · Commercial premium: +$${(calcBlendedRate(assumptions, 'blended') - calcBlendedRate(assumptions, 'medicare')).toLocaleString()}`
    : `vs blended: $${calcBlendedRate(assumptions, 'blended').toLocaleString()} (+$${(calcBlendedRate(assumptions, 'blended') - calcBlendedRate(assumptions, 'medicare')).toLocaleString()} commercial lift)`
  }
</div>
```

---

## Expected Output

| Mode | Rev/Proc | Rev/Patient | Y1 Gross Rev |
|------|----------|-------------|-------------|
| Blended | ~$1,667 | ~$4,834 | ~$1.03M |
| Medicare Only | ~$949 | ~$2,752 | ~$586K |

Commercial premium = ~$718/procedure = ~43% of blended revenue

---

## Verification
1. Toggle switches between "Blended" and "Medicare Only" label
2. All KPI cards (Revenue/Procedure, Revenue/Patient, EBITDA, Annual Revenue) update
3. Funnel chart revenue bars update
4. Toggle persists on page navigation (stored in Zustand, not local state)
5. Blended mode matches original app numbers exactly
6. Run `npm run build` — no TypeScript errors
