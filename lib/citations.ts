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
    value: '0.54',
    rationale: 'Vein campaigns show ~54% booking from contacted leads',
    link: 'https://www.venatorpm.com/vein-and-vascular-marketing',
  },
  {
    id: 'showRate',
    assumption: 'Show Rate',
    value: '0.75',
    rationale: 'National no-show ~18\u201325%; elective procedures perform better',
    link: 'https://finturf.com/blog/reduce-patient-no-shows/',
  },
  {
    id: 'treatmentRate',
    assumption: 'Treatment Conversion',
    value: '0.65',
    rationale: 'Elective conversion ~41\u201360% spine, ~55% plastics',
    link: 'https://www.sciencedirect.com/science/article/pii/S1529943024001128',
  },
  {
    id: 'proceduresPerPatient',
    assumption: 'Procedures per Patient (effective)',
    value: '3.4 (Base)',
    rationale: 'v12 — derived = Expected Pathway Procs (4.0) × Pathway Completion (85%). Bilateral CVI plan: 2 ablations + 1\u20132 sclero per leg.',
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
    assumption: 'Revenue per Procedure',
    value: '$2,412 base / ~$3,377 blended',
    rationale: 'Weighted blend of RFA/VenaSeal/Varithena/U/S fees from competitor fee schedule \u00d7 payer mix',
    link: '#',
  },
  {
    id: 'cogsPerProcedure',
    assumption: 'COGS per Procedure',
    value: '$405',
    rationale: 'VenaSeal + RF + consumables blended',
    link: '#',
  },
  {
    id: 'fixedOpex',
    assumption: 'Fixed OpEx',
    value: '$706K/year',
    rationale: 'Staffing + rent + overhead',
    link: '#',
  },
  {
    id: 'cpl',
    assumption: 'Cost Per Lead',
    value: '$50',
    rationale: 'Meta/Google DTC benchmarks for medical aesthetics',
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
