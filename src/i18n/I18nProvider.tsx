import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { translations, type Lang, type TranslationKey } from './translations'

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
}

const Ctx = createContext<I18nCtx | undefined>(undefined)
const STORAGE_KEY = 'homsaep.lang'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem(STORAGE_KEY) as Lang) || 'lo',
  )

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = (l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l)
    setLangState(l)
  }

  const t = (key: TranslationKey) => translations[key]?.[lang] ?? String(key)

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
