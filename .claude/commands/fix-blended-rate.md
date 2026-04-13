# Fix: Blended Rate / Revenue Per Procedure

## Correct Values

**Blended rate: ~$2,276/procedure (base scenario)**
**Revenue per patient: ~$6,600 (at 2.9 procs/patient)**

### CPT Weighted Medicare Base: $982/procedure
| CPT   | Description        | Medicare Rate | Mix  | Weighted |
|-------|--------------------|--------------|------|----------|
| 36475 | RFA                | $1,150 (est) | 30%  | $345     |
| 36482 | VenaSeal           | $1,452.78    | 15%  | $218     |
| 36465 | Varithena (single) | $1,122.16    | 20%  | $224     |
| 36466 | Varithena (multi)  | $1,253.75    | 13%  | $163     |
| 93970 | Bilateral U/S      | $170.25      | 12%  | $20      |
| 93971 | Unilateral U/S     | $108.99      | 10%  | $11      |
| **TOTAL** | **Weighted Medicare Base** | | **100%** | **~$982** |

### Commercial Multiplier: 2.55×
Texas market payer-weighted rationale:
- UHC pays $4,309 for RFA = **3.75× Medicare** est. UHC is ~30% of commercial in suburban SA market
- RFA Texas commercial average (Aetna $3,611, BCBS $1,266, Humana $2,661, UHC $4,309): **2.56× Medicare**
- RFA is 30% of therapeutic volume — drives the blended multiplier above 2.0×
- Varithena/U/S codes lower the blended mult; net weighted = **2.55×**

### Formula
```
blendedRate = 982 × (0.15 Medicare + 0.85 Commercial × 2.55)
            = 982 × (0.15 + 2.168)
            = 982 × 2.318
            ≈ $2,276/procedure
```

---

## Root Cause of Original Bug
The app was using UHC commercial rates (the highest payer) labeled as "Medicare rates" as the base,
then applying the commercial multiplier on top — double-counting UHC's premium.
- 36475 RFA: UHC $4,309 was used as "Medicare" → blended was $3,143–$3,316 (inflated 40%)

---

## Files to Read First
1. `lib/defaults.ts` — find `medicareBase`, `commMultiplier`, `medicareMix`, `commercialMix`
2. `lib/model.ts` — find `calcBlendedRate(a)` (~line 149)

---

## Fix in `lib/defaults.ts`

```typescript
medicareBase: 982,      // TX CPT-weighted CMS allowable (RFA 30%, VenaSeal 15%, Varithena 33%, U/S 22%)
commMultiplier: 2.55,   // Texas market: UHC/Aetna dominant for RFA (2.56×), weighted across all codes
```

If these are `ScenarioValues`:
```typescript
medicareBase: { conservative: 850, base: 982, aggressive: 1100 },
commMultiplier: { conservative: 2.10, base: 2.55, aggressive: 3.00 },
```

---

## Verification
1. Revenue/Procedure KPI shows **~$2,276** (base scenario)
2. Revenue/Patient shows **~$6,600** (2.9 procs/patient × $2,276)
3. Booking Rate slider does NOT change Revenue/Procedure (see fix-revenue-per-proc command)
4. Medicare toggle mode shows: **~$982** (pure CMS floor, ~57% below blended)
5. Commercial premium = $2,276 - $982 = **$1,294/procedure** (commercial uplift)
6. Run `npm run build` — no TypeScript errors
