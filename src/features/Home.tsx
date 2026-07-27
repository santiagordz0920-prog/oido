import { useT } from '../state/settings'
import { useDueCount, useNodeCompleted } from '../state/progress'
import { CorpusCoverage } from './CorpusCoverage'

type Props = {
  onOpenT2: () => void
  onOpenE1: () => void
  onOpenSession: () => void
  onOpenConstellation: () => void
}

export function Home({ onOpenT2, onOpenE1, onOpenSession, onOpenConstellation }: Props) {
  const t = useT()
  const t2Complete = useNodeCompleted('T2')
  const due = useDueCount()

  const card = 'border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] p-4 sm:p-6'
  const action =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--ground)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <p className="max-w-[65ch] text-[color:var(--ink-dim)]">{t('app.tagline')}</p>
      {!t2Complete ? <p className="max-w-[65ch]">{t('home.empty')}</p> : null}

      <section className={card}>
        <CorpusCoverage />
      </section>

      <section className={card}>
        <div className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">{t('home.session.eyebrow')}</div>
        <h2 className="display mb-2 text-[length:var(--fs-4)] leading-tight">{t('home.session.title')}</h2>
        <p className="mb-3 max-w-[65ch]">{t('home.session.body')}</p>
        <div className="flex items-center gap-3">
          <button className={action} onClick={onOpenSession}>
            {t('home.session.start')}
          </button>
          {due > 0 ? (
            <span className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
              {t('home.due', { n: due })}
            </span>
          ) : null}
        </div>
      </section>

      <section className={card}>
        <div className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
          {t('home.lessons')} · {t('t2.eyebrow')}
        </div>
        <h2 className="display mb-2 text-[length:var(--fs-4)] leading-tight">{t('t2.title')}</h2>
        <div className="flex items-center gap-3">
          <button className={action} onClick={onOpenT2}>
            {t2Complete ? t('home.review') : t('home.start')}
          </button>
          {t2Complete ? (
            <span className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">{t('home.done')}</span>
          ) : null}
        </div>
      </section>

      <section className={card}>
        <div className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
          {t('home.drills')} · {t('e1.eyebrow')}
        </div>
        <h2 className="display mb-2 text-[length:var(--fs-4)] leading-tight">{t('e1.title')}</h2>
        {t2Complete ? (
          <button className={action} onClick={onOpenE1}>
            {t('home.start')}
          </button>
        ) : (
          <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {t('home.locked', { id: 'T2' })}
          </p>
        )}
      </section>

      <section className={card}>
        <div className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">{t('home.progress')}</div>
        <h2 className="display mb-2 text-[length:var(--fs-4)] leading-tight">{t('const.title')}</h2>
        <button className={action} onClick={onOpenConstellation}>
          {t('home.open')}
        </button>
      </section>
    </div>
  )
}
