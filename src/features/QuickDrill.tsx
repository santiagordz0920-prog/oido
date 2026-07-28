import { useCallback, useEffect, useState } from 'react'
import { useT } from '../state/settings'
import { useMicSettings } from '../state/mic'
import { P3Item } from './items/P3Item'
import { P4Item } from './items/P4Item'
import {
  item as itemById,
  P3_POOL_SIZE,
  P3_TARGETS,
  P4_POOL_SIZE,
  type DrillItem,
} from '../scheduler/items'
import { recordAttempt } from '../scheduler/engine'
import { CONSTRAINTS, type Constraint } from '../audio/input/improv'
import { keyByTonic, randomKey, type KeyDef } from '../theory/keys'
import type { ChordDegree } from '../theory'
import type { StringKey } from '../i18n/strings'
import type { ItemResult } from './items/E1Item'

// A way in to the two improvisation drills without sitting through a
// session (docs/curriculum.md §8 P3/P4).
//
// P3 and P4 live in the last block of a Bench session, eighteen minutes in.
// That is right for a session — you improvise once your ears are already
// warm — and wrong for everything else. A drill you cannot reach on purpose
// is a drill you will not practise, and practising is what the app is for.
//
// Same arrangement as the mic check: the same drills, the same grading, and
// the attempt is recorded like any other, so deliberate practice is never
// wasted practice. What is chosen here rather than scheduled is the thing
// worth choosing — which chord tone to chase, or which rung of the
// constraint ladder to work on.

type Track = 'p3' | 'p4'

function randomRank(poolSize: number): number {
  return Math.floor(Math.random() * poolSize)
}

function p3Drill(target: ChordDegree): DrillItem {
  return itemById(`P3|${randomKey().tonic}|${randomRank(P3_POOL_SIZE)}|${target}`)
}

function p4Drill(constraint: Constraint): DrillItem {
  return itemById(`P4|${randomKey().tonic}|${randomRank(P4_POOL_SIZE)}|${constraint}`)
}

type Props = {
  onKeyChange: (key: KeyDef) => void
  onOpenCalibration: () => void
  onExit: () => void
}

export function QuickDrill({ onKeyChange, onOpenCalibration, onExit }: Props) {
  const t = useT()
  const calibratedAt = useMicSettings((s) => s.calibratedAt)

  const [track, setTrack] = useState<Track>('p3')
  const [target, setTarget] = useState<ChordDegree>(3)
  const [constraint, setConstraint] = useState<Constraint>('guide')
  const [drill, setDrill] = useState<DrillItem>(() => p3Drill(3))

  const itemKey = keyByTonic(String(drill.params.tonic))

  useEffect(() => {
    onKeyChange(itemKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill.id])

  const handleResult = useCallback(
    (r: ItemResult) => {
      void recordAttempt({
        item: drill,
        correct: r.correct,
        latencyMs: r.latencyMs,
        inputMode: r.inputMode ?? 'tap',
        response: r.response,
      })
    },
    [drill],
  )

  function pickTrack(next: Track) {
    setTrack(next)
    setDrill(next === 'p3' ? p3Drill(target) : p4Drill(constraint))
  }

  function pickTarget(next: ChordDegree) {
    setTarget(next)
    setDrill(p3Drill(next))
  }

  function pickConstraint(next: Constraint) {
    setConstraint(next)
    setDrill(p4Drill(next))
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'
  const chipOn =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--surface)]'

  return (
    <div className="key-field flex-1 p-4">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div>
          <div className="mono text-[length:var(--fs-1)]">{t('quick.eyebrow')}</div>
          <h1 className="display text-[length:var(--fs-5)] leading-tight">{t('quick.title')}</h1>
        </div>
        <p className="max-w-[65ch]">{t('quick.body')}</p>

        {calibratedAt === null ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="max-w-[65ch]">{t('miccheck.needsCalibration')}</p>
            <button className={chip} onClick={onOpenCalibration}>
              {t('home.mic.calibrate')}
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button className={track === 'p3' ? chipOn : chip} aria-pressed={track === 'p3'} onClick={() => pickTrack('p3')}>
            {t('quick.track.p3')}
          </button>
          <button className={track === 'p4' ? chipOn : chip} aria-pressed={track === 'p4'} onClick={() => pickTrack('p4')}>
            {t('quick.track.p4')}
          </button>
        </div>

        {/* The variable worth choosing by hand: which tone to chase, or
            which rung of the constraint ladder to work on. */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="mono text-[length:var(--fs-1)]">
            {track === 'p3' ? t('quick.pickTarget') : t('quick.pickConstraint')}
          </span>
          {track === 'p3'
            ? P3_TARGETS.map((d) => (
                <button key={d} className={d === target ? chipOn : chip} onClick={() => pickTarget(d)}>
                  {d}
                </button>
              ))
            : CONSTRAINTS.map((c) => (
                <button key={c} className={c === constraint ? chipOn : chip} onClick={() => pickConstraint(c)}>
                  {t(`p4.prompt.${c}` as StringKey)}
                </button>
              ))}
        </div>

        <div className="mono text-[length:var(--fs-1)]">{t('e1.keyIs', { key: itemKey.label })}</div>

        {track === 'p3' ? (
          <P3Item
            key={drill.id}
            itemKey={itemKey}
            rank={Number(drill.params.rank)}
            target={Number(drill.params.target) as ChordDegree}
            nextLabel={t('quick.again')}
            onResult={handleResult}
            onNext={() => setDrill(p3Drill(target))}
            onOpenCalibration={onOpenCalibration}
          />
        ) : (
          <P4Item
            key={drill.id}
            itemKey={itemKey}
            rank={Number(drill.params.rank)}
            constraint={String(drill.params.constraint) as Constraint}
            nextLabel={t('quick.again')}
            onResult={handleResult}
            onNext={() => setDrill(p4Drill(constraint))}
            onOpenCalibration={onOpenCalibration}
          />
        )}

        <button className={`${chip} self-start`} onClick={onExit}>
          {t('shell.back')}
        </button>
      </div>
    </div>
  )
}
