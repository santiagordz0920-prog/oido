import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { useT } from '../../state/settings'
import { ALL_NODES, CHECKPOINT_GATES, isAvailable, prerequisitesMet } from '../../curriculum/graph'
import type { StringKey } from '../../i18n/strings'

// The theory track index (docs/curriculum.md §5): every T-track node in
// track order, styled like Home's cards. A single live query over nodeStats
// drives every card's state, which keeps this to one hook regardless of how
// many lessons exist (looping useNodeCompleted per row would violate the
// rules of hooks).
//
// A node whose only remaining gate is a stage checkpoint (CHECKPOINT_GATES,
// docs/curriculum.md "Stages and checkpoints") gets a distinct 'checkpoint'
// card state — its previous-lesson prerequisite is already satisfied, so it
// shows a "take the checkpoint" CTA instead of the generic locked line.

type Props = {
  onOpenLesson: (nodeId: string) => void
  onOpenCheckpoint: (checkpointId: string) => void
}

type CardState = 'available' | 'checkpoint' | 'locked' | 'soon'

type CardView = {
  id: string
  state: CardState
  completed: boolean
  lockedBehind?: string
  checkpointId?: string
  checkpointPassed: boolean
}

export function TheoryIndex({ onOpenLesson, onOpenCheckpoint }: Props) {
  const t = useT()

  const views = useLiveQuery(async (): Promise<CardView[]> => {
    const stats = await db.nodeStats.toArray()
    const completedSet = new Set(stats.filter((s) => s.completedAt !== undefined).map((s) => s.nodeId))
    const completed = (id: string) => completedSet.has(id)
    return ALL_NODES.filter((n) => n.track === 'T').map((n) => {
      const isComplete = completed(n.id)
      const checkpointId = CHECKPOINT_GATES[n.id]
      const checkpointPassed = checkpointId ? completed(checkpointId) : false
      if (!n.hasContent) return { id: n.id, state: 'soon', completed: isComplete, checkpointId, checkpointPassed }
      const available = isAvailable(n.id, completed)
      if (available) return { id: n.id, state: 'available', completed: isComplete, checkpointId, checkpointPassed }
      if (checkpointId && prerequisitesMet(n.id, completed)) {
        return { id: n.id, state: 'checkpoint', completed: isComplete, checkpointId, checkpointPassed }
      }
      return {
        id: n.id,
        state: 'locked',
        completed: isComplete,
        lockedBehind: n.prerequisites[0],
        checkpointId,
        checkpointPassed,
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
          ) : v.state === 'checkpoint' ? (
            <button className={action} onClick={() => onOpenCheckpoint(v.checkpointId!)}>
              {t('theory.checkpoint.cta', { id: v.checkpointId! })}
            </button>
          ) : v.state === 'locked' ? (
            <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
              {t('home.locked', { id: v.lockedBehind ?? '' })}
            </p>
          ) : (
            <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">{t('theory.soon')}</p>
          )}
          {v.checkpointId && v.checkpointPassed ? (
            <p className="mono mt-2 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
              {t('theory.checkpoint.passed', { id: v.checkpointId })}
            </p>
          ) : null}
        </section>
      ))}
    </div>
  )
}
