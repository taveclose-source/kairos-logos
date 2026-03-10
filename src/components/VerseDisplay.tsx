'use client'

import { useState } from 'react'

interface Verse {
  verse: number
  kjv_text: string
  twi_text: string | null
  has_twi: boolean
}

export default function VerseDisplay({
  verses,
  chapterHasTwi,
}: {
  verses: Verse[]
  chapterHasTwi: boolean
}) {
  const [showTwi, setShowTwi] = useState(chapterHasTwi)

  return (
    <>
      {/* Toggle */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <div className="hidden md:flex gap-8">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            King James Version
          </p>
          {showTwi && (
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Asante Twi
            </p>
          )}
        </div>
        <button
          onClick={() => setShowTwi(!showTwi)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showTwi
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
          }`}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${showTwi ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          {showTwi ? 'Hide Twi' : 'Show Twi'}
        </button>
      </div>

      {/* Verses */}
      {verses.length > 0 ? (
        <div className="space-y-4 sm:space-y-2">
          {verses.map((v) => (
            <div
              key={v.verse}
              className={`py-2 border-b border-gray-100 ${
                showTwi ? 'grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8' : ''
              }`}
            >
              {/* KJV Column */}
              <p className="text-base sm:text-lg leading-relaxed">
                <span className="font-semibold text-gray-400 mr-2 text-sm align-super">
                  {v.verse}
                </span>
                {v.kjv_text}
              </p>

              {/* Twi Column */}
              {showTwi && (
                <p className="text-base sm:text-lg leading-relaxed">
                  <span className="font-semibold text-gray-400 mr-2 text-sm align-super md:hidden">
                    {v.verse}
                  </span>
                  {v.twi_text ? (
                    v.twi_text
                  ) : (
                    <span className="italic text-gray-400">
                      Translation coming
                    </span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-red-500 py-8">
          No verses found. Check the data pipeline.
        </p>
      )}
    </>
  )
}
