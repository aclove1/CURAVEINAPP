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
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Assumption</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Model Value</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Source / Rationale</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Citation</th>
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
                    <span className="text-gray-600 text-xs">Internal</span>
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

export default function CitationsPage() {
  return (
    <div>
      <TopBar title="Citations & Methodology" />
      <div className="p-6">
        <Suspense fallback={<div className="text-gray-500 text-sm">Loading...</div>}>
          <CitationsTable />
        </Suspense>
      </div>
    </div>
  )
}
