'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

/* ── BPS-approved companion languages ────────────────────────── */

export interface BPSLanguage {
  code: string
  name: string
  active: boolean
}

export const BPS_LANGUAGES: BPSLanguage[] = [
  { code: 'twi', name: 'Asante Twi', active: true },
  { code: 'ar', name: 'Arabic', active: false },
  { code: 'km', name: 'Cambodian / Khmer', active: false },
  { code: 'zh-s', name: 'Chinese (Simplified)', active: false },
  { code: 'zh-t', name: 'Chinese (Traditional)', active: false },
  { code: 'hr', name: 'Croatian', active: false },
  { code: 'cs', name: 'Czech', active: false },
  { code: 'ee', name: 'Ewe', active: false },
  { code: 'fr', name: 'French', active: false },
  { code: 'de', name: 'German', active: false },
  { code: 'gn', name: 'Guarani', active: false },
  { code: 'ht', name: 'Haitian Creole', active: false },
  { code: 'hu', name: 'Hungarian', active: false },
  { code: 'it', name: 'Italian', active: false },
  { code: 'kn', name: 'Kannada', active: false },
  { code: 'ko', name: 'Korean', active: false },
  { code: 'mg', name: 'Malagasy', active: false },
  { code: 'ml', name: 'Malayalam', active: false },
  { code: 'mni', name: 'Manipuri', active: false },
  { code: 'pl', name: 'Polish', active: false },
  { code: 'pt', name: 'Portuguese', active: false },
  { code: 'ro', name: 'Romanian', active: false },
  { code: 'ru', name: 'Russian', active: false },
  { code: 'sr', name: 'Serbian', active: false },
  { code: 'es', name: 'Spanish', active: false },
  { code: 'sw', name: 'Swahili', active: false },
  { code: 'tl', name: 'Tagalog', active: false },
  { code: 'te', name: 'Telugu', active: false },
  { code: 'uk', name: 'Ukrainian', active: false },
  { code: 'vi', name: 'Vietnamese', active: false },
]

/* ── Context ─────────────────────────────────────────────────── */

const STORAGE_KEY = 'logos-companion-language'
const DEFAULT_LANG = 'twi'

interface LanguageContextValue {
  languageCode: string
  languageName: string
  setLanguage: (code: string) => void
}

const LanguageContext = createContext<LanguageContextValue>({
  languageCode: DEFAULT_LANG,
  languageName: 'Asante Twi',
  setLanguage: () => {},
})

export function useLanguage() {
  return useContext(LanguageContext)
}

/* ── Provider ────────────────────────────────────────────────── */

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [languageCode, setLanguageCode] = useState(DEFAULT_LANG)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && BPS_LANGUAGES.some((l) => l.code === stored)) {
      setLanguageCode(stored)
    }
    setHydrated(true)
  }, [])

  // On mount, if signed in, read preferred_language from Supabase
  useEffect(() => {
    if (!hydrated) return
    const supabase = createSupabaseBrowser()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('users')
        .select('preferred_language')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (
            data?.preferred_language &&
            BPS_LANGUAGES.some((l) => l.code === data.preferred_language)
          ) {
            setLanguageCode(data.preferred_language)
            localStorage.setItem(STORAGE_KEY, data.preferred_language)
          }
        })
    })
  }, [hydrated])

  const setLanguage = useCallback((code: string) => {
    const lang = BPS_LANGUAGES.find((l) => l.code === code)
    if (!lang || !lang.active) return

    setLanguageCode(code)
    localStorage.setItem(STORAGE_KEY, code)

    // Persist to Supabase for signed-in users (fire-and-forget)
    const supabase = createSupabaseBrowser()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('users')
        .update({ preferred_language: code })
        .eq('id', user.id)
        .then(() => {})
    })
  }, [])

  const languageName =
    BPS_LANGUAGES.find((l) => l.code === languageCode)?.name ?? 'Asante Twi'

  return (
    <LanguageContext.Provider value={{ languageCode, languageName, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}
