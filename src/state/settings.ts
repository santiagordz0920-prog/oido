import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { translate, type Locale, type StringKey } from '../i18n/strings'

type Theme = 'light' | 'dark'

type SettingsState = {
  theme: Theme
  locale: Locale
  reduceColor: boolean
  toggleTheme: () => void
  toggleLocale: () => void
  toggleReduceColor: () => void
}

function systemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: systemTheme(),
      locale: 'es',
      reduceColor: false,
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      toggleLocale: () => set((s) => ({ locale: s.locale === 'es' ? 'en' : 'es' })),
      toggleReduceColor: () => set((s) => ({ reduceColor: !s.reduceColor })),
    }),
    { name: 'oido-settings' },
  ),
)

// Convenience hook: t('key', {vars}) bound to the active locale.
export function useT() {
  const locale = useSettings((s) => s.locale)
  return (key: StringKey, vars?: Record<string, string | number>) => translate(locale, key, vars)
}
