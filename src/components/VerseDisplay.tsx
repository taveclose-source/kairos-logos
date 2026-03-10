'use client'

import { useState } from 'react'

interface Verse {
  verse: number
  kjv_text: string
  twi_text: string | null
  has_twi: boolean
}

const BPS_LANGUAGES = [
  { code: 'twi', name: 'Asante Twi', active: true },
  { code: 'ar', name: 'Arabic', active: false },
  { code: 'km', name: 'Cambodian / Khmer', active: false },
  { code: 'zh-s', name: 'Chinese (Simplified)', active: false },
  { code: 'zh-t', name: 'Chinese (Traditional)', active: false },
  { code: 'hr', name: 'Croatian', active: false },
  { code: 'cs', name: 'Czech', active: false },
  { code: 'ee', name: 'Ewe', active: false },
  { code: 'fr', name: 'French', active: false },
  { code: 'de', name: 'German', active: false },
  { code: 'gn', name: 'Guarani', active: false },
  { code: 'ht', name: 'Haitian Creole', active: false },
  { code: 'hu', name: 'Hungarian', active: false },
  { code: 'it', name: 'Italian', active: false },
  { code: 'kn', name: 'Kannada', active: false },
  { code: 'ko', name: 'Korean', active: false },
  { code: 'mg', name: 'Malagasy', active: false },
  { code: 'ml', name: 'Malayalam', active: false },
  { code: 'mni', name: 'Manipuri', active: false },
  { code: 'pl', name: 'Polish', active: false },
  { code: 'pt', name: 'Portuguese', active: false },
  { code: 'ro', name: 'Romanian', active: false },
  { code: 'ru', name: 'Russian', active: false },
  { code: 'sr', name: 'Serbian', active: false },
  { code: 'es', name: 'Spanish', active: false },
  { code: 'sw', name: 'Swahili', active: false },
  { code: 'tl', name: 'Tagalog', active: false },
  { code: 'te', name: 'Telugu', active: false },
  { code: 'uk', name: 'Ukrainian', active: false },
  { code: 'vi', name: 'Vietnamese', active: false },
]

export default function VerseDisplay({
  verses,
  chapterHasTwi,
}: {
  verses: Verse[]
  chapterHasTwi: boolean
}) {
  const [showCompanion, setShowCompanion] = useState(chapterHasTwi)
  const [selectedLang, setSelectedLang] = useState('twi')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const currentLang = BPS_LANGUAGES.find((l) => l.code === selectedLang)

  function handleSelectLang(code: string, active: boolean) {
    if (!active) return
    setSelectedLang(code)
    setShowCompanion(true)
    setDropdownOpen(false)
  }

  return (
    <>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b flex-wrap gap-3">
        <div className="hidden md:flex gap-8">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            King James Version
          </p>
          {showCompanion && (
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              {currentLang?.name}
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
              <span className="font-semibold">{currentLang?.name}</span>
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
                          ? lang.code === selectedLang
                            ? 'bg-emerald-50 text-emerald-700 font-medium'
                            : 'hover:bg-gray-50 text-gray-700'
                          : 'text-gray-300 cursor-default'
                      }`}
                    >
                      <span>{lang.name}</span>
                      {lang.active && lang.code === selectedLang && (
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
              className={`py-2 border-b border-gray-100 ${
                showCompanion ? 'grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8' : ''
              }`}
            >
              {/* KJV Column */}
              <p className="text-base sm:text-lg leading-relaxed">
                <span className="font-semibold text-gray-400 mr-2 text-sm align-super">
                  {v.verse}
                </span>
                {v.kjv_text}
              </p>

              {/* Companion Column */}
              {showCompanion && (
                <p className="text-base sm:text-lg leading-relaxed">
                  <span className="font-semibold text-gray-400 mr-2 text-sm align-super md:hidden">
                    {v.verse}
                  </span>
                  {selectedLang === 'twi' && v.twi_text ? (
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
