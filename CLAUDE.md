# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PE-grade interactive financial dashboard for CuraVein, a specialty vein practice. Next.js 14 (App Router) + TypeScript + Tailwind + Zustand + Recharts. Fully client-side — no backend, no env vars, deploys to Vercel.

## Commands

```bash
npm install
npm run dev        # next dev — http://localhost:3000
npm run build      # next build
npm run start      # next start (after build)
npm run lint       # next lint (extends next/core-web-vitals + next/typescript)
```

There is no test runner configured. Reconciliation harnesses live at the repo root as `_audit_*.ts` and run with `npx tsx _audit_2026-04-26.ts`. They exercise `calcAnnualPL`, `calcKeyMetrics`, `calcBreakeven` across all three scenarios and assert invariants like `medicareRevenue + commercialRevenue + usRevenue + scleroRevenue === grossRevenue`. Re-run before any model change merges. `.gitignore` excludes `_*.ts`, so these files stay local.

For end-to-end spreadsheet reconciliation, the dev server exposes `GET /api/audit` (`app/api/audit/route.ts`) which dumps every derived value as JSON. `scripts/audit_compare.py` (requires `pip install requests openpyxl`) hits it and diffs against `CuraVein_Integrated_v12.xlsx`. The expected source-of-truth values are mirrored in `spreadsheet_baseline.json`.

## Architecture

**Single source of truth: `lib/store.ts`.** A Zustand store holds one `Assumptions` object (defined in `lib/types.ts`, seeded from `DEFAULT_ASSUMPTIONS` in `lib/defaults.ts`). Every page is a client component that calls `useModelStore()` and derives its view model with `useMemo`. Switching scenarios via the `TopBar` toggle mutates `assumptions.scenario` and the entire app re-renders.

**Pure calc engine: `lib/model.ts`.** All financial math lives here as pure functions of `Assumptions`. No React, no side effects, no I/O. The canonical pipeline is:

```
calcFunnelMonth → calcRevenueMonth → calcCOGSMonth → calcOpexMonth → calcPLMonth → calcAnnualPL
                                                                                  → calcKeyMetrics, calcBreakeven
```

Every page that iterates 12 months by hand **must** first call `adjustAssumptionsForYear(year, a)` and pass the adjusted object plus `year` into `calcRevenueMonth`/`calcPLMonth`. Iterating raw `assumptions` is the recurring bug pattern (see audits C-8, C-11) — it bypasses the year-specific capacity, the marketing-spend scaling, and the credentialing ramp short-circuit. `calcAnnualPL`, `calcKeyMetrics`, and `calcBreakeven` already do this internally; downstream callers must too.

**Layout shell.** `app/layout.tsx` (server) → `components/layout/AppShell.tsx` (client) → `Sidebar` + `Backdrop` + `<main>{children}</main>` under `UIStateProvider`. The mobile drawer state is the only reason `AppShell` is a client island. Each page renders its own `TopBar` (scenario toggle).

**Routes.** App Router pages live in `app/<route>/page.tsx`. Nav order is defined in `components/layout/Sidebar.tsx::NAV_ITEMS` — keep it in sync when adding routes. Existing routes: `/`, `/scenario`, `/funnel`, `/revenue`, `/cogs`, `/pl`, `/sensitivity`, `/cpt`, `/citations`. Path alias `@/*` maps to repo root.

## Conventions

**Audit annotations are load-bearing context, not noise.** Comments tagged `AUDIT YYYY-MM-DD <ID>` (e.g. `AUDIT 2026-04-26 C-12`) document a specific bug class, the regression that prompted the fix, and the invariant being protected. Read them before touching the surrounding code; full write-ups are in `audits/*.md`.

**Two feature flags in `lib/defaults.ts` change model output:**
- `V12_HARDENING_ENABLED` (currently `true`) — switches `effectiveMonthlyCapacity`, `netRealizationMultiplier`, `effectiveCommercialShare`, the US/sclero bundle revenue lines, and pathway-economics-derived `procsPerPatient`. When off, `lib/model.ts` falls back to flat legacy fields. Every helper in the model checks the flag inline; preserve that pattern.
- `INCOME_BUFFER_FACTOR` (`0.90`) + `applyIncomeBuffer()` — a presentation-layer 10% haircut applied to displayed Gross Revenue, Net Revenue, and EBITDA. The underlying month-by-month calcs are NOT buffered; reconciliation invariants hold against raw values. Any view that shows buffered numbers must surface `BUFFER_DISCLOSURE` (see `components/ui/ModelDisclosure.tsx`).

**Scenarios are `'conservative' | 'base' | 'aggressive' | 'hybridWound'`.** Most editable values are typed `ScenarioValues<T>` (a record with one entry per scenario). `hybridWound` is a separate "Wound Care Center referral floor" mode — its Y1 procedure floor is baked into `_monthlyProcFloor` by `adjustAssumptionsForYear` and consumed inside `calcFunnelMonth`. Other scenarios leave `_monthlyProcFloor` undefined.

**"Isolated downside" policy.** Conservative values mirror Base on funnel/pathway/capacity inputs. Conservative diverges from Base ONLY on `netRealizationFactor` and `targetedCommercialShare`. The intent is to prevent compound-pessimism and keep Y3 Conservative EBITDA positive. Don't reintroduce Conservative-specific funnel rates without explicit operator sign-off.

**Reconciliation invariants** the model is expected to maintain (cited throughout):
- `grossRevenue == medicareRevenue + commercialRevenue + usRevenue + scleroRevenue` (per `RevenueMonth`)
- `calcKeyMetrics.avgMonthlyProcs * 12 == calcAnnualPL(1).totalProcs`
- Sum of monthly `calcPLMonth` fields equals annual `calcAnnualPL` fields when iterated against `adjustAssumptionsForYear(year, a)`

**Two retired-but-tombstoned files:** `lib/v10Calculations.ts` and `lib/scenarioData.ts` are intentional empty stubs (the v10 shadow engine was retired per AUDIT 2026-04-23 C-1). Don't import from them; don't delete them without an operator-led cleanup PR.

**Spreadsheet cell refs in comments** (e.g. `SC!E130`, `IS!F47`) reference `CuraVein_Integrated_v12.xlsx` and are the source of truth for default numbers. When changing a default, update the comment to match the new sheet/cell or note the divergence.

**Formatting.** Use the helpers in `lib/formatters.ts` (`fmtCurrency`, `fmtCurrencyCompact`, `fmtPct`, `fmtNumber`, `fmtDecimal`) — they handle null/zero rendering consistently. Use `cn()` from `lib/utils.ts` for conditional Tailwind classes.

**CI.** `.github/workflows/mobile-fix.yml` is a manual workflow_dispatch trigger that runs Claude Code with `--dangerously-skip-permissions` to enforce mobile responsiveness. The prompt explicitly forbids touching `lib/model.ts` or `lib/store.ts`.
