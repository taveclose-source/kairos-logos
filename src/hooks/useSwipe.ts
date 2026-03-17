import { useRef, useCallback } from 'react'

export function useSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  threshold = 60
) {
  const startX = useRef<number>(0)
  const startY = useRef<number>(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = startX.current - e.changedTouches[0].clientX
    const dy = Math.abs(startY.current - e.changedTouches[0].clientY)
    if (dy > 60) return
    if (dx > threshold) onSwipeLeft()
    if (dx < -threshold) onSwipeRight()
  }, [onSwipeLeft, onSwipeRight, threshold])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    startX.current = e.clientX
  }, [])

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    const dx = startX.current - e.clientX
    if (Math.abs(dx) > threshold + 20) {
      if (dx > 0) onSwipeLeft()
      else onSwipeRight()
    }
  }, [onSwipeLeft, onSwipeRight, threshold])

  return { onTouchStart, onTouchEnd, onMouseDown, onMouseUp }
}
