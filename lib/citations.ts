export interface Citation {
  id: string
  assumption: string
  value: string
  rationale: string
  link: string
}

export const CITATIONS: Citation[] = [
  {
    id: 'contactRate',
    assumption: 'Contact Rate (composite)',
    value: '0.530 (Base)',
    rationale: 'v12 — Σ (volumeShare × contactRate) across 5 sources (Paid Search, Meta, SEO, Referral, Repeat). Paid web 30\u201345%; referral/repeat 85\u201395%.',
    link: 'https://www.invoca.com/reports/the-invoca-call-conversion-benchmarks-report-for-the-healthcare-industry-2025',
  },
  {
    id: 'bookingRate',
    assumption: 'Booking Rate',
    value: '0.60 (Base)',
    rationale: 'Vein campaigns ~54\u201360% booking from contacted leads; Base seeded at 0.60.',
    link: 'https://www.venatorpm.com/vein-and-vascular-marketing',
  },
  {
    id: 'showRate',
    assumption: 'Show Rate',
    value: '0.78 (Base)',
    rationale: 'National no-show ~18\u201325%; elective procedures perform better. Base seeded at 0.78.',
    link: 'https://finturf.com/blog/reduce-patient-no-shows/',
  },
  {
    id: 'treatmentRate',
    assumption: 'Treatment Conversion',
    value: '0.65 (Base)',
    rationale: 'Elective conversion ~41\u201360% spine, ~55% plastics. Vein Base seeded at 0.65.',
    link: 'https://www.sciencedirect.com/science/article/pii/S1529943024001128',
  },
  {
    id: 'proceduresPerPatient',
    assumption: 'Procedures per Patient (effective)',
    value: '3.08 (Base, isolated downside)',
    rationale: 'v12 \u2014 derived = Expected Pathway Procs (3.625 Base from complexity distribution 25/50/25) \u00d7 Pathway Completion (85%) = 3.08. Isolated downside policy: Conservative = Base; Aggressive 4.11.',
    link: 'https://pubmed.ncbi.nlm.nih.gov/10396491/',
  },
  {
    id: 'pathwayCompletion',
    assumption: 'Pathway Completion %',
    value: '0.85 (Base)',
    rationale: 'v12 NEW — % of treated patients who complete the full multi-visit plan. Drops to 65% with weak financial counseling; 95% with active rebook + counselor.',
    link: '#',
  },
  {
    id: 'leadSourceMix',
    assumption: 'Lead Source Mix',
    value: '5 sources \u2192 composite',
    rationale: 'v12 NEW \u2014 Paid Search 40%, Paid Social 22%, Organic SEO 18%, Physician Referral 15%, Repeat 5% (Base). Each source has its own contact rate; composite drives funnel.',
    link: '#',
  },
  {
    id: 'marketGrowth',
    assumption: 'Market Growth',
    value: '\u2013',
    rationale: 'Endovenous ablation grew 107% (2010\u20132018)',
    link: 'https://www.jvsvenous.org/article/S2213-333X(24)00163-X/fulltext',
  },
  {
    id: 'revenuePerProcedure',
    assumption: 'Blended Rate per Procedure (steady-state)',
    value: '~$1,816 Base / $1,545 Down / $1,922 Up (NB, net of realization)',
    rationale: 'Weighted Medicare base $1,408 \u00d7 (gov share + comm share \u00d7 1.496 multiplier) \u00d7 net realization factor. Scenario-sensitive via targeted commercial share and realization ramp.',
    link: '#',
  },
  {
    id: 'cogsPerProcedure',
    assumption: 'COGS per Procedure (weighted)',
    value: '~$420 (Base, procedure supplies + post-proc + misc)',
    rationale: 'VenaSeal kit/patient + RF + Varithena drug + post-proc support + misc, each multiplied by (1 + waste factor 7.5%). Recomputed live in calcWeightedSupplyCost.',
    link: '#',
  },
  {
    id: 'fixedOpex',
    assumption: 'Fixed OpEx (annualized)',
    value: '~$790K/year (Base, derived)',
    rationale: 'Personnel (physician + RVT + MA + front office) \u00d7 (1 + payroll tax + benefits) + rent + malpractice + EMR + billing fixed + 2% of gross. Live from calcOpexMonth summed over 12 months.',
    link: '#',
  },
  {
    id: 'cpl',
    assumption: 'Cost Per Lead',
    value: '$60 Base / $45 Aggressive',
    rationale: 'Meta/Google DTC benchmarks for vein/medical aesthetics. Base assumes mixed search+social; Aggressive reflects referral-heavy channel shift lowering blended CPL.',
    link: 'https://www.invoca.com/reports/the-invoca-call-conversion-benchmarks-report-for-the-healthcare-industry-2025',
  },
  {
    id: 'marketGrowthCagr',
    assumption: 'Market Growth CAGR',
    value: '6.8% CAGR',
    rationale: 'Endovenous ablation grew 107% 2010\u20132018; projected 6.8% CAGR through 2030',
    link: 'https://www.grandviewresearch.com/industry-analysis/varicose-vein-treatment-market',
  },
  {
    id: 'y2GrowthRate',
    assumption: 'Y2 Conversion Improvement',
    value: '10%',
    rationale: 'Conservative year-over-year conversion rate improvement as operations mature and referral network builds',
    link: '#',
  },
  {
    id: 'y3GrowthRate',
    assumption: 'Y3 Conversion Improvement',
    value: '15%',
    rationale: 'Accelerated improvement in Y3 as brand recognition and referral volume compound',
    link: '#',
  },
]

export function getCitationById(id: string): Citation | undefined {
  return CITATIONS.find((c) => c.id === id)
}
