import { TopBar } from '@/components/layout/TopBar'

const CITATIONS = [
  {
    assumption: 'Contact Rate',
    value: '0.35',
    rationale: 'Phone leads convert 25\u201340%; <5 min response increases conversion ~21\u00d7',
    link: 'https://www.invoca.com/reports/the-invoca-call-conversion-benchmarks-report-for-the-healthcare-industry-2025',
  },
  {
    assumption: 'Booking Rate',
    value: '0.54',
    rationale: 'Vein campaigns show ~54% booking from contacted leads',
    link: 'https://www.venatorpm.com/vein-and-vascular-marketing',
  },
  {
    assumption: 'Show Rate',
    value: '0.75',
    rationale: 'National no-show ~18\u201325%; elective procedures perform better',
    link: 'https://finturf.com/blog/reduce-patient-no-shows/',
  },
  {
    assumption: 'Treatment Conversion',
    value: '0.65',
    rationale: 'Elective conversion ~41\u201360% spine, ~55% plastics',
    link: 'https://www.sciencedirect.com/science/article/pii/S1529943024001128',
  },
  {
    assumption: 'Procedures per Patient',
    value: '2.5',
    rationale: 'Bilateral disease common; 2\u20134 CPT codes per encounter',
    link: 'https://pubmed.ncbi.nlm.nih.gov/10396491/',
  },
  {
    assumption: 'Market Growth',
    value: '\u2013',
    rationale: 'Endovenous ablation grew 107% (2010\u20132018)',
    link: 'https://www.jvsvenous.org/article/S2213-333X(24)00163-X/fulltext',
  },
  {
    assumption: 'Blended Revenue',
    value: '$1,247',
    rationale: 'Medicare base + commercial multiplier blended',
    link: '#',
  },
  {
    assumption: 'COGS per Procedure',
    value: '$405',
    rationale: 'VenaSeal + RF + consumables blended',
    link: '#',
  },
  {
    assumption: 'Fixed OpEx',
    value: '$706K/year',
    rationale: 'Staffing + rent + overhead',
    link: '#',
  },
]

export default function CitationsPage() {
  return (
    <div>
      <TopBar title="Citations & Methodology" />
      <div className="p-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Assumption</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Model Value</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Source / Rationale</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Citation</th>
                </tr>
              </thead>
              <tbody>
                {CITATIONS.map((c) => (
                  <tr key={c.assumption} className="border-b border-gray-800 hover:bg-gray-800/20">
                    <td className="px-4 py-2.5 text-gray-300 font-medium">{c.assumption}</td>
                    <td className="px-4 py-2.5 text-gray-400 font-mono">{c.value}</td>
                    <td className="px-4 py-2.5 text-gray-400 max-w-sm">{c.rationale}</td>
                    <td className="px-4 py-2.5">
                      {c.link !== '#' ? (
                        <a
                          href={c.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-400 hover:underline text-xs break-all"
                        >
                          View Source
                        </a>
                      ) : (
                        <span className="text-gray-600 text-xs">Internal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
