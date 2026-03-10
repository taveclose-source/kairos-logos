'use client'

import { useState } from 'react'
import { useLanguage, BPS_LANGUAGES } from '@/context/LanguageContext'

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
  const { languageCode, languageName, setLanguage } = useLanguage()

  // Auto-show companion column when the selected language has content
  // User can still manually hide/show
  const [showCompanion, setShowCompanion] = useState(
    languageCode === 'twi' ? chapterHasTwi : true
  )
  const [dropdownOpen, setDropdownOpen] = useState(false)

  function handleSelectLang(code: string, active: boolean) {
    if (!active) return
    setLanguage(code)
    setShowCompanion(true)
    setDropdownOpen(false)
  }

  return (
    <>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b flex-wrap gap-3">
        <div className="hidden md:flex gap-8">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider" title="King James Version">
            English
          </p>
          {showCompanion && (
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              {languageName}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-colors"
            >
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Companion</span>
              <span className="font-semibold">{languageName}</span>
              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1 z-20 w-56 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      Companion Translation
                    </p>
                    <p className="text-[10px] text-gray-400">
                      BPS-approved editions &middot; {BPS_LANGUAGES.length} languages
                    </p>
                  </div>
                  {BPS_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleSelectLang(lang.code, lang.active)}
                      disabled={!lang.active}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                        lang.active
                          ? lang.code === languageCode
                            ? 'bg-emerald-50 text-emerald-700 font-medium'
                            : 'hover:bg-gray-50 text-gray-700'
                          : 'text-gray-300 cursor-default'
                      }`}
                    >
                      <span>{lang.name}</span>
                      {lang.active && lang.code === languageCode && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                      {!lang.active && (
                        <span className="text-[10px] text-gray-300 italic">Coming soon</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Show/Hide toggle */}
          <button
            onClick={() => setShowCompanion(!showCompanion)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showCompanion
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <span className={`inline-block w-2 h-2 rounded-full ${showCompanion ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {showCompanion ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Verses */}
      {verses.length > 0 ? (
        <div className="space-y-4 sm:space-y-2">
          {verses.map((v) => (
            <div
              key={v.verse}
              className="py-2 border-b border-gray-100"
            >
              {/* Desktop: side-by-side grid / Mobile: stacked */}
              <div className={showCompanion ? 'md:grid md:grid-cols-2 md:gap-8' : ''}>
                {/* English Column */}
                <p className="text-base sm:text-lg leading-relaxed">
                  <span className="font-semibold text-gray-400 mr-2 text-sm align-super">
                    {v.verse}
                  </span>
                  {v.kjv_text}
                </p>

                {/* Companion Column — desktop */}
                {showCompanion && (
                  <p className="hidden md:block text-base sm:text-lg leading-relaxed">
                    {languageCode === 'twi' && v.twi_text ? (
                      v.twi_text
                    ) : (
                      <span className="italic text-gray-400">
                        Translation coming
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Companion — mobile: stacked below with label and visual distinction */}
              {showCompanion && (
                <div className="md:hidden mt-2 ml-4 pl-3 border-l-2 border-emerald-200 bg-emerald-50/40 rounded-r-lg py-2 pr-3">
                  <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
                    {languageName}
                  </span>
                  <p className="text-base leading-relaxed mt-0.5">
                    {languageCode === 'twi' && v.twi_text ? (
                      v.twi_text
                    ) : (
                      <span className="italic text-gray-400">
                        Translation coming
                      </span>
                    )}
                  </p>
                </div>
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
