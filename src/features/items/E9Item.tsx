import { useEffect, useRef, useState } from 'react'
import { useT } from '../../state/settings'
import { ensureAudio, playCadenceThenBassLine, stop } from '../../audio/engine'
import type { KeyDef } from '../../theory/keys'
import { loadProgressionFrequency, topProgressions } from '../../curriculum/progressions'
import { isDiatonicProgression, NUMERAL_DEGREE } from '../../scheduler/items'
import type { ItemResult } from './E1Item'

// E9: bass-line dictation, root motion only, major only for now (minor and
// chromatic dictation arrive with E10 — docs/curriculum.md §6). The
// stimulus is a cadence, then the target four-chord progression sounding
// its bass roots only (audio/engine.ts playCadenceThenBassLine). The pool
// is E8's major four-chord list (top 10), filtered here to plain-diatonic
// entries — the same filter and rank ordering scheduler/items.ts used to
// size the item bank (E9_RANK_COUNT), so `rank` indexes this filtered
// array consistently between generation and render.
//
// The user taps scale-degree chips 1–7 to fill four slots left to right; a
// "clear" chip resets the slots. Grading happens the instant the fourth
// slot fills — root motion is right only if every one of the four degrees
// matches.

const DEGREES = [1, 2, 3, 4, 5, 6, 7]

type Phase = 'loading' | 'playing' | 'answering' | 'feedback'

type Props = {
  itemKey: KeyDef
  rank: number
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
}

export function E9Item({ itemKey, rank, nextLabel, onResult, onNext }: Props) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('loading')
  const [numerals, setNumerals] = useState<string[] | null>(null)
  const [entered, setEntered] = useState<number[]>([])
  const [finalEntered, setFinalEntered] = useState<number[]>([])
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

  function present(activeNumerals: string[]) {
    setPhase('playing')
    setEntered([])
    void withAudio(async () => {
      await playCadenceThenBassLine(itemKey.tonic, 'major', activeNumerals)
      if (mounted.current) {
        answerStart.current = performance.now()
        setPhase('answering')
      }
    })
  }

  const itemId = `${itemKey.tonic}|${rank}`
  useEffect(() => {
    let alive = true
    setPhase('loading')
    setNumerals(null)
    void loadProgressionFrequency().then((data) => {
      if (!alive) return
      const pool = topProgressions(data, 'major', 'four', 10).filter((e) => isDiatonicProgression(e.p))
      const target = pool[rank].p
      setNumerals(target)
      present(target)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  function replay() {
    if (numerals) present(numerals)
  }

  function handleDegree(d: number) {
    if (phase !== 'answering' || entered.length >= 4 || !numerals) return
    const next = [...entered, d]
    setEntered(next)
    if (next.length === 4) {
      const targetDegrees = numerals.map((n) => NUMERAL_DEGREE[n])
      const correct = next.every((v, i) => v === targetDegrees[i])
      setFinalEntered(next)
      setPhase('feedback')
      onResult({
        correct,
        latencyMs: Math.round(performance.now() - answerStart.current),
        response: next.join('–'),
      })
    }
  }

  function handleClear() {
    if (phase === 'answering') setEntered([])
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-6 py-3 text-[length:var(--fs-4)] font-bold'
  const smallChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'
  const slot =
    'mono flex h-16 w-16 items-center justify-center border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] text-[length:var(--fs-4)] font-bold text-[color:var(--ink)]'

  const targetDegrees = numerals ? numerals.map((n) => NUMERAL_DEGREE[n]) : []
  const correctSequence = targetDegrees.join('–')
  const enteredSequence = finalEntered.join('–')
  const isCorrect = finalEntered.length === 4 && finalEntered.every((v, i) => v === targetDegrees[i])

  return (
    <>
      {phase === 'loading' ? (
        <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]" role="status">
          {t('e9.loading')}
        </p>
      ) : null}

      {phase === 'playing' ? (
        <p className="mono text-[length:var(--fs-3)]" role="status">
          {t('e9.listening')}
        </p>
      ) : null}

      {phase === 'answering' ? (
        <>
          <p className="display text-[length:var(--fs-4)]">{t('e9.prompt')}</p>
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={slot}>
                {entered[i] ?? ''}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {DEGREES.map((d) => (
              <button
                key={d}
                className={`${chip} text-[color:var(--ink)]`}
                disabled={entered.length >= 4}
                onClick={() => handleDegree(d)}
              >
                {d}
              </button>
            ))}
            <button className={`${chip} text-[color:var(--ink)]`} onClick={handleClear}>
              {t('e9.clear')}
            </button>
          </div>
          <button className={`${smallChip} self-start text-[color:var(--ink)]`} onClick={replay}>
            {t('e9.replay')}
          </button>
        </>
      ) : null}

      {phase === 'feedback' ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {isCorrect
              ? t('e9.correct', { sequence: correctSequence })
              : t('e9.incorrect', { sequence: correctSequence, entered: enteredSequence })}
          </p>
          <div className="flex flex-wrap gap-3">
            <button className={`${smallChip} text-[color:var(--ink)]`} onClick={replay}>
              {t('e9.replay')}
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
