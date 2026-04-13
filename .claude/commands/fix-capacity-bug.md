# Fix: AT CAPACITY Month Calculation

A month is being flagged AT CAPACITY before procedures reach 120.
Fix so that no month is labeled AT CAPACITY unless its cappedProcs equals a.maxCapacity (120).

## Step 1 — Read these files first
- `lib/defaults.ts` — verify maxCapacity value
- `lib/types.ts` — check type of maxCapacity (ScenarioValues or plain number)
- `lib/model.ts` — find calcFunnelMonth (~line 110–125) and calcKeyMetrics (~line 360–416)
- `app/page.tsx` — find AVG MONTHLY PROCEDURES KpiCard sub label (~line 128)
- `app/funnel/page.tsx` — find monthsAtCapacity computation (~line 101)

## Step 2 — Ensure maxCapacity default = 120
In `lib/defaults.ts`, maxCapacity must be the plain number 120:
```typescript
maxCapacity: 120,
```
If it is a ScenarioValues object, flatten it to a plain number and update the type in `lib/types.ts` accordingly.

## Step 3 — Fix calcFunnelMonth in lib/model.ts
The capacity block must read exactly:
```typescript
const rawProcs = Math.round(treated * sv(a.procsPerPatient, a.scenario))
const cappedProcs = Math.min(rawProcs, a.maxCapacity)
const atCapacity = rawProcs >= a.maxCapacity
const utilization = a.maxCapacity > 0 ? cappedProcs / a.maxCapacity : 0
const excessDemand = Math.max(0, rawProcs - a.maxCapacity)
```
Return `atCapacity` in the FunnelMonth object (add to type if missing).

## Step 4 — Fix monthsAtCapacity counter in calcKeyMetrics
Inside the for loop over 12 months, the increment must use cappedProcs:
```typescript
if (funnel.cappedProcs >= a.maxCapacity) monthsAtCapacity++
```
NOT rawProcs, NOT a different threshold.

## Step 5 — Fix display in app/page.tsx
The AVG MONTHLY PROCEDURES KpiCard sub prop:
```tsx
sub={metrics.monthsAtCapacity > 0
  ? `${metrics.monthsAtCapacity} mo AT CAPACITY`
  : 'Y1 average'}
```

## Step 6 — Fix funnel/page.tsx monthsAtCapacity
```typescript
const monthsAtCapacity = months.filter(m => m.cappedProcs >= assumptions.maxCapacity).length
```

## Verify
- Default Base scenario: no month at capacity until that month's cappedProcs === 120
- Run: npm run build — zero TypeScript errors
