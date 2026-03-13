'use client'

import { useState, useMemo } from 'react'

type GlossaryTerm = {
  id: string
  kjv_term: string
  twi_term: string
  locked: boolean
  notes: string | null
  category: string
  strongs_number: string | null
  book_introduced: string | null
}

export default function GlossaryClient({ terms }: { terms: GlossaryTerm[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return terms
    const q = search.toLowerCase()
    return terms.filter(
      (t) =>
        t.kjv_term.toLowerCase().includes(q) ||
        t.twi_term.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (t.strongs_number && t.strongs_number.toLowerCase().includes(q))
    )
  }, [terms, search])

  const grouped = useMemo(() => {
    const map = new Map<string, GlossaryTerm[]>()
    for (const term of filtered) {
      const cat = term.category || 'Uncategorized'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(term)
    }
    return map
  }, [filtered])

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <p className="text-sm font-medium text-emerald-700 tracking-wide uppercase">
        Logos by Kai&rsquo;Ros
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold mt-2 mb-1">
        Translation Glossary
      </h1>
      <p className="text-gray-500 mb-6">
        Asante Twi theological vocabulary — KJV benchmark terms
      </p>

      {/* Methodology statement */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 mb-8 text-sm text-gray-600 leading-relaxed">
        <p>
          All translations are anchored to the{' '}
          <span className="font-medium text-gray-800">Scrivener 1894 Textus Receptus</span>{' '}
          with the King James Version as the English benchmark. Terms marked{' '}
          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            locked
          </span>{' '}
          are canonical and govern all AI-generated translations, ensuring consistency
          across the platform. No locked term may be altered without explicit approval.
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search terms, categories, or Strong's numbers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm
                     placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500
                     focus:border-emerald-500 transition-shadow"
        />
        {search && (
          <p className="mt-2 text-xs text-gray-400">
            {filtered.length} term{filtered.length !== 1 ? 's' : ''} matching &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-400 text-sm">No terms found.</p>
      ) : (
        <div className="space-y-10">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                {category}
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {items.length}
                </span>
              </h2>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                      <th className="pb-2 pr-4 font-medium">KJV English</th>
                      <th className="pb-2 pr-4 font-medium">Asante Twi</th>
                      <th className="pb-2 pr-4 font-medium">Strong&rsquo;s</th>
                      <th className="pb-2 pr-4 font-medium">Introduced</th>
                      <th className="pb-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((term) => (
                      <tr key={term.id} className="group">
                        <td className="py-2.5 pr-4 font-medium text-gray-900">
                          {term.kjv_term}
                          {term.locked && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium align-middle">
                              locked
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-700">{term.twi_term}</td>
                        <td className="py-2.5 pr-4 text-gray-400 font-mono text-xs">
                          {term.strongs_number || '—'}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-500">{term.book_introduced || '—'}</td>
                        <td className="py-2.5 text-gray-500 text-xs">{term.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {items.map((term) => (
                  <div
                    key={term.id}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900">{term.kjv_term}</p>
                        <p className="text-gray-700">{term.twi_term}</p>
                      </div>
                      {term.locked && (
                        <span className="shrink-0 inline-block px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium">
                          locked
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      {term.strongs_number && (
                        <span className="font-mono">{term.strongs_number}</span>
                      )}
                      {term.book_introduced && <span>{term.book_introduced}</span>}
                    </div>
                    {term.notes && (
                      <p className="mt-1.5 text-xs text-gray-500">{term.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-12 text-xs text-gray-400 text-center">
        {terms.length} terms across {new Set(terms.map((t) => t.category)).size} categories
      </p>
    </main>
  )
}
