# Add: Procedures per Patient Slider (1.0 – 4.0)

## Goal
Add a live slider controlling `procsPerPatient` (1.0–4.0, step 0.1, default 2.9)
in the Conversion Rate Controls section. Updates all downstream metrics in real time.

## Step 1 — Change type to `number` if currently `ScenarioValues`

In `lib/types.ts` (Assumptions interface):
```typescript
procsPerPatient: number   // change from ScenarioValues if needed
```
In `lib/defaults.ts`:
```typescript
procsPerPatient: 2.9,
```
In `lib/model.ts` — replace every `sv(a.procsPerPatient, a.scenario)` with `a.procsPerPatient`

Skip this step if `procsPerPatient` is already a plain `number`.

## Step 2 — Add slider to `app/page.tsx`

Find the "Conversion Rate Controls" section (Contact Rate, Booking Rate, Show Rate,
Treatment Conversion sliders). Add immediately after:

```tsx
{/* Procedures per Patient */}
<div className="flex flex-col gap-1">
  <div className="flex justify-between text-xs text-gray-400">
    <span>Procedures / Patient <TooltipInfo text="Average CPT line items billed per treated patient. Bilateral disease, combined ablation + sclerotherapy, or multi-segment treatment. Source: PubMed 10396491 — 2–4 CPT codes typical." /></span>
    <span className="font-mono text-teal-400">{assumptions.procsPerPatient.toFixed(1)}</span>
  </div>
  <input
    type="range" min={1} max={4} step={0.1}
    value={assumptions.procsPerPatient}
    onChange={(e) => updateAssumption('procsPerPatient', parseFloat(e.target.value))}
    className="w-full accent-teal-500"
  />
  <div className="flex justify-between text-[10px] text-gray-600">
    <span>1.0</span><span>4.0</span>
  </div>
</div>
```

## Step 3 — Verify downstream
In `calcKeyMetrics`, confirm:
```typescript
const revenuePerPatient = calcBlendedRate(a) * a.procsPerPatient
```

## Verification
1. Slider appears, range 1.0–4.0, default 2.9
2. Moving to 1.0 → Revenue/Patient ≈ blendedRate × 1.0 (~$1,667)
3. Moving to 4.0 → Revenue/Patient ≈ blendedRate × 4.0 (~$6,668)
4. Avg Monthly Procedures updates reactively
5. Run `npm run build`
