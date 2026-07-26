import { useState } from 'react'
import { useSettings, useT } from '../state/settings'
import type { KeyDef } from '../theory/keys'
import { CircleOfFifths } from './CircleOfFifths'

type Props = {
  activeKey: KeyDef
  onHome?: () => void
}

export function Header({ activeKey, onHome }: Props) {
  const t = useT()
  const { theme, reduceColor, toggleTheme, toggleLocale, toggleReduceColor } = useSettings()
  const [wheelOpen, setWheelOpen] = useState(false)

  const ctrl =
    'mono snap border border-[var(--ink-dim)] bg-[var(--surface)] px-2 py-1 text-[length:var(--fs-0)]'

  return (
    <header className="flex flex-wrap items-center gap-2 border-b-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2">
      {onHome ? (
        <button className={ctrl} onClick={onHome}>
          ← {t('shell.back')}
        </button>
      ) : null}
      <span className="display text-[length:var(--fs-4)] leading-none">{t('app.title')}</span>
      <button
        className="snap ml-1 bg-transparent"
        aria-label={t('shell.wheel.open', { key: activeKey.label })}
        onClick={() => setWheelOpen(true)}
      >
        <CircleOfFifths activeKey={activeKey} size={36} />
      </button>
      <span className="flex-1" />
      <button className={ctrl} onClick={toggleTheme}>
        {theme === 'light' ? t('shell.theme.toDark') : t('shell.theme.toLight')}
      </button>
      <button className={ctrl} onClick={toggleLocale}>
        {t('shell.language')}
      </button>
      <button className={ctrl} onClick={toggleReduceColor}>
        {reduceColor ? t('shell.reduceColor.on') : t('shell.reduceColor.off')}
      </button>

      {wheelOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ground)]/90 p-4"
          role="dialog"
          aria-label={t('shell.wheel.title')}
          onClick={() => setWheelOpen(false)}
        >
          <div
            className="border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-baseline justify-between gap-6">
              <span className="display text-[length:var(--fs-3)]">{t('shell.wheel.title')}</span>
              <button className={ctrl} onClick={() => setWheelOpen(false)}>
                {t('shell.wheel.close')}
              </button>
            </div>
            <CircleOfFifths activeKey={activeKey} size={280} showLabels />
          </div>
        </div>
      ) : null}
    </header>
  )
}
