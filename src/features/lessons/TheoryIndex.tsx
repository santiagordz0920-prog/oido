import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { useT } from '../../state/settings'
import { ALL_NODES, isAvailable } from '../../curriculum/graph'
import type { StringKey } from '../../i18n/strings'

// The theory track index (docs/curriculum.md §5): every T-track node in
// track order, styled like Home's cards. A single live query over nodeStats
// drives every card's state, which keeps this to one hook regardless of how
// many lessons exist (looping useNodeCompleted per row would violate the
// rules of hooks).

type Props = {
  onOpenLesson: (nodeId: string) => void
}

type CardState = 'available' | 'locked' | 'soon'

type CardView = {
  id: string
  state: CardState
  completed: boolean
  lockedBehind?: string
}

export function TheoryIndex({ onOpenLesson }: Props) {
  const t = useT()

  const views = useLiveQuery(async (): Promise<CardView[]> => {
    const stats = await db.nodeStats.toArray()
    const completedSet = new Set(stats.filter((s) => s.completedAt !== undefined).map((s) => s.nodeId))
    return ALL_NODES.filter((n) => n.track === 'T').map((n) => {
      const completed = completedSet.has(n.id)
      if (!n.hasContent) return { id: n.id, state: 'soon', completed }
      const available = isAvailable(n.id, (id) => completedSet.has(id))
      return {
        id: n.id,
        state: available ? 'available' : 'locked',
        completed,
        lockedBehind: available ? undefined : n.prerequisites[0],
      }
    })
  }, [])

  const card = 'border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] p-4 sm:p-6'
  const action =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--ground)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <h1 className="display text-[length:var(--fs-5)] leading-tight">{t('home.theory.title')}</h1>
      <p className="max-w-[65ch] text-[color:var(--ink-dim)]">{t('home.theory.body')}</p>

      {(views ?? []).map((v) => (
        <section key={v.id} className={card} style={v.state === 'soon' ? { opacity: 0.55 } : undefined}>
          <div className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {t('theory.index.eyebrow', { id: v.id })}
          </div>
          <h2 className="display mb-2 text-[length:var(--fs-4)] leading-tight">
            {t(`node.${v.id}.title` as StringKey)}
          </h2>
          {v.state === 'available' ? (
            <button className={action} onClick={() => onOpenLesson(v.id)}>
              {v.completed ? t('home.review') : t('home.start')}
            </button>
          ) : v.state === 'locked' ? (
            <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
              {t('home.locked', { id: v.lockedBehind ?? '' })}
            </p>
          ) : (
            <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">{t('theory.soon')}</p>
          )}
        </section>
      ))}
    </div>
  )
}
