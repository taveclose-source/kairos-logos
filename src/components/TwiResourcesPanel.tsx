'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'

interface ChristallerEntry {
  twi_headword: string
  english_gloss: string
  part_of_speech: string | null
  root_word: string | null
  usage_examples: string | null
  dialect_notes: string | null
  related_forms: string[] | null
  christaller_page: number | null
}

interface EnglishTwiEntry {
  english_headword: string
  twi_equivalents: string[]
  usage_context: string | null
  basel_page: number | null
}

interface ScriptureUsage {
  occurrence_count: number
  book_breakdown: Record<string, number>
  sample_verses: { book: string; chapter: number; verse: number; twi_text: string; kjv_text: string }[]
}

interface GlossaryInfo {
  is_locked: boolean
  approved_rendering: string
  locked_by: string | null
  kjv_term: string
  notes: string | null
  category: string | null
}

interface StrongsLink {
  number: string
  original_word: string
  transliteration: string | null
  definition: string | null
  part_of_speech: string | null
}

interface TwiLookupResult {
  word: string
  christaller: ChristallerEntry | null
  english_twi: EnglishTwiEntry[] | null
  scripture_usage: ScriptureUsage | null
  glossary: GlossaryInfo | null
  strongs_link: StrongsLink | null
  kjv_english_word: string | null
  strongs_number: string | null
}

interface TwiResourcesPanelProps {
  word: string
  verseReference: string
  strongsNumber?: string
  glossaryTerm?: string
  onClose: () => void
  onJumpToStrongs?: (number: string, word: string) => void
}

type TabDef = { id: string; label: string }

