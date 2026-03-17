'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { playPageTurn } from '@/lib/paperSound'

interface PageTurnProps {
  onNext: () => void
  onPrev: () => void
  children: React.ReactNode
}

export default function PageTurn({ onNext, onPrev, children }: PageTurnProps) {
  const ref = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startTime = useRef(0)
  const [turning, setTurning] = useState<'forward' | 'back' | null>(null)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('logos-page-hint-dismissed')
    if (!dismissed) setShowHint(true)
  }, [])

  const handleSwipe = useCallback((dx: number) => {
    if (Math.abs(dx) < 60) return
    const elapsed = Date.now() - startTime.current
    if (elapsed > 500) return

    const dir = dx < 0 ? 'forward' : 'back'
    setTurning(dir)
    playPageTurn(dir)

    if (showHint) {
      setShowHint(false)
      localStorage.setItem('logos-page-hint-dismissed', '1')
    }

    setTimeout(() => {
      setTurning(null)
      if (dir === 'forward') onNext()
      else onPrev()
    }, 380)
  }, [onNext, onPrev, showHint])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startTime.current = Date.now()
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startX.current
    handleSwipe(dx)
  }, [handleSwipe])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    startX.current = e.clientX
    startTime.current = Date.now()
  }, [])

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    const dx = e.clientX - startX.current
    handleSwipe(dx)
  }, [handleSwipe])

  return (
    <div
      ref={ref}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      className="relative"
      style={{ perspective: '1200px' }}
    >
      <div
        style={{
          transition: turning ? 'transform 380ms ease-in-out' : 'none',
          transformOrigin: turning === 'forward' ? 'left center' : 'right center',
          transform: turning === 'forward'
            ? 'rotateY(-90deg)'
            : turning === 'back'
              ? 'rotateY(90deg)'
              : 'rotateY(0deg)',
          backfaceVisibility: 'hidden',
        }}
      >
        {children}
      </div>

      {/* Page curl hint */}
      {showHint && (
        <div
          className="absolute bottom-4 right-4 pointer-events-none"
          style={{
            width: 0, height: 0,
            borderLeft: '20px solid transparent',
            borderBottom: '20px solid rgba(139,107,20,0.3)',
            animation: 'pageCurlPulse 8s ease-in-out infinite',
          }}
        />
      )}

      <style jsx>{`
        @keyframes pageCurlPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
