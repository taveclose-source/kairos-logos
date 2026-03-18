'use client'

import { useEffect, useRef, useCallback } from 'react'
import { playPageTurn } from '@/lib/paperSound'

interface PageShuffleOverlayProps {
  active: boolean
  duration: number
  direction: 'forward' | 'back'
  onComplete: () => void
}

const PAGE_DURATION = 180
const PAGE_STAGGER = 120
const MAX_PAGES = 12

export default function PageShuffleOverlay({ active, duration, direction, onComplete }: PageShuffleOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const completedRef = useRef(false)
  const soundFiredRef = useRef<Set<number>>(new Set())

  const numPages = Math.min(MAX_PAGES, Math.max(1, Math.floor(duration / PAGE_STAGGER)))

  const getPagePath = useCallback((progress: number) => {
    const bendX = direction === 'forward' ? 400 - (progress * 400) : progress * 400
    const bendY = Math.sin(progress * Math.PI) * 80
    return `M 0,0 Q ${bendX},${bendY} 400,0 L 400,600 Q ${bendX},${600 - bendY} 0,600 Z`
  }, [direction])

  useEffect(() => {
    if (!active || !containerRef.current) return

    completedRef.current = false
    soundFiredRef.current = new Set()
    const container = containerRef.current
    const startTime = performance.now()

    // Create SVG elements directly in DOM
    const svgs: SVGSVGElement[] = []
    for (let i = 0; i < numPages; i++) {
      const ns = 'http://www.w3.org/2000/svg'
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
      grad.id = `pgo${i}`; grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0'); grad.setAttribute('x2', '1'); grad.setAttribute('y2', '0')
      const s1 = document.createElementNS(ns, 'stop'); s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', '#F5EDD9')
      const s2 = document.createElementNS(ns, 'stop'); s2.setAttribute('offset', '70%'); s2.setAttribute('stop-color', '#EDE0C4')
      const s3 = document.createElementNS(ns, 'stop'); s3.setAttribute('offset', '100%'); s3.setAttribute('stop-color', '#C8B89A')
      grad.append(s1, s2, s3)

      const shGrad = document.createElementNS(ns, 'linearGradient')
      shGrad.id = `sho${i}`; shGrad.setAttribute('x1', '0'); shGrad.setAttribute('y1', '0'); shGrad.setAttribute('x2', '1'); shGrad.setAttribute('y2', '0')
      const sh1 = document.createElementNS(ns, 'stop'); sh1.setAttribute('offset', '0%'); sh1.setAttribute('stop-color', 'rgba(0,0,0,0.3)')
      const sh2 = document.createElementNS(ns, 'stop'); sh2.setAttribute('offset', '100%'); sh2.setAttribute('stop-color', 'rgba(0,0,0,0)')
      shGrad.append(sh1, sh2)
      defs.append(grad, shGrad)

      const path = document.createElementNS(ns, 'path')
      path.id = `page-${i}`
      path.setAttribute('d', 'M 0,0 L 400,0 L 400,600 L 0,600 Z')
      path.setAttribute('fill', `url(#pgo${i})`)

      const shadow = document.createElementNS(ns, 'rect')
      shadow.id = `shadow-${i}`
      shadow.setAttribute('x', '0'); shadow.setAttribute('y', '0'); shadow.setAttribute('width', '40'); shadow.setAttribute('height', '600')
      shadow.setAttribute('fill', `url(#sho${i})`); shadow.setAttribute('opacity', '0')

      svg.append(defs, path, shadow)
      container.appendChild(svg)
      svgs.push(svg)
    }

    function animate(timestamp: number) {
      const elapsed = timestamp - startTime

      for (let i = 0; i < numPages; i++) {
        const pageElapsed = elapsed - i * PAGE_STAGGER
        if (pageElapsed < 0) { svgs[i].style.opacity = '0'; continue }
        const progress = Math.min(1, pageElapsed / PAGE_DURATION)

        svgs[i].style.opacity = progress >= 1 ? '0' : '1'
        const pathEl = svgs[i].querySelector(`#page-${i}`)
        if (pathEl) pathEl.setAttribute('d', getPagePath(progress))
        const shadowEl = svgs[i].querySelector(`#shadow-${i}`)
        if (shadowEl) shadowEl.setAttribute('opacity', String(Math.sin(progress * Math.PI) * 0.4))

        // Sound at peak
        if (progress >= 0.45 && progress <= 0.55 && !soundFiredRef.current.has(i)) {
          soundFiredRef.current.add(i)
          playPageTurn(direction)
        }
      }

      const lastPageEnd = (numPages - 1) * PAGE_STAGGER + PAGE_DURATION
      if (elapsed >= lastPageEnd && !completedRef.current) {
        completedRef.current = true
        container.style.opacity = '0'
        setTimeout(() => {
          // Cleanup SVGs
          svgs.forEach(s => s.remove())
          container.style.opacity = '1'
          onComplete()
        }, 150)
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
  }, [active, duration, direction, numPages, getPagePath, onComplete])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        pointerEvents: active ? 'all' : 'none',
        visibility: active ? 'visible' : 'hidden',
        opacity: active ? 1 : 0,
        transition: 'opacity 150ms ease',
      }}
    />
  )
}
