> **SUPERSEDED — 2026-05-16**
> This 2026-05-11 bundle/E&M audit captured pre-v14.1 thinking and
> incorrectly treats E&M as an active bundle line. It is superseded by
> the v14.1 modeling decision: E&M is held out as a buffer and excluded
> from the per-procedure bundle math, as implemented in the v14.1
> commits (`lib/defaults.ts`, `lib/model.ts`, `lib/types.ts`) and
> documented on the `/methodology` page.
>
> Keep this file for historical context only. For current logic and
> investor-facing explanations, rely on the code and the
> `/methodology` documentation as of v14.1.

---

# Per-Procedure Bundle — open questions (handoff from FinancialCalculator.doctor session)

## Why this doc exists
Came up while building FinancialCalculator.doctor. Realized the per-procedure dollar definition in CuraVein needs to be made explicit (not just "weighted CPT avg") for both investor defensibility and to port cleanly into the new generalized model.

## How a procedure is defined dollar-wise (corrected)

A procedure = **one primary CPT + a per-procedure share of the patient's ultrasound, sclerotherapy, and E&M revenue.**

```
$/procedure = Primary CPT revenue
            + (Avg US $ per patient ÷ avg primary procedures per patient)
            + (Avg liquid sclero $ per patient ÷ avg primary procedures per patient)
            + (Avg E&M $ per patient ÷ avg primary procedures per patient)
```

**Primary procedures (the "mix"):**
- RFA (36475)
- VenaSeal (36482)
- Varithena foam (36465 / 36466)

**Bundled per-patient, allocated per primary procedure:**
- Ultrasound — reflux study (93970) + any procedural US guidance, total per patient
- Non-Varithena sclerotherapy — 36470 (single) + 36471 (multiple), liquid sclero for residual tributaries
- E&M — consult (99203/99204) + follow-ups (99213/99214), total per patient

**Excluded:**
- Add-on ablation (36476) — too rare to model

## Why allocate per primary procedure (not per encounter)
A patient with 3 ablations gets one reflux study, not three. If we put $300 of US revenue against the encounter, we'd be either triple-counting or under-attributing. Dividing the patient's total US/sclero/E&M revenue by their average number of primary procedures gives a per-procedure $ that's auditable from the chart and additive across the funnel.

## Numbers I need from v14
The four inputs to drive this:

1. **Avg ultrasound $/patient** — reflux study + any procedural guidance, summed per patient
2. **Avg liquid sclerotherapy $/patient** — 36470/36471 only, Varithena stays in primary
3. **Avg E&M $/patient** — consult + follow-up visits summed
4. **Avg primary procedures/patient** — current model uses 1.2; confirm or update

These should already exist in v14. Likely tabs to look at:
- "Assumptions" or "Inputs"
- "Revenue per Patient" / "Per-Patient Economics"
- "CPT Mix" or "Procedure Mix"

Once I have the numbers (or the cell references), the Procedure Mix tab on both v14 and FinancialCalculator_Doctor_v1.xlsx gets restructured into:
- 3 primary CPT rows (RFA / VenaSeal / Varithena) with mix % and avg primary $
- Separate "Bundle per Patient" block (US / sclero / E&M)
- Output: weighted $/procedure that's auditable line by line

## Action items
- [ ] Open v14, identify which tab holds the per-patient bundle revenue numbers
- [ ] Drop v14 into the CURAVEIN APP Cowork folder so I can read it directly (or paste the four numbers here)
- [ ] Decide: do we update v14 to make the bundle structure explicit, or keep v14 as-is and only restructure the new FinancialCalculator.doctor workbook?
- [ ] If updating v14: bump to v15, document the change in the model's Methodology tab

## Reference: what's already built in FinancialCalculator.doctor
- `~/Documents/Claude/Projects/FinancialCalculator.doctor/FinancialCalculator_Doctor_v1.xlsx`
- Procedure Mix tab currently has 4 hardcoded rows (RFA / VenaSeal / Varithena / US 93970) with placeholder mix and revenue values yielding a $2,280 weighted base
- Will be restructured to match the bundle definition above once v14 numbers come in
