'use client'
import { useEffect, useRef, useState } from 'react'
import { playPageTurn } from '@/lib/paperSound'

interface Props {
  pageCount: number
  direction: 'forward' | 'back'
  onComplete: () => void
  active: boolean
}

export default function PageShuffleOverlay({
  pageCount, direction, onComplete, active
}: Props) {
  const [currentPage, setCurrentPage] = useState(0)
  const [turning, setTurning] = useState(false)
  const completedRef = useRef(false)

  useEffect(() => {
    if (!active) return
    completedRef.current = false
    setCurrentPage(0)
    setTurning(false)

    const timers: ReturnType<typeof setTimeout>[] = []

    for (let i = 0; i < pageCount; i++) {
      timers.push(setTimeout(() => {
        setCurrentPage(i)
        setTurning(false)
        timers.push(setTimeout(() => setTurning(true), 10))
        timers.push(setTimeout(() => playPageTurn(direction), 80))
      }, i * 150))
    }

    const totalDuration = (pageCount - 1) * 150 + 480
    timers.push(setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true
        onComplete()
      }
    }, totalDuration))

    return () => timers.forEach(t => clearTimeout(t))
  }, [active, pageCount, direction, onComplete])

  if (!active) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      pointerEvents: 'all',
      overflow: 'hidden',
      perspective: '1200px',
    }}>
      <div
        key={currentPage}
        style={{
          position: 'absolute',
          top: 0,
          right: direction === 'forward' ? 0 : undefined,
          left: direction === 'back' ? 0 : undefined,
          width: '50%',
          height: '100%',
          background: '#F5EDD9',
          transformOrigin: direction === 'forward' ? 'left center' : 'right center',
          transform: turning
            ? `rotateY(${direction === 'forward' ? '-120deg' : '120deg'})`
            : 'rotateY(0deg)',
          transition: 'transform 480ms ease-in-out',
          backfaceVisibility: 'hidden',
          boxShadow: direction === 'forward'
            ? '-4px 0 12px rgba(0,0,0,0.2)'
            : '4px 0 12px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  )
}
