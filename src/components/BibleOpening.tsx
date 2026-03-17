'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { playPageTurn } from '@/lib/paperSound'
import BibleTOC from '@/components/BibleTOC'

type Stage = 'opening' | 'toc' | 'shuffling'

export default function BibleOpening({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>('opening')
  const [coverAngle, setCoverAngle] = useState(0)
  const [tocVisible, setTocVisible] = useState(false)
  const [shuffling, setShuffling] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!isOpen) return

    // Step 1+2: open covers
    const t1 = setTimeout(() => {
      playPageTurn('forward')
      setCoverAngle(160)
    }, 200)

    // Step 3: show TOC
    const t2 = setTimeout(() => {
      setStage('toc')
      setTocVisible(true)
    }, 700)

    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [isOpen])

  const handleChapterSelect = useCallback((book: string, chapter: number) => {
    setStage('shuffling')
    setShuffling(true)

    // Rapid page sounds
    playPageTurn('forward')
    setTimeout(() => playPageTurn('forward'), 120)
    setTimeout(() => playPageTurn('forward'), 240)

    // Navigate
    setTimeout(() => {
      router.push(`/bible/${encodeURIComponent(book)}/${chapter}`)
    }, 360)
  }, [router])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 45, background: '#4A2008', overflow: 'hidden' }}>
      {/* Covers opening */}
      {stage === 'opening' && (
        <div style={{ position: 'absolute', inset: 0, perspective: '1200px', transform: 'scale(0.96)', transition: 'transform 300ms ease-in' }}>
          {/* Front cover — opens left */}
          <div style={{
            position: 'absolute', top: 8, bottom: 8, left: 18, width: 'calc(50% - 15px)',
            backgroundColor: '#6B3515', backgroundImage: 'var(--leather-texture)',
            transformOrigin: 'left center',
            transform: `perspective(1200px) rotateY(-${coverAngle}deg)`,
            transition: 'transform 600ms ease-in-out',
            backfaceVisibility: 'hidden',
            zIndex: 2,
          }} />
          {/* Back cover — opens right */}
          <div style={{
            position: 'absolute', top: 8, bottom: 8, right: 12, width: 'calc(50% - 15px)',
            backgroundColor: '#6B3515', backgroundImage: 'var(--leather-texture)',
            transformOrigin: 'right center',
            transform: `perspective(1200px) rotateY(${coverAngle}deg)`,
            transition: 'transform 600ms ease-in-out',
            backfaceVisibility: 'hidden',
            zIndex: 2,
          }} />
        </div>
      )}

      {/* TOC */}
      {(stage === 'toc' || stage === 'shuffling') && (
        <div
          className="absolute inset-0 flex items-center justify-center p-4 overflow-y-auto"
          style={{
            opacity: tocVisible && !shuffling ? 1 : 0,
            transform: tocVisible && !shuffling ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 400ms ease-out, transform 400ms ease-out',
          }}
        >
          <BibleTOC onSelect={handleChapterSelect} onClose={onClose} />
        </div>
      )}

      {/* Page shuffle animation */}
      {shuffling && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '60%', height: '70%',
                background: 'var(--bg-warm)',
                borderRadius: 4,
                animation: `pageFan 400ms ease-in-out ${i * 80}ms forwards`,
              }}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes pageFan {
          0% { transform: rotateY(0deg); opacity: 1; }
          50% { transform: perspective(600px) rotateY(-15deg); opacity: 0.7; }
          100% { transform: rotateY(0deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
