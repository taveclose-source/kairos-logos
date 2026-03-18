'use client'

import { useEffect, useRef } from 'react'
import { playPageTurn } from '@/lib/paperSound'

interface PageShuffleOverlayProps {
  active: boolean
  pageCount: number
  direction: 'forward' | 'back'
  onComplete: () => void
}

const PAGE_DURATION = 180 // ms per page turn
const PAGE_STAGGER = 120  // ms between page starts

export default function PageShuffleOverlay({ active, pageCount, direction, onComplete }: PageShuffleOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const completedRef = useRef(false)
  const soundFiredRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!active || !containerRef.current) return

    completedRef.current = false
    soundFiredRef.current = new Set()
    const container = containerRef.current
    const startTime = performance.now()
    const ns = 'http://www.w3.org/2000/svg'
    const count = Math.min(pageCount, 20)

    // Create SVG pages
    const svgs: SVGSVGElement[] = []
    for (let i = 0; i < count; i++) {
      const svg = document.createElementNS(ns, 'svg')
      svg.setAttribute('viewBox', '0 0 400 600')
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
      Object.assign(svg.style, {
        position: 'absolute', top: '50%', left: '50%',
        transform: `translate(-50%, -50%) translateY(${i * 2}px)`,
        width: 'min(90vw, 450px)', height: 'min(80vh, 675px)',
        opacity: '0',
      })

      const defs = document.createElementNS(ns, 'defs')
      const grad = document.createElementNS(ns, 'linearGradient')
      grad.id = `pg${i}`
      grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0')
      grad.setAttribute('x2', '1'); grad.setAttribute('y2', '0')
      const stops = [
        { offset: '0%', color: '#F5EDD9' },
        { offset: '70%', color: '#EDE0C4' },
        { offset: '100%', color: '#C8B89A' },
      ]
      stops.forEach(s => {
        const stop = document.createElementNS(ns, 'stop')
        stop.setAttribute('offset', s.offset)
        stop.setAttribute('stop-color', s.color)
        grad.appendChild(stop)
      })
      defs.appendChild(grad)

      const path = document.createElementNS(ns, 'path')
      path.id = `path${i}`
      path.setAttribute('fill', `url(#pg${i})`)
      path.setAttribute('d', 'M 0,0 L 400,0 L 400,600 L 0,600 Z')

      const shadow = document.createElementNS(ns, 'rect')
      shadow.id = `sh${i}`
      shadow.setAttribute('x', '0'); shadow.setAttribute('y', '0')
      shadow.setAttribute('width', '40'); shadow.setAttribute('height', '600')
      shadow.setAttribute('fill', 'rgba(0,0,0,0.25)')
      shadow.setAttribute('opacity', '0')

      svg.appendChild(defs)
      svg.appendChild(path)
      svg.appendChild(shadow)
      container.appendChild(svg)
      svgs.push(svg)
    }

    function animate(timestamp: number) {
      const elapsed = timestamp - startTime

      for (let i = 0; i < count; i++) {
        const pageStart = i * PAGE_STAGGER
        const pageElapsed = elapsed - pageStart
        if (pageElapsed < 0) { svgs[i].style.opacity = '0'; continue }
        const progress = Math.min(1, pageElapsed / PAGE_DURATION)

        // Same bezier curl as PageTurn
        const bendX = direction === 'forward' ? 400 - (progress * 400) : progress * 400
        const bendY = Math.sin(progress * Math.PI) * 80
        const d = `M 0,0 Q ${bendX},${bendY} 400,0 L 400,600 Q ${bendX},${600 - bendY} 0,600 Z`

        svgs[i].style.opacity = progress >= 1 ? '0' : '1'
        const pathEl = svgs[i].querySelector(`#path${i}`)
        if (pathEl) pathEl.setAttribute('d', d)
        const shadowEl = svgs[i].querySelector(`#sh${i}`)
        if (shadowEl) shadowEl.setAttribute('opacity', String(Math.sin(progress * Math.PI) * 0.4))

        // Sound at peak (progress ~0.5)
        if (progress >= 0.45 && progress <= 0.55 && !soundFiredRef.current.has(i)) {
          soundFiredRef.current.add(i)
          playPageTurn(direction)
        }
      }

      const totalDuration = (count - 1) * PAGE_STAGGER + PAGE_DURATION
      if (elapsed >= totalDuration && !completedRef.current) {
        completedRef.current = true
        container.style.transition = 'opacity 100ms ease'
        container.style.opacity = '0'
        setTimeout(() => {
          svgs.forEach(s => s.remove())
          container.style.opacity = '1'
          container.style.transition = ''
          onComplete()
        }, 100)
        return
      }

      if (!completedRef.current) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(rafRef.current)
      svgs.forEach(s => s.remove())
    }
  }, [active, pageCount, direction, onComplete])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        pointerEvents: active ? 'all' : 'none',
        visibility: active ? 'visible' : 'hidden',
        opacity: active ? 1 : 0,
      }}
    />
  )
}
