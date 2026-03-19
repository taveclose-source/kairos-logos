'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

type Theme = 'classic' | 'modern'

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
}>({ theme: 'classic', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('classic')

  useEffect(() => {
    const load = async () => {
      const supabase = createSupabaseBrowser()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users').select('theme').eq('id', user.id).single()
        if (data?.theme) setThemeState(data.theme as Theme)
      } else {
        const stored = localStorage.getItem('logos_theme') as Theme
        if (stored) setThemeState(stored)
      }
    }
    load()
  }, [])

  const setTheme = async (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('logos_theme', t)
    const supabase = createSupabaseBrowser()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('users').update({ theme: t }).eq('id', user.id)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div data-theme={theme}>{children}</div>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
