'use client'

import { useTheme } from '@/contexts/ThemeContext'
import ModernBottomNav from '@/components/ModernBottomNav'

export default function ThemeNav() {
  const { theme } = useTheme()
  if (theme !== 'modern') return null
  return <ModernBottomNav />
}
