import { useEffect, useRef, useState } from 'react'
import { useT } from '../../state/settings'
import { ensureAudio, playCadenceThenDegree, playResolution, stop } from '../../audio/engine'
import { displayNote, type KeyDef } from '../../theory/keys'
import { degreeNote, resolutionDegrees } from '../../theory'
import type { ItemResult } from './E1Item'

// E3: the full major scale, interleaved, with a response-time emphasis
// (mastery: 88% accuracy, median RT under 3s — docs/curriculum.md §6). Same
// structure as E1Item with all seven degrees as chips; feedback adds a plain
// hint when the answer took longer than 3s.

const DEGREES = [1, 2, 3, 4, 5, 6, 7]
const RT_TARGET_MS = 3000

// 8 is the tonic an octave up (src/theory/index.ts); display it as 1.
function displayDegree(d: number): number {
  return d === 8 ? 1 : d
}

type Phase = 'playing' | 'answering' | 'feedback'

type Props = {
  itemKey: KeyDef
  degree: number
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
}

export function E3Item({ itemKey, degree, nextLabel, onResult, onNext }: Props) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('playing')
  const [picked, setPicked] = useState<number | null>(null)
  const [latencyMs, setLatencyMs] = useState(0)
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

  function present() {
    setPhase('playing')
    setPicked(null)
    void withAudio(async () => {
      await playCadenceThenDegree(itemKey.tonic, degree)
      if (mounted.current) {
        answerStart.current = performance.now()
        setPhase('answering')
      }
    })
  }

  const itemId = `${itemKey.tonic}|${degree}`
  useEffect(() => {
    present()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  function handleAnswer(d: number) {
    if (phase !== 'answering') return
    const elapsed = Math.round(performance.now() - answerStart.current)
    setPicked(d)
    setLatencyMs(elapsed)
    setPhase('feedback')
    onResult({
      correct: d === degree,
      latencyMs: elapsed,
      response: String(d),
    })
    void withAudio(() => playResolution(itemKey.tonic, degree))
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-6 py-3 text-[length:var(--fs-4)] font-bold'
  const smallChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  const resolutionLabel = resolutionDegrees(degree).map(displayDegree).join('–')
  const noteLabel = displayNote(degreeNote(itemKey.tonic, degree))

  return (
    <>
      {phase === 'playing' ? (
        <p className="mono text-[length:var(--fs-3)]" role="status">
          {t('e3.listening')}
        </p>
      ) : null}

      {phase === 'answering' ? (
        <>
          <p className="display text-[length:var(--fs-4)]">{t('e3.prompt')}</p>
          <div className="flex flex-wrap gap-3">
            {DEGREES.map((d) => (
              <button key={d} className={`${chip} text-[color:var(--ink)]`} onClick={() => handleAnswer(d)}>
                {d}
              </button>
            ))}
          </div>
          <button className={`${smallChip} self-start text-[color:var(--ink)]`} onClick={present}>
            {t('e3.replay')}
          </button>
        </>
      ) : null}

      {phase === 'feedback' ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {picked === degree
              ? t('e3.correct', { degree, note: noteLabel, key: itemKey.label })
              : t('e3.incorrect', { degree, note: noteLabel, key: itemKey.label })}
          </p>
          {latencyMs > RT_TARGET_MS ? (
            <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">{t('e3.rtHint')}</p>
          ) : null}
          <p className="max-w-[65ch]">{t('e3.sing', { path: resolutionLabel })}</p>
          <div className="flex flex-wrap gap-3">
            <button
              className={`${smallChip} text-[color:var(--ink)]`}
              onClick={() => void withAudio(() => playResolution(itemKey.tonic, degree))}
            >
              {t('e3.playResolution')}
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
