'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

export interface GlossaryTerm {
  id: string
  kjv_term: string
  twi_term: string
  locked: boolean
  notes: string | null
  category: string
  strongs_number: string | null
  book_introduced: string | null
}

interface GlossaryModalProps {
  term: GlossaryTerm
  onClose: () => void
}

export default function GlossaryModal({ term, onClose }: GlossaryModalProps) {
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div
        ref={popupRef}
        className="relative z-50 w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[70vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 rounded-t-2xl flex items-start justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900">{term.twi_term}</p>
            <p className="text-sm text-gray-500">{term.kjv_term}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {term.category && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Category</p>
              <p className="text-sm text-gray-700">{term.category}</p>
            </div>
          )}

          {term.strongs_number && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Strong&apos;s Number</p>
              <p className="text-sm text-amber-600 font-mono font-medium">{term.strongs_number}</p>
            </div>
          )}

          {term.book_introduced && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Book Introduced</p>
              <p className="text-sm text-gray-700">{term.book_introduced}</p>
            </div>
          )}

          {term.notes && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-gray-700 leading-relaxed">{term.notes}</p>
            </div>
          )}

          {term.locked && (
            <div className="flex items-center gap-1.5 pt-1">
              <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium">
                locked
              </span>
              <span className="text-xs text-gray-400">Canonical term — governs all translations</span>
            </div>
          )}

          <div className="pt-3 border-t border-gray-100">
            <Link
              href="/glossary"
              className="block w-full text-center px-4 py-2.5 rounded-xl bg-gray-50 text-gray-600 font-medium text-sm border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              View full glossary
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
