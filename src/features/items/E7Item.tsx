import { useEffect, useRef, useState } from 'react'
import { useT } from '../../state/settings'
import { ensureAudio, playCadenceThenProgression, stop } from '../../audio/engine'
import type { KeyDef } from '../../theory/keys'
import { loadProgressionFrequency, topProgressions, type ProgressionEntry } from '../../curriculum/progressions'
import { distractorRanks, E7_POOL_SIZE } from '../../scheduler/items'
import type { ItemResult } from './E1Item'

// E7: two-chord motions, ordered by corpus frequency (docs/curriculum.md
// §6). The stimulus is a mode-aware cadence establishing the key, then the
// target two-chord motion (audio/engine.ts playCadenceThenProgression).
// Chips are four candidate motions rendered as e.g. "IV–I" (en dash): the
// correct one plus three distractors drawn from the same corpus-ordered
// pool, chosen deterministically by rank distance (scheduler/items.ts
// distractorRanks) so a replay always shows the same four chips. The
// progression table itself is loaded lazily (curriculum/progressions.ts);
// this item awaits that load before it can play or render, the same way it
// awaits the piano sample load.

type Phase = 'loading' | 'playing' | 'answering' | 'feedback'

type Props = {
  itemKey: KeyDef
  mode: 'major' | 'minor'
  rank: number
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
}

type Option = { rank: number; label: string }

// Roman-numeral accidentals read with the same glyphs as note names
// elsewhere in the app (theory/keys.ts displayNote) rather than a plain
// ASCII "b"/"#", which reads as a typo next to a Roman numeral.
function displayNumeral(n: string): string {
  return n.replace(/^b+/, (m) => '♭'.repeat(m.length)).replace(/^#+/, (m) => '♯'.repeat(m.length))
}

function motionLabel(numerals: string[]): string {
  return numerals.map(displayNumeral).join('–')
}

export function E7Item({ itemKey, mode, rank, nextLabel, onResult, onNext }: Props) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('loading')
  const [pool, setPool] = useState<ProgressionEntry[] | null>(null)
  const [options, setOptions] = useState<Option[]>([])
  const [picked, setPicked] = useState<Option | null>(null)
  const [audioError, setAudioError] = useState(false)
  const answerStart = useRef(0)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      stop()
    }
  }, [])

  async function withAudio(fn: () => Promise<void>) {
    try {
      setAudioError(false)
      await ensureAudio()
      await fn()
    } catch {
      if (mounted.current) setAudioError(true)
    }
  }

  function present(activePool: ProgressionEntry[]) {
    setPhase('playing')
    setPicked(null)
    void withAudio(async () => {
      await playCadenceThenProgression(itemKey.tonic, mode, activePool[rank].p)
      if (mounted.current) {
        answerStart.current = performance.now()
        setPhase('answering')
      }
    })
  }

  const itemId = `${itemKey.tonic}|${mode}|${rank}`
  useEffect(() => {
    let alive = true
    setPhase('loading')
    setPool(null)
    setOptions([])
    void loadProgressionFrequency().then((data) => {
      if (!alive) return
      const activePool = topProgressions(data, mode, 'two', E7_POOL_SIZE[mode])
      setPool(activePool)
      const ranks = [rank, ...distractorRanks(rank, E7_POOL_SIZE[mode], 3)].sort((a, b) => a - b)
      setOptions(ranks.map((r) => ({ rank: r, label: motionLabel(activePool[r].p) })))
      present(activePool)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  function replay() {
    if (pool) present(pool)
  }

  function handleAnswer(opt: Option) {
    if (phase !== 'answering') return
    setPicked(opt)
    setPhase('feedback')
    onResult({
      correct: opt.rank === rank,
      latencyMs: Math.round(performance.now() - answerStart.current),
      response: opt.label,
    })
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-6 py-3 text-[length:var(--fs-4)] font-bold'
  const smallChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  const correctLabel = pool ? motionLabel(pool[rank].p) : ''

  return (
    <>
      {phase === 'loading' ? (
        <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]" role="status">
          {t('e7.loading')}
        </p>
      ) : null}

      {phase === 'playing' ? (
        <p className="mono text-[length:var(--fs-3)]" role="status">
          {t('e7.listening')}
        </p>
      ) : null}

      {phase === 'answering' ? (
        <>
          <p className="display text-[length:var(--fs-4)]">{t('e7.prompt')}</p>
          <div className="flex flex-wrap gap-3">
            {options.map((opt) => (
              <button key={opt.rank} className={`${chip} text-[color:var(--ink)]`} onClick={() => handleAnswer(opt)}>
                {opt.label}
              </button>
            ))}
          </div>
          <button className={`${smallChip} self-start text-[color:var(--ink)]`} onClick={replay}>
            {t('e7.replay')}
          </button>
        </>
      ) : null}

      {phase === 'feedback' ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {picked?.rank === rank ? t('e7.correct', { motion: correctLabel }) : t('e7.incorrect', { motion: correctLabel })}
          </p>
          <div className="flex flex-wrap gap-3">
            <button className={`${smallChip} text-[color:var(--ink)]`} onClick={replay}>
              {t('e7.replay')}
            </button>
            <button className={`${smallChip} text-[color:var(--ink)]`} onClick={onNext}>
              {nextLabel}
            </button>
          </div>
        </>
      ) : null}

      {audioError ? (
        <p className="mono text-[length:var(--fs-1)]" role="alert">
          {t('audio.error')}
        </p>
      ) : null}
    </>
  )
}
