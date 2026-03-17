'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import PageTurn from '@/components/PageTurn'
import { playPageTurn } from '@/lib/paperSound'

interface Verse {
  verse: number
  kjv_text: string
  twi_text: string | null
  has_twi: boolean
}

interface BibleReaderProps {
  verses: Verse[]
  bookName: string
  chapter: number
  totalChapters: number
  prevHref: string | null
  nextHref: string | null
}

function cleanKjvText(text: string): string {
  return text.replace(/\s*\{[^}]*\}\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

export default function BibleReader({ verses, bookName, chapter, totalChapters, prevHref, nextHref }: BibleReaderProps) {
  const router = useRouter()
  const { languageName } = useLanguage()
  const chapterHasTwi = verses.some((v) => v.twi_text !== null)
  const progress = totalChapters > 0 ? (chapter / totalChapters) * 100 : 0

  const goNext = useCallback(() => {
    if (nextHref) router.push(nextHref)
  }, [nextHref, router])

  const goPrev = useCallback(() => {
    if (prevHref) router.push(prevHref)
  }, [prevHref, router])

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' && nextHref) { playPageTurn('forward'); router.push(nextHref) }
      if (e.key === 'ArrowLeft' && prevHref) { playPageTurn('back'); router.push(prevHref) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [nextHref, prevHref, router])

  return (
    <div style={{ background: 'var(--bg-primary)', padding: '2rem 1rem' }} className="relative">
      {/* Fixed side arrows — desktop only */}
      <button
        onClick={() => { if (prevHref) { playPageTurn('back'); goPrev() } }}
        className="hidden md:flex items-center justify-center fixed z-20 transition-colors duration-200"
        style={{
          left: 'calc(50% - 480px)',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(200,169,110,0.12)',
          border: '1px solid rgba(200,169,110,0.3)',
          color: 'var(--gold)',
          cursor: prevHref ? 'pointer' : 'default',
          opacity: prevHref ? 1 : 0.3,
          pointerEvents: prevHref ? 'auto' : 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(200,169,110,0.25)'; e.currentTarget.style.borderColor = 'var(--gold)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(200,169,110,0.12)'; e.currentTarget.style.borderColor = 'rgba(200,169,110,0.3)' }}
        aria-label="Previous chapter"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M14 8L8 12L14 16" />
        </svg>
      </button>
      <button
        onClick={() => { if (nextHref) { playPageTurn('forward'); goNext() } }}
        className="hidden md:flex items-center justify-center fixed z-20 transition-colors duration-200"
        style={{
          right: 'calc(50% - 480px)',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(200,169,110,0.12)',
          border: '1px solid rgba(200,169,110,0.3)',
          color: 'var(--gold)',
          cursor: nextHref ? 'pointer' : 'default',
          opacity: nextHref ? 1 : 0.3,
          pointerEvents: nextHref ? 'auto' : 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(200,169,110,0.25)'; e.currentTarget.style.borderColor = 'var(--gold)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(200,169,110,0.12)'; e.currentTarget.style.borderColor = 'rgba(200,169,110,0.3)' }}
        aria-label="Next chapter"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M10 8L16 12L10 16" />
        </svg>
      </button>

      <PageTurn onNext={goNext} onPrev={goPrev}>
        {/* Parchment book */}
        <div
          className="mx-auto relative"
          style={{
            maxWidth: '900px',
            background: 'var(--bg-warm)',
            borderRadius: '4px',
            boxShadow: '-8px 0 20px rgba(0,0,0,0.5), 8px 0 20px rgba(0,0,0,0.3), 0 4px 40px rgba(0,0,0,0.6)',
          }}
        >
          {/* Spine line — desktop only */}
          <div
            className="hidden lg:block absolute top-0 bottom-0 left-1/2 pointer-events-none"
            style={{
              width: '1px',
              background: 'linear-gradient(to bottom, transparent, rgba(139,107,20,0.3) 10%, rgba(139,107,20,0.3) 90%, transparent)',
            }}
          />

          <div className="px-6 py-8 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
            {/* Chapter heading */}
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '4px', color: 'var(--gold-muted)', textTransform: 'uppercase', textAlign: 'center', marginBottom: '0.5rem' }}>
              {bookName}
            </p>
            <p style={{ fontFamily: 'var(--font-reading)', fontSize: '11px', letterSpacing: '3px', color: '#8B6914', textTransform: 'uppercase', textAlign: 'center', marginBottom: '2.5rem' }}>
              Chapter {chapter}
            </p>

            {/* Two-column layout on desktop */}
            <div className={chapterHasTwi ? 'lg:grid lg:grid-cols-2 lg:gap-0' : ''}>
              {/* KJV Column */}
              <div className={chapterHasTwi ? 'lg:pr-8' : ''}>
                {verses.map((v, i) => {
                  const text = cleanKjvText(v.kjv_text)
                  if (i === 0 && text.length > 0) {
                    const firstLetter = text[0]
                    const rest = text.slice(1)
                    return (
                      <span key={v.verse} style={{ fontFamily: 'var(--font-reading)', fontSize: '18px', fontWeight: 400, color: '#2C1810', lineHeight: 1.9 }}>
                        <span style={{ float: 'left', fontFamily: 'var(--font-display)', fontSize: '72px', lineHeight: 0.75, paddingRight: '8px', paddingTop: '4px', color: 'var(--gold-muted)' }}>
                          {firstLetter}
                        </span>
                        {rest}{' '}
                      </span>
                    )
                  }
                  return (
                    <span key={v.verse} style={{ fontFamily: 'var(--font-reading)', fontSize: '18px', fontWeight: 400, color: '#2C1810', lineHeight: 1.9 }}>
                      <sup style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', fontWeight: 500, color: '#8B6914', verticalAlign: 'super', marginRight: '3px', letterSpacing: '0.5px' }}>
                        {v.verse}
                      </sup>
                      {text}{' '}
                    </span>
                  )
                })}
              </div>

              {/* Twi Column — desktop */}
              {chapterHasTwi && (
                <div className="hidden lg:block" style={{ borderLeft: '1px solid rgba(139,107,20,0.2)', paddingLeft: '2rem' }}>
                  {verses.map((v) => (
                    <span key={v.verse} style={{ fontFamily: 'var(--font-reading)', fontSize: '16px', fontWeight: 400, color: '#3C2415', lineHeight: 1.9 }}>
                      <sup style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', fontWeight: 500, color: '#8B6914', verticalAlign: 'super', marginRight: '3px', letterSpacing: '0.5px' }}>
                        {v.verse}
                      </sup>
                      {v.twi_text || ''}{' '}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Twi — mobile toggle */}
            {chapterHasTwi && (
              <details className="lg:hidden mt-6">
                <summary style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#8B6914', cursor: 'pointer' }}>
                  Show {languageName}
                </summary>
                <div className="mt-4" style={{ borderTop: '1px solid rgba(139,107,20,0.2)', paddingTop: '1rem' }}>
                  {verses.map((v) => (
                    <span key={v.verse} style={{ fontFamily: 'var(--font-reading)', fontSize: '16px', fontWeight: 400, color: '#3C2415', lineHeight: 1.9 }}>
                      <sup style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', fontWeight: 500, color: '#8B6914', verticalAlign: 'super', marginRight: '3px' }}>
                        {v.verse}
                      </sup>
                      {v.twi_text || ''}{' '}
                    </span>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ height: '2px', background: 'rgba(139,107,20,0.1)', borderRadius: '0 0 4px 4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--gold)', borderRadius: '1px', transition: 'width 300ms ease' }} />
          </div>
        </div>
      </PageTurn>

      {/* Navigation below parchment */}
      <div className="max-w-[900px] mx-auto flex items-center justify-between mt-6 px-2">
        {prevHref ? (
          <button onClick={goPrev} className="transition-colors duration-200 hover:text-[var(--gold)]" style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            &larr; Previous Chapter
          </button>
        ) : <span />}
        <span className="hidden sm:inline" style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '1px' }}>
          Use arrow keys to navigate
        </span>
        {nextHref ? (
          <button onClick={goNext} className="transition-colors duration-200 hover:text-[var(--gold)]" style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Next Chapter &rarr;
          </button>
        ) : <span />}
      </div>
    </div>
  )
}
