'use client'

import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import { playPageTurn } from '@/lib/paperSound'

export interface PageTurnHandle {
  triggerTurn: (direction: 'forward' | 'back') => void
}

interface PageTurnProps {
  onNext: () => void
  onPrev: () => void
  children: React.ReactNode
}

const PageTurn = forwardRef<PageTurnHandle, PageTurnProps>(function PageTurn({ onNext, onPrev, children }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startTime = useRef(0)
  const [turning, setTurning] = useState<'forward' | 'back' | null>(null)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('logos-page-hint-dismissed')
    if (!dismissed) setShowHint(true)
  }, [])

  const doTurn = useCallback((dir: 'forward' | 'back') => {
    if (turning) return
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
    }, 480)
  }, [onNext, onPrev, showHint, turning])

  useImperativeHandle(ref, () => ({
    triggerTurn: doTurn,
  }), [doTurn])

  const handleSwipe = useCallback((dx: number) => {
    if (Math.abs(dx) < 60) return
    const elapsed = Date.now() - startTime.current
    if (elapsed > 500) return
    doTurn(dx < 0 ? 'forward' : 'back')
  }, [doTurn])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startTime.current = Date.now()
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    handleSwipe(e.changedTouches[0].clientX - startX.current)
  }, [handleSwipe])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    startX.current = e.clientX
    startTime.current = Date.now()
  }, [])

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    handleSwipe(e.clientX - startX.current)
  }, [handleSwipe])

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      className="relative"
      style={{ perspective: '1200px' }}
    >
      <div
        style={{
          transition: turning ? 'transform 480ms ease-in-out' : 'none',
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
})

export default PageTurn
