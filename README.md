# CuraVein Financial Model

PE-grade interactive financial dashboard for CuraVein specialty vein practice. Built with Next.js 14, TypeScript, Tailwind CSS, Recharts, and Zustand.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — Key Metrics Snapshot (6 KPIs + breakeven + 3-yr EBITDA) |
| `/scenario` | Scenario Controls — edit all assumptions inline |
| `/funnel` | DTC Acquisition Funnel — 12-month waterfall + utilization |
| `/revenue` | Revenue Projections — Medicare/Commercial split + annual comparison |
| `/cogs` | Supply Costs — donut breakdown + sensitivity table |
| `/pl` | P&L — monthly Y1 + 3-year annual toggle |
| `/sensitivity` | Sensitivity Analysis — 3 heatmap tables |
| `/cpt` | CPT Revenue Detail — all procedure + E&M codes |

## Scenario Guide

Three scenarios are available via the top bar toggle on every page:

- **Conservative** — higher CPL, lower conversion, lower reimbursement
- **Base** — default assumptions matching the Excel model
- **Aggressive** — lower CPL, higher conversion, higher reimbursement

All pages update instantly when you switch scenarios.

## Editing Assumptions

Navigate to `/scenario` to edit any assumption inline. Values shown in **blue** are user-editable. Click any blue value, type a new number, and press Enter. Click "Reset" per section or "Reset All to Defaults" to revert.

Key editable parameters:
- CPL (Cost Per Lead)
- Funnel conversion rates (contact, booking, show, treatment)
- Reimbursement rates and payer mix
- Supply costs (VenaSeal, RF, Sclerotherapy)
- Personnel salaries and burden rates
- Fixed costs (rent, malpractice, EMR, billing)
- Marketing spend ramp (12-month)

## Deployment to Vercel

1. Push to GitHub repo `curavein-model`
2. Connect repo to Vercel
3. Framework: Next.js (auto-detected)
4. No environment variables required (fully client-side)
5. Set custom domain to `curavein.app` in Vercel settings

## Architecture

All financial calculations are pure TypeScript functions in `lib/model.ts` — no side effects, no React dependencies. The Zustand store in `lib/store.ts` holds the single assumptions object. Every page derives its data via `useMemo` from this store, ensuring instant reactivity across all views.

---

## Local & Preview Workflow (added 2026-04-21)

This project ships to production on every push to `main`. Use the workflow below
to keep production untouched while developing.

### Branch model

| Branch | Purpose | Vercel deployment |
|---|---|---|
| `main` | Production. Deploys to **curavein.app**. | Production |
| `staging` | Integration target for finished features before promotion. | Preview (a regular `*.vercel.app` URL — no persistent alias unless added in the Vercel dashboard) |
| `feature/*` | Isolated work. One branch per change. | Preview (per-branch `*.vercel.app` URL) |

**Never push directly to `main`.** Open a PR from `staging` (or a `feature/*` branch) and merge after preview verification.

### Local development (macOS)

```bash
npm install        # one-time
npm run dev        # original — starts dev server on http://localhost:3000
npm run dev:open   # same as dev, plus auto-opens the browser once the server is ready
```

`dev:open` runs the existing `next dev` unchanged and uses the macOS-native `open`
command. It polls http://localhost:3000 with `curl` (bounded to 30s) and opens the
browser only after the server responds. No new dependencies. Port is the Next.js
default `3000`; if you start the server on a different port (e.g. `next dev -p 3001`),
use plain `npm run dev` and open the URL manually.

If `npm run dev:open` (or `npm run preview:open`) does not open a browser, the
dev server most likely failed to start. Check the terminal output for errors —
the polling loop gives up silently after 30 seconds.

### Local production-style preview

```bash
npm run build
npm run preview:open   # runs `next start` and opens http://localhost:3000 once ready
```

Use this to sanity-check a production build locally before pushing.

### Vercel preview deploys

Pushing any non-`main` branch to GitHub triggers a Vercel **Preview** deployment.
Each preview gets its own URL — typical patterns:

- `https://curaveinapp-git-<branch>-<team-slug>.vercel.app`
- `https://curaveinapp-<hash>-<team-slug>.vercel.app`

Any deployment that resolves to `curavein.app` must be treated as production.
If a preview ever resolves there, stop and inspect the Vercel dashboard.

### Environment variables

The app currently requires **none**. See `.env.example` for the template if any
are added later. Local overrides go in `.env.local` (gitignored). Vercel-scoped
vars are configured per environment (Development / Preview / Production) in the
Vercel dashboard — never commit production values to the repo.

### Spreadsheet (`CuraVein_Integrated_v12.xlsx`)

The xlsx is **not read at runtime**. Values are hand-ported into `lib/defaults.ts`
and `lib/scenarioData.ts`; `spreadsheet_baseline.json` is a frozen snapshot used
for validation by `/api/audit` and `scripts/audit_compare.py`. To validate a
change against the spreadsheet:

1. Update the xlsx, re-export the relevant cells into `spreadsheet_baseline.json`.
2. Hit `/api/audit` on a preview deployment (or run `scripts/audit_compare.py`).
3. Diff against `spreadsheet_baseline.json`.