export default function TwiResourcesPanel({ word, verseReference, strongsNumber, glossaryTerm, onClose, onJumpToStrongs }: TwiResourcesPanelProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const m = theme === 'modern'
  const panelBg = m ? '#FFFFFF' : '#F8F2E2'
  const textMain = m ? '#1A1A1A' : '#1A0A04'
  const labelColor = m ? '#888888' : '#8B5E10'
  const accentColor = m ? '#0F3460' : '#C8960A'
  const tabActive = m ? '#0F3460' : '#8B5E10'
  const lockGold = '#C8960A'

  const [data, setData] = useState<TwiLookupResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('')

  // Fetch all data on mount — always queries all five sources
  useEffect(() => {
    setLoading(true)
    fetch('/api/twi/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, strongs_number: strongsNumber, glossary_term: glossaryTerm }),
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [word, strongsNumber, glossaryTerm])

  // Set default tab once data loads
  useEffect(() => {
    if (loading || !data) return
    const tabs = buildTabs()
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data])

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const navigateTo = useCallback((book: string, chapter: number) => {
    onClose()
    router.push(`/bible/${encodeURIComponent(book)}/${chapter}`)
  }, [onClose, router])

  function buildTabs(): TabDef[] {
    if (!data) return []
    const tabs: TabDef[] = []
    if (data.christaller) tabs.push({ id: 'twi_def', label: 'Twi Definition' })
    if (data.english_twi && data.english_twi.length > 0) tabs.push({ id: 'english', label: 'English Equivalent' })
    if (data.scripture_usage) tabs.push({ id: 'scripture', label: 'Scripture Usage' })
    if (data.glossary) tabs.push({ id: 'glossary', label: 'Glossary' })
    if (data.strongs_link || data.strongs_number) tabs.push({ id: 'strongs', label: "Strong's Link" })
    // If no specific tabs, show at least a basic info tab
    if (tabs.length === 0) tabs.push({ id: 'info', label: 'Info' })
    return tabs
  }

  const tabs = buildTabs()

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '65vh', zIndex: 56, background: panelBg, borderTop: '2px solid rgba(139,107,20,0.4)', borderRadius: '12px 12px 0 0', boxShadow: '0 -4px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', animation: 'twiSlideUp 250ms ease-out' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(139,107,20,0.3)', borderRadius: 2, margin: '10px auto' }} />

        {/* Header */}
        <div style={{ padding: '0 1.25rem 0.75rem', textAlign: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(139,107,20,0.6)', display: 'block', marginBottom: 4 }}>
            Twi Resources
          </span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: textMain, display: 'block', marginBottom: 2 }}>
            {word}
          </span>
          {data?.kjv_english_word && (
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: labelColor, display: 'block' }}>
              KJV: &ldquo;{data.kjv_english_word}&rdquo;
            </span>
          )}
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'rgba(139,107,20,0.5)', display: 'block', marginTop: 2 }}>
            {verseReference}
          </span>
          {/* Glossary lock badge */}
          {data?.glossary?.is_locked && (
            <span style={{ display: 'inline-block', marginTop: 4, fontFamily: 'var(--font-ui)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', color: lockGold, background: 'rgba(200,150,10,0.08)', border: '1px solid rgba(200,150,10,0.3)', borderRadius: 3, padding: '2px 8px' }}>
              &#128274; Locked Term
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: labelColor, textAlign: 'center', padding: '2rem 0' }}>
            Looking up &ldquo;{word}&rdquo;...
          </p>
        )}

        {/* No data */}
        {!loading && tabs.length === 1 && tabs[0].id === 'info' && (
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: labelColor, textAlign: 'center', padding: '2rem 0' }}>
            No lexicon entries found for &ldquo;{word}&rdquo;
          </p>
        )}

        {/* Tabs */}
        {!loading && tabs.length > 0 && tabs[0].id !== 'info' && (
          <>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(139,107,20,0.2)', flexShrink: 0, padding: '0 1.25rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: activeTab === t.id ? textMain : labelColor, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 10px', borderBottom: activeTab === t.id ? `2px solid ${tabActive}` : '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap' }}>{t.label}</button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,107,20,0.3) transparent' }}>

              {/* ── TWI DEFINITION (Christaller) ── */}
              {activeTab === 'twi_def' && data?.christaller && (
                <div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: textMain, marginBottom: 4 }}>{data.christaller.twi_headword}</p>
                  {data.christaller.part_of_speech && (
                    <p style={{ fontFamily: 'var(--font-ui)', fontStyle: 'italic', fontSize: 11, color: labelColor, marginBottom: 8 }}>{data.christaller.part_of_speech}</p>
                  )}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor, marginBottom: 4 }}>English Gloss</p>
                    <p style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain, lineHeight: 1.8 }}>{data.christaller.english_gloss}</p>
                  </div>
                  {data.christaller.root_word && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor, marginBottom: 4 }}>Root Word</p>
                      <p style={{ fontFamily: 'var(--font-reading)', fontSize: 14, color: textMain }}>{data.christaller.root_word}</p>
                    </div>
                  )}
                  {data.christaller.usage_examples && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor, marginBottom: 4 }}>Usage Examples</p>
                      <p style={{ fontFamily: 'var(--font-reading)', fontSize: 14, color: textMain, lineHeight: 1.7, fontStyle: 'italic' }}>{data.christaller.usage_examples}</p>
                    </div>
                  )}
                  {data.christaller.dialect_notes && (
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: labelColor, marginTop: 6 }}>Dialect: {data.christaller.dialect_notes}</p>
                  )}
                  {data.christaller.related_forms && data.christaller.related_forms.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor, marginBottom: 4 }}>Related Forms</p>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: textMain }}>{data.christaller.related_forms.join(', ')}</p>
                    </div>
                  )}
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'rgba(139,107,20,0.4)', marginTop: 12, fontStyle: 'italic' }}>
                    Christaller&apos;s Dictionary of the Asante and Fante Language, 1881{data.christaller.christaller_page ? `, p.${data.christaller.christaller_page}` : ''}
                  </p>
                </div>
              )}

              {/* ── ENGLISH EQUIVALENT (Basel Mission) ── */}
              {activeTab === 'english' && data?.english_twi && (
                <div>
                  {data.english_twi.map((entry, i) => (
                    <div key={i} style={{ marginBottom: '1.25rem' }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: textMain, marginBottom: 4 }}>{entry.english_headword}</p>
                      <div style={{ marginBottom: 6 }}>
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor, marginBottom: 4 }}>Twi Equivalents</p>
                        <p style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain }}>
                          {entry.twi_equivalents.map((tw, j) => (
                            <span key={j}>
                              {j > 0 && ', '}
                              <span style={{ fontWeight: tw.toLowerCase() === word.toLowerCase() ? 700 : 400 }}>{tw}</span>
                            </span>
                          ))}
                        </p>
                      </div>
                      {entry.usage_context && (
                        <p style={{ fontFamily: 'var(--font-reading)', fontSize: 13, color: textMain, lineHeight: 1.7, opacity: 0.85 }}>{entry.usage_context}</p>
                      )}
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'rgba(139,107,20,0.4)', marginTop: 6, fontStyle: 'italic' }}>
                        English-Tshi Dictionary, Basel Evangelical Missionary Society{entry.basel_page ? `, p.${entry.basel_page}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* ── SCRIPTURE USAGE ── */}
              {activeTab === 'scripture' && data?.scripture_usage && (
                <div>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: labelColor, letterSpacing: '1px', marginBottom: '1rem' }}>
                    {data.scripture_usage.occurrence_count} occurrence{data.scripture_usage.occurrence_count !== 1 ? 's' : ''} in the Logos translation corpus
                  </p>
                  {/* Book breakdown */}
                  {data.scripture_usage.book_breakdown && Object.keys(data.scripture_usage.book_breakdown).length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor, marginBottom: 6 }}>By Book</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {Object.entries(data.scripture_usage.book_breakdown).map(([book, count]) => (
                          <span key={book} style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: textMain, background: 'rgba(139,107,20,0.06)', border: '1px solid rgba(139,107,20,0.15)', borderRadius: 3, padding: '2px 8px' }}>
                            {book}: {count as number}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Sample verses */}
                  {data.scripture_usage.sample_verses.length > 0 && (
                    <div>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor, marginBottom: 6 }}>Sample Verses</p>
                      {data.scripture_usage.sample_verses.map((v, i) => (
                        <button key={i} onClick={() => navigateTo(v.book, v.chapter)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 0', background: 'none', border: 'none', borderBottom: '0.5px solid rgba(139,107,20,0.15)', cursor: 'pointer' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: labelColor, letterSpacing: '2px' }}>{v.book} {v.chapter}:{v.verse}</span>
                          <p style={{ fontFamily: 'var(--font-reading)', fontSize: 13, color: textMain, lineHeight: 1.6, marginTop: 2 }}>{v.twi_text}</p>
                          <p style={{ fontFamily: 'var(--font-reading)', fontSize: 12, color: labelColor, lineHeight: 1.5, marginTop: 1, fontStyle: 'italic' }}>{v.kjv_text}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── GLOSSARY ── */}
              {activeTab === 'glossary' && data?.glossary && (
                <div>
                  {data.glossary.is_locked ? (
                    <div style={{ padding: '12px', background: 'rgba(200,150,10,0.04)', borderRadius: 6, border: '1px solid rgba(200,150,10,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>&#128274;</span>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: lockGold, letterSpacing: '1px', textTransform: 'uppercase' }}>Locked Term</span>
                      </div>
                      <p style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain, lineHeight: 1.8, marginBottom: 6 }}>
                        <strong>{data.glossary.approved_rendering}</strong> is the approved Twi rendering for &ldquo;{data.glossary.kjv_term}&rdquo;
                      </p>
                      {data.glossary.locked_by && (
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: labelColor }}>Locked by: {data.glossary.locked_by}</p>
                      )}
                      {data.glossary.notes && (
                        <p style={{ fontFamily: 'var(--font-reading)', fontSize: 13, color: textMain, lineHeight: 1.7, marginTop: 6, opacity: 0.85 }}>{data.glossary.notes}</p>
                      )}
                      {data.glossary.category && (
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: labelColor, marginTop: 4 }}>Category: {data.glossary.category}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain, lineHeight: 1.8 }}>
                        <strong>{data.glossary.approved_rendering || word}</strong> — KJV: &ldquo;{data.glossary.kjv_term}&rdquo;
                      </p>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: labelColor, marginTop: 6 }}>Not a locked term</p>
                      {data.glossary.notes && (
                        <p style={{ fontFamily: 'var(--font-reading)', fontSize: 13, color: textMain, lineHeight: 1.7, marginTop: 6, opacity: 0.85 }}>{data.glossary.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── STRONG'S LINK ── */}
              {activeTab === 'strongs' && (
                <div>
                  {data?.strongs_link ? (
                    <>
                      <div style={{ padding: '12px', background: 'rgba(139,107,20,0.04)', borderRadius: 6, border: '1px solid rgba(139,107,20,0.12)', marginBottom: '1rem' }}>
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: textMain, marginBottom: 4 }}>{data.strongs_link.original_word}</p>
                        {data.strongs_link.transliteration && (
                          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 15, color: accentColor, marginBottom: 4 }}>{data.strongs_link.transliteration}</p>
                        )}
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '3px', color: 'rgba(139,107,20,0.8)', marginBottom: 8 }}>{data.strongs_link.number}</p>
                        {data.strongs_link.part_of_speech && (
                          <p style={{ fontFamily: 'var(--font-ui)', fontStyle: 'italic', fontSize: 11, color: labelColor, marginBottom: 4 }}>{data.strongs_link.part_of_speech}</p>
                        )}
                        {data.strongs_link.definition && (
                          <p style={{ fontFamily: 'var(--font-reading)', fontSize: 14, color: textMain, lineHeight: 1.8 }}>
                            {data.strongs_link.definition.length > 300 ? data.strongs_link.definition.slice(0, 300) + '...' : data.strongs_link.definition}
                          </p>
                        )}
                      </div>
                      {/* Bridge button — jump to full Resources panel */}
                      <button
                        onClick={() => {
                          onJumpToStrongs?.(data.strongs_link!.number, data.kjv_english_word || word)
                          onClose()
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          width: '100%', padding: '10px 0',
                          fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase',
                          color: accentColor, background: 'rgba(139,107,20,0.06)',
                          border: '1px solid rgba(139,107,20,0.2)', borderRadius: 6,
                          cursor: 'pointer', transition: 'background 150ms',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,107,20,0.12)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(139,107,20,0.06)' }}
                      >
                        Open in Resources Panel &mdash; full {data.strongs_link.number.startsWith('H') ? 'Hebrew' : 'Greek'} depth
                      </button>
                    </>
                  ) : (
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: labelColor, textAlign: 'center', padding: '2rem 0' }}>
                      Strong&apos;s link not yet mapped for this word
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes twiSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
