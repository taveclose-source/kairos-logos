'use client'
import { useState, useRef, useCallback } from 'react'

const MIN_SIZE = 14
const MAX_SIZE = 28
const DEFAULT_SIZE = 18
const STORAGE_KEY = 'logos_reader_font_size'

export { MIN_SIZE, MAX_SIZE, DEFAULT_SIZE }

export function usePinchFontSize() {
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_SIZE
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? parseFloat(stored) : DEFAULT_SIZE
  })

  const initialDistance = useRef<number>(0)
  const initialFontSize = useRef<number>(DEFAULT_SIZE)

  const getDistance = (touches: React.TouchList | TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistance.current = getDistance(e.touches)
      initialFontSize.current = fontSize
    }
  }, [fontSize])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const currentDistance = getDistance(e.touches)
      const ratio = currentDistance / initialDistance.current
      const newSize = Math.min(MAX_SIZE, Math.max(MIN_SIZE,
        initialFontSize.current * ratio
      ))
      setFontSize(Math.round(newSize * 10) / 10)
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, fontSize.toString())
  }, [fontSize])

  const setAndSave = useCallback((size: number) => {
    const clamped = Math.min(MAX_SIZE, Math.max(MIN_SIZE, size))
    setFontSize(clamped)
    localStorage.setItem(STORAGE_KEY, clamped.toString())
  }, [])

  return { fontSize, setFontSize: setAndSave, onTouchStart, onTouchMove, onTouchEnd }
}
