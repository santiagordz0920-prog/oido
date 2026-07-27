import { useCallback, useEffect, useState } from 'react'
import { useT } from '../state/settings'
import { useMicSettings } from '../state/mic'
import { P0Item } from './items/P0Item'
import { item as itemById } from '../scheduler/items'
import { recordAttempt } from '../scheduler/engine'
import { keyByTonic, randomKey, type KeyDef } from '../theory/keys'
import type { ItemResult } from './items/E1Item'

// One production item, reachable directly from the microphone card.
//
// P0 otherwise lives in a session's production block, which sits fifteen
// minutes into a Bench session — right for practice, wrong for answering
// "is my mic set up?". This is the same drill and the same grading, and the
// attempt is recorded like any other, so checking the setup is never wasted
// practice.

function pickDrill() {
  const key = randomKey()
  const degree = 1 + Math.floor(Math.random() * 7)
  return itemById(`P0|${key.tonic}|${degree}`)
}

type Props = {
  onKeyChange: (key: KeyDef) => void
  onOpenCalibration: () => void
  onExit: () => void
}

export function MicCheck({ onKeyChange, onOpenCalibration, onExit }: Props) {
  const t = useT()
  const calibratedAt = useMicSettings((s) => s.calibratedAt)
  const [drill, setDrill] = useState(pickDrill)

  const itemKey = keyByTonic(String(drill.params.tonic))

  useEffect(() => {
    onKeyChange(itemKey)
    // onKeyChange is a setState from the parent and stable enough; re-running
    // on every render would fight the parent's state.
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

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'

  return (
    <div className="key-field flex-1 p-4">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div>
          <div className="mono text-[length:var(--fs-1)]">{t('miccheck.eyebrow')}</div>
          <h1 className="display text-[length:var(--fs-5)] leading-tight">{t('miccheck.title')}</h1>
        </div>
        <p className="max-w-[65ch]">{t('miccheck.body')}</p>

        {calibratedAt === null ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="max-w-[65ch]">{t('miccheck.needsCalibration')}</p>
            <button className={chip} onClick={onOpenCalibration}>
              {t('home.mic.calibrate')}
            </button>
          </div>
        ) : null}

        <div className="mono text-[length:var(--fs-1)]">{t('e1.keyIs', { key: itemKey.label })}</div>

        <P0Item
          key={drill.id}
          itemKey={itemKey}
          degree={Number(drill.params.degree)}
          nextLabel={t('miccheck.again')}
          onResult={handleResult}
          onNext={() => setDrill(pickDrill())}
          onOpenCalibration={onOpenCalibration}
        />

        <button className={`${chip} self-start`} onClick={onExit}>
          {t('shell.back')}
        </button>
      </div>
    </div>
  )
}
