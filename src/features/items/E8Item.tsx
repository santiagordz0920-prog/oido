import { useEffect, useRef, useState } from 'react'
import { useT } from '../../state/settings'
import { ensureAudio, playCadenceThenProgression, stop } from '../../audio/engine'
import type { KeyDef } from '../../theory/keys'
import { loadProgressionFrequency, topProgressions, type ProgressionEntry } from '../../curriculum/progressions'
import { distractorRanks, E8_POOL_SIZE } from '../../scheduler/items'
import type { ItemResult } from './E1Item'

// E8: four-bar progressions, ordered by corpus frequency, top 10 first
// (docs/curriculum.md §6). Same shape as E7 (see the comment there) but
// over four-chord progressions, so chip labels read e.g. "I–IV–V–I" and can
// need to wrap onto a second line — the answer chip keeps its usual class
// but drops to a smaller size for the longer label.

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

function displayNumeral(n: string): string {
  return n.replace(/^b+/, (m) => '♭'.repeat(m.length)).replace(/^#+/, (m) => '♯'.repeat(m.length))
}

function motionLabel(numerals: string[]): string {
  return numerals.map(displayNumeral).join('–')
}

export function E8Item({ itemKey, mode, rank, nextLabel, onResult, onNext }: Props) {
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
      const activePool = topProgressions(data, mode, 'four', E8_POOL_SIZE[mode])
      setPool(activePool)
      const ranks = [rank, ...distractorRanks(rank, E8_POOL_SIZE[mode], 3)].sort((a, b) => a - b)
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

  // Same chip visual language as every other drill, but sized down —
  // four-chord labels are long enough to wrap on narrow screens.
  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-6 py-3 text-[length:var(--fs-1)] font-bold'
  const smallChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  const correctLabel = pool ? motionLabel(pool[rank].p) : ''

  return (
    <>
      {phase === 'loading' ? (
        <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]" role="status">
          {t('e8.loading')}
        </p>
      ) : null}

      {phase === 'playing' ? (
        <p className="mono text-[length:var(--fs-3)]" role="status">
          {t('e8.listening')}
        </p>
      ) : null}

      {phase === 'answering' ? (
        <>
          <p className="display text-[length:var(--fs-4)]">{t('e8.prompt')}</p>
          <div className="flex flex-wrap gap-3">
            {options.map((opt) => (
              <button key={opt.rank} className={`${chip} text-[color:var(--ink)]`} onClick={() => handleAnswer(opt)}>
                {opt.label}
              </button>
            ))}
          </div>
          <button className={`${smallChip} self-start text-[color:var(--ink)]`} onClick={replay}>
            {t('e8.replay')}
          </button>
        </>
      ) : null}

      {phase === 'feedback' ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {picked?.rank === rank ? t('e8.correct', { motion: correctLabel }) : t('e8.incorrect', { motion: correctLabel })}
          </p>
          <div className="flex flex-wrap gap-3">
            <button className={`${smallChip} text-[color:var(--ink)]`} onClick={replay}>
              {t('e8.replay')}
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
