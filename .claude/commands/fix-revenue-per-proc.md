# Fix: Revenue/Procedure Changes When Booking Rate Moves

## Problem
Revenue/Procedure and Revenue/Patient KPI cards change when Booking Rate (or other
volume sliders) move. These are rate assumptions — they must be static unless payer
mix or rate inputs change.

## Why It Happens
`revenuePerProc` in `calcKeyMetrics` (~line 383):
```typescript
const revenuePerProc = totalProcs > 0 ? totalGrossRevenue / totalProcs : 0
```
This is a Y1 weighted average. Because `calcMonthBlendedRate(month, a)` applies a
credentialing ramp (months 1–3: govt-heavy, months 7+: steady-state), early months
have lower rates. Shifting volume between months via booking rate changes the weighted
average — even though no rate assumption changed.

## Fix in `lib/model.ts` — inside `calcKeyMetrics`

Find:
```typescript
const revenuePerProc = totalProcs > 0 ? totalGrossRevenue / totalProcs : 0
```
Replace with:
```typescript
// Steady-state blended rate — independent of volume/conversion sliders
const revenuePerProc = calcBlendedRate(a)
```

Find `revenuePerPatient` (likely nearby):
```typescript
const revenuePerPatient = revenuePerProc * sv(a.procsPerPatient, a.scenario)
```
Ensure it uses `calcBlendedRate(a)`:
```typescript
const revenuePerPatient = calcBlendedRate(a) * a.procsPerPatient
```

**Do NOT change** `totalGrossRevenue` — that stays as the actual summed revenue.

## Verification
1. Move Booking Rate 20% → 80% — Revenue/Procedure must NOT change
2. Move Contact Rate — Revenue/Procedure must NOT change
3. Revenue/Procedure only changes when payer mix or rate inputs change
4. Run `npm run build`
