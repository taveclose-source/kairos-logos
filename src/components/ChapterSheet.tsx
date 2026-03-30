'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getChapterCount } from '@/lib/verseCounts'
import { getChapterSummary } from '@/lib/chapterSummaries'

interface ChapterEntry { chapter: number; summary: string }

export default function ChapterSheet({ bookName, onClose }: { bookName: string; onClose: () => void }) {
  const chapters = useMemo<ChapterEntry[]>(() => {
    const count = getChapterCount(bookName)
    return Array.from({ length: count }, (_, i) => ({
      chapter: i + 1,
      summary: getChapterSummary(bookName, i + 1) || `${bookName} ${i + 1}`,
    }))
  }, [bookName])
  const loading = false
  const [fading, setFading] = useState(false)
  const router = useRouter()

  function handleChapterSelect(chapter: number) {
    router.prefetch(`/bible/${encodeURIComponent(bookName)}/${chapter}`)
    setFading(true)
    setTimeout(() => {
      router.push(`/bible/${encodeURIComponent(bookName)}/${chapter}`)
    }, 200)
  }

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 29, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: '70vh', zIndex: 30,
        background: '#F8F2E2',
        borderRadius: '16px 16px 0 0',
        borderTop: '2px solid rgba(139,107,20,0.4)',
        overflowY: 'auto',
        animation: 'sheetUp 300ms ease-out',
        opacity: fading ? 0 : 1,
        transition: 'opacity 200ms ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid rgba(139,107,20,0.25)' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#1A0A04' }}>{bookName}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8960A', fontSize: 20 }}>&times;</button>
        </div>

        {/* Chapters */}
        <div style={{ padding: '0.5rem 1rem' }}>
          {loading ? (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#C8960A', textAlign: 'center', padding: '2rem 0' }}>Loading...</p>
          ) : (
            chapters.map((c) => (
              <button
                key={c.chapter}
                onClick={() => handleChapterSelect(c.chapter)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 8px', background: 'transparent', border: 'none', borderBottom: '0.5px solid rgba(139,107,20,0.15)', cursor: 'pointer' }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '2px', color: '#C8960A', display: 'block', marginBottom: 2 }}>
                  CHAPTER {c.chapter}
                </span>
                <span style={{ fontFamily: 'var(--font-reading)', fontStyle: 'italic', fontSize: 13, color: '#1A0A04', lineHeight: 1.5, display: 'block' }}>
                  {c.summary}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Navigation handled via fade + setTimeout above */}

      <style jsx>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
