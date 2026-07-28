import { useCallback, useEffect, useState } from 'react'
import { useT } from '../state/settings'
import { useMicSettings } from '../state/mic'
import { P0Item } from './items/P0Item'
import { F2Item } from './items/F2Item'
import { item as itemById, type DrillItem } from '../scheduler/items'
import { recordAttempt } from '../scheduler/engine'
import { keyByTonic, randomKey, type KeyDef } from '../theory/keys'
import { parseStringSet, type Inversion } from '../lib/triads'
import { polyLastInference, polyLoadMs } from '../audio/input/poly'
import type { ChordQuality } from '../theory'
import type { ItemResult } from './items/E1Item'

// One drill item of each input tier, reachable directly from the microphone
// card.
//
// P0 and F2 otherwise live inside a session — right for practice, wrong for
// answering "is my mic set up?". These are the same drills and the same
// grading, and each attempt is recorded like any other, so checking the
// setup is never wasted practice.
//
// The two tiers fail for different reasons and so are checked separately: a
// single note is Tier 1 (MPM in a worklet, real time), a strummed triad is
// Tier 2 (Basic Pitch over a captured window). A working mono setup says
// nothing about whether the chord model will run well on this machine, which
// is why the chord check also reports what it measured — docs/phases.md open
// question 3 recorded its inference figure as a CPU-backend floor needing
// re-measurement on the target machine, and this is where that happens.

function pickNoteDrill() {
  const key = randomKey()
  const degree = 1 + Math.floor(Math.random() * 7)
  return itemById(`P0|${key.tonic}|${degree}`)
}

// Root-position major triads on the middle string set: the easiest thing F2
// serves, because this is a setup check rather than a difficulty test.
function pickChordDrill() {
  const key = randomKey()
  return itemById(`F2|${key.tonic}|maj|5-4-3|0`)
}

type Props = {
  onKeyChange: (key: KeyDef) => void
  onOpenCalibration: () => void
  onExit: () => void
}

type Tier = 'note' | 'chord'

export function MicCheck({ onKeyChange, onOpenCalibration, onExit }: Props) {
  const t = useT()
  const calibratedAt = useMicSettings((s) => s.calibratedAt)
  const [tier, setTier] = useState<Tier>('note')
  const [drill, setDrill] = useState<DrillItem>(pickNoteDrill)
  const [timings, setTimings] = useState<{ load: number | null; inference: { ms: number; audioSeconds: number } | null }>(
    { load: null, inference: null },
  )

  const itemKey = keyByTonic(String(drill.params.tonic ?? drill.params.root))

  useEffect(() => {
    onKeyChange(itemKey)
    // onKeyChange is a setState from the parent and stable enough; re-running
    // on every render would fight the parent's state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill.id])

  // Poll while the chord check is on screen: the model loads and grades in
  // the background, and these are the numbers the user came here to see.
  useEffect(() => {
    if (tier !== 'chord') return
    const id = setInterval(() => setTimings({ load: polyLoadMs(), inference: polyLastInference() }), 500)
    return () => clearInterval(id)
  }, [tier])

  function switchTier(next: Tier) {
    setTier(next)
    setDrill(next === 'note' ? pickNoteDrill() : pickChordDrill())
  }

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
  const chipOn =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--surface)]'

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

        <div className="flex flex-wrap gap-3">
          <button
            className={tier === 'note' ? chipOn : chip}
            aria-pressed={tier === 'note'}
            onClick={() => switchTier('note')}
          >
            {t('miccheck.tier.note')}
          </button>
          <button
            className={tier === 'chord' ? chipOn : chip}
            aria-pressed={tier === 'chord'}
            onClick={() => switchTier('chord')}
          >
            {t('miccheck.tier.chord')}
          </button>
        </div>

        <div className="mono text-[length:var(--fs-1)]">
          {tier === 'note' ? t('e1.keyIs', { key: itemKey.label }) : t('fretboard.rootIs', { key: itemKey.label })}
        </div>

        {tier === 'note' ? (
          <P0Item
            key={drill.id}
            itemKey={itemKey}
            degree={Number(drill.params.degree)}
            nextLabel={t('miccheck.again')}
            onResult={handleResult}
            onNext={() => setDrill(pickNoteDrill())}
            onOpenCalibration={onOpenCalibration}
          />
        ) : (
          <>
            <F2Item
              key={drill.id}
              root={itemKey}
              quality={String(drill.params.quality) as ChordQuality}
              stringSet={parseStringSet(String(drill.params.stringSet))}
              inversion={Number(drill.params.inversion) as Inversion}
              nextLabel={t('miccheck.again.chord')}
              onResult={handleResult}
              onNext={() => setDrill(pickChordDrill())}
              onOpenCalibration={onOpenCalibration}
            />
            {/* On the key field, so no ink-dim: a dimmed neutral over a
                full-chroma hue is exactly the contrast the design system
                spends its neutrals to avoid. */}
            <p className="mono text-[length:var(--fs-1)]">
              {timings.load === null
                ? t('miccheck.timings.pending')
                : timings.inference === null
                  ? t('miccheck.timings.loaded', { load: timings.load })
                  : t('miccheck.timings.full', {
                      load: timings.load,
                      grade: timings.inference.ms,
                      seconds: timings.inference.audioSeconds.toFixed(1),
                    })}
            </p>
          </>
        )}

        <button className={`${chip} self-start`} onClick={onExit}>
          {t('shell.back')}
        </button>
      </div>
    </div>
  )
}
