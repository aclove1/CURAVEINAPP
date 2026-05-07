'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { CITATIONS } from '@/lib/citations'

function CitationsTable() {
  const searchParams = useSearchParams()
  const [highlightId, setHighlightId] = useState<string | null>(null)

  useEffect(() => {
    const id = searchParams.get('highlight')
    if (!id) return
    setHighlightId(id)
    const el = document.getElementById(`citation-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    const timer = setTimeout(() => setHighlightId(null), 1500)
    return () => clearTimeout(timer)
  }, [searchParams])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50">
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Assumption</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Model Value</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Source / Rationale</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Citation</th>
            </tr>
          </thead>
          <tbody>
            {CITATIONS.map((c) => (
              <tr
                key={c.id}
                id={`citation-${c.id}`}
                className={`border-b border-gray-800 hover:bg-gray-800/20 transition-colors duration-700 ${
                  highlightId === c.id ? 'bg-[#5faaa6]/20' : ''
                }`}
              >
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
                    <span className="text-gray-400 text-xs">Internal</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const REFERENCES: { text: string; url?: string }[] = [
  { text: 'Epstein D et al. Cost-effectiveness analysis of varicose veins treatments. J Vasc Surg Venous Lymphat Disord 2022;10:504-513.' },
  { text: 'Beebe-Dimmer JL et al. Epidemiology of chronic venous insufficiency and varicose veins. Ann Epidemiol 2005;15(3):175-184.' },
  { text: 'Sharif Nia H et al. Varicose veins among nurses: occupational and demographic characteristics. Int J Nurs Pract 2015;21(3):313-320.' },
  { text: 'Robertson L, Evans C, Fowkes FGR. Epidemiology of chronic venous disease. Phlebology 2008;23(3):103-111.' },
  { text: 'Gloviczki P et al. Care of patients with varicose veins: SVS/AVF clinical practice guidelines. J Vasc Surg. 2011;53(5 Suppl):2S-48S.' },
  { text: 'Almeida JI et al. Radiofrequency ClosureFAST versus laser ablation (RECOVERY study). J Vasc Interv Radiol. 2009;20(6):752-759.' },
  { text: 'Rasmussen LH et al. RCT comparing endovenous laser ablation, foam sclerotherapy, and surgical stripping. Br J Surg. 2011;98(8):1079-1087.' },
  { text: 'Intersocietal Accreditation Commission vein standards.', url: 'https://www.intersocietal.org' },
  { text: 'NRC Health. Patient preference surveys (200,000+ consumers): convenience (52%) and choice (50%) ranked above insurance coverage (46%).' },
  { text: 'Davies AH et al. Management of chronic venous disease. Phlebology 2019;34(1S):4-15.' },
  { text: 'Hamdan A. Management of varicose veins and venous insufficiency. JAMA 2012;308(24):2612-2621.' },
  { text: 'Thackeray R et al. Social media in health promotion. Health Promotion Practice 2012;13(2):165-172.' },
  { text: 'Wittens C et al. ESVS clinical practice guidelines for chronic venous disease. Eur J Vasc Endovasc Surg 2015;49(6):678-737.' },
  { text: 'Varicose Veins Treatment Market \u2014 Global Supply & Demand Analysis, Growth Forecasts 2025-2037.', url: 'https://www.grandviewresearch.com/industry-analysis/varicose-vein-treatment-market' },
  { text: 'Kim Y et al. Human and health care costs of chronic venous insufficiency. Semin Vasc Surg 2021;34(1):59-64.', url: 'https://doi.org/10.1053/j.semvascsurg.2021.02.007' },
  { text: 'Meissner M. Venous Disease: Where are We Going. American College of Phlebology Annual Congress, Orlando, November 2015.' },
  { text: 'Vasquez MA, Munschauer CE. Venous Clinical Severity Score and QoL tools. Phlebology 2008;23:259-75.' },
  { text: 'Shepherd AC et al. Disease-specific QoL vs clinical assessments in varicose vein patients. J Vasc Surg 2011;53:374-82.' },
  { text: 'Launois R et al. CIVIQ quality of life questionnaire for chronic venous insufficiency. Qual Life Res 1996;5:539-54.' },
  { text: 'Mallick R et al. Treatment patterns and outcomes in patients with varicose veins. Am Health Drug Benefits 2016;9(8):455-465.' },
  { text: 'American Community Survey 2019-2023.', url: 'https://www.census.gov/programs-surveys/acs/' },
  { text: 'U.S. Census Bureau Population Estimates July 2024.', url: 'https://data.census.gov' },
  { text: 'Competitor analysis: Google, Yelp, state medical boards, Doximity, LinkedIn, Becton Dickinson proprietary data.' },
  { text: 'U.S. Census Bureau. Texas population 30.5M; podiatrist and dermatologist ratios consistent with national average (1 per 30,000).' },
  { text: 'Evans CJ et al. Prevalence of varicose veins and chronic venous insufficiency: Edinburgh Vein Study. J Epidemiol Community Health 1999.' },
  { text: 'Callam MJ. Epidemiology of varicose veins. Br J Surg 1994.' },
  { text: 'Mulita F et al. Demographic and clinical characteristics of varicose vein patients. Arch Med Sci Atheroscler Dis 2024;9(1):41-46. doi:10.5114/amsad/183653' },
  { text: 'Decker SL et al. Patient Travel Patterns and Geographic Market Boundaries. Ann Intern Med 2024;177:1732-1734.', url: 'https://doi.org/10.7326/ANNALS-24-00857' },
  { text: 'Burke J et al. Willingness of Older Adults to Travel for Medical Care. JAMA Netw Open 2026;9(2):e2560280. doi:10.1001/jamanetworkopen.2025.60280' },
]

export default function CitationsPage() {
  return (
    <div>
      <TopBar title="Citations & Methodology" />
      <div className="p-6 space-y-6">
        <Suspense fallback={<div className="text-gray-400 text-sm">Loading...</div>}>
          <CitationsTable />
        </Suspense>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-[#5faaa6]">Academic &amp; Industry References</h2>
          </div>
          <ol className="px-5 py-4 space-y-2.5 list-decimal list-inside">
            {REFERENCES.map((ref, i) => (
              <li key={i} className="text-sm text-gray-400 leading-relaxed">
                {ref.text}
                {ref.url && (
                  <>
                    {' '}
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5faaa6] hover:underline break-all"
                    >
                      {ref.url}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
