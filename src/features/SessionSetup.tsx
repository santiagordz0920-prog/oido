import { useT } from '../state/settings'
import { MODE_ORDER, type SessionMode } from '../session/modes'

// Mode picker per docs/architecture.md §10.4. Mode is chosen at session
// start and determines the track mix.

type Props = {
  t2Complete: boolean
  onStart: (mode: SessionMode) => void
  onOpenT2: () => void
}

export function SessionSetup({ t2Complete, onStart, onOpenT2 }: Props) {
  const t = useT()
  const card = 'border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] p-4 text-left sm:p-6'
  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--ground)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <h1 className="display text-[length:var(--fs-5)] leading-tight">{t('session.pick.title')}</h1>
      <p className="max-w-[65ch] text-[color:var(--ink-dim)]">{t('session.pick.body')}</p>

      {!t2Complete ? (
        <div className={card}>
          <p className="mb-3 max-w-[65ch]">{t('session.locked')}</p>
          <button className={chip} onClick={onOpenT2}>
            {t('t2.title')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {MODE_ORDER.map((mode: SessionMode) => (
            <button key={mode} className={`${card} snap`} onClick={() => onStart(mode)}>
              <span className="mono block text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
                {t(`session.mode.${mode}.context`)}
              </span>
              <span className="display block text-[length:var(--fs-4)] leading-tight">
                {t(`session.mode.${mode}.name`)}
              </span>
              <span className="mt-1 block max-w-[40ch] text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
                {t(`session.mode.${mode}.detail`)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
