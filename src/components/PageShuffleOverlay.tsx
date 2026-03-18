'use client'

import { useEffect, useState, useRef } from 'react'
import { playPageTurn } from '@/lib/paperSound'

interface PageShuffleOverlayProps {
  duration: number
  direction: 'forward' | 'back'
  onComplete: () => void
}

interface PageState {
  id: number
  progress: number // 0 to 1
  startTime: number
}

const PAGE_DURATION = 180 // ms per page peel
const PAGE_STAGGER = 120 // ms between page starts
const MAX_PAGES = 12

export default function PageShuffleOverlay({ duration, direction, onComplete }: PageShuffleOverlayProps) {
  const [pages, setPages] = useState<PageState[]>([])
  const [fading, setFading] = useState(false)
  const rafRef = useRef<number>(0)
  const startRef = useRef(Date.now())
  const completedRef = useRef(false)
  const soundFiredRef = useRef<Set<number>>(new Set())

  const numPages = Math.min(MAX_PAGES, Math.max(1, Math.floor(duration / PAGE_STAGGER)))

  useEffect(() => {
    startRef.current = Date.now()
    soundFiredRef.current = new Set()

    // Initialize pages
    const initialPages: PageState[] = []
    for (let i = 0; i < numPages; i++) {
      initialPages.push({ id: i, progress: 0, startTime: i * PAGE_STAGGER })
    }
    setPages(initialPages)

    function animate() {
      const elapsed = Date.now() - startRef.current

      setPages(prev => prev.map(p => {
        const pageElapsed = elapsed - p.startTime
        if (pageElapsed < 0) return { ...p, progress: 0 }
        const progress = Math.min(1, pageElapsed / PAGE_DURATION)
        return { ...p, progress }
      }))

      // Fire sound at peak of each page (progress ~0.5)
      for (let i = 0; i < numPages; i++) {
        const pageElapsed = elapsed - i * PAGE_STAGGER
        const progress = pageElapsed / PAGE_DURATION
        if (progress >= 0.45 && progress <= 0.55 && !soundFiredRef.current.has(i)) {
          soundFiredRef.current.add(i)
          playPageTurn(direction)
        }
      }

      // Check if all pages done
      const lastPageEnd = (numPages - 1) * PAGE_STAGGER + PAGE_DURATION
      if (elapsed >= lastPageEnd && !completedRef.current) {
        completedRef.current = true
        setFading(true)
        setTimeout(() => onComplete(), 150)
        return
      }

      if (!completedRef.current) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [duration, direction, numPages, onComplete])

  // Compute SVG page curl path
  function getPagePath(progress: number, dir: 'forward' | 'back') {
    // bendX: travels from right (400) to left (0)
    const rawBendX = dir === 'forward'
      ? 400 - (progress * 400)
      : progress * 400
    const bendX = rawBendX
    // bendY: arcs up at mid-turn (peak at progress=0.5)
    const bendY = Math.sin(progress * Math.PI) * 80
    const w = 400
    const h = 600

    return `M 0,0 Q ${bendX},${bendY} ${w},0 L ${w},${h} Q ${bendX},${h - bendY} 0,${h} Z`
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        pointerEvents: 'none',
        opacity: fading ? 0 : 1,
        transition: 'opacity 150ms ease',
      }}
    >
      {pages.map((p) => {
        if (p.progress <= 0) return null
        const shadowOpacity = Math.sin(p.progress * Math.PI) * 0.4

        return (
          <svg
            key={p.id}
            viewBox="0 0 400 600"
            preserveAspectRatio="xMidYMid meet"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) translateY(${p.id * 2}px)`,
              width: 'min(90vw, 450px)',
              height: 'min(80vh, 675px)',
              opacity: p.progress >= 1 ? 0 : 1,
            }}
          >
            <defs>
              <linearGradient id={`pg${p.id}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#F5EDD9" />
                <stop offset="70%" stopColor="#EDE0C4" />
                <stop offset="100%" stopColor="#C8B89A" />
              </linearGradient>
              <linearGradient id={`sh${p.id}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(0,0,0,0.3)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </linearGradient>
            </defs>
            <path
              d={getPagePath(p.progress, direction)}
              fill={`url(#pg${p.id})`}
            />
            <rect
              x="0" y="0" width="40" height="600"
              fill={`url(#sh${p.id})`}
              opacity={shadowOpacity}
            />
          </svg>
        )
      })}
    </div>
  )
}
