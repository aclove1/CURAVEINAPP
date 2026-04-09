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
