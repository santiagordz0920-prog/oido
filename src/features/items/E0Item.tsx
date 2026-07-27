import { useEffect, useRef, useState } from 'react'
import { useT } from '../../state/settings'
import { ensureAudio, playCadenceThenDegree, playResolution, stop } from '../../audio/engine'
import { displayNote, type KeyDef } from '../../theory/keys'
import { degreeNote, resolutionDegrees } from '../../theory'
import type { ItemResult } from './E1Item'

// E0: tonic retention. A cadence establishes the key, a growing silence
// follows, then one note. The user says yes/no: is it the tonic? Feedback
// always names the actual degree and plays its functional resolution, same
// as E1. Structure copied from E1Item; the difference is the yes/no answer
// and the gapSeconds dial (docs/curriculum.md §6).

// 8 is the tonic an octave up (src/theory/index.ts); display it as 1.
function displayDegree(d: number): number {
  return d === 8 ? 1 : d
}

type Phase = 'playing' | 'answering' | 'feedback'
type Answer = 'yes' | 'no'

type Props = {
  itemKey: KeyDef
  degree: number
  gapSeconds: number
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
}

export function E0Item({ itemKey, degree, gapSeconds, nextLabel, onResult, onNext }: Props) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('playing')
  const [picked, setPicked] = useState<Answer | null>(null)
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
      await playCadenceThenDegree(itemKey.tonic, degree, { gapSeconds })
      if (mounted.current) {
        answerStart.current = performance.now()
        setPhase('answering')
      }
    })
  }

  const itemId = `${itemKey.tonic}|${degree}|${gapSeconds}`
  useEffect(() => {
    present()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  function handleAnswer(answer: Answer) {
    if (phase !== 'answering') return
    setPicked(answer)
    setPhase('feedback')
    const correct = (answer === 'yes') === (degree === 1)
    onResult({
      correct,
      latencyMs: Math.round(performance.now() - answerStart.current),
      response: answer,
    })
    void withAudio(() => playResolution(itemKey.tonic, degree))
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-6 py-3 text-[length:var(--fs-4)] font-bold'
  const smallChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  const resolutionLabel = resolutionDegrees(degree).map(displayDegree).join('–')
  const noteLabel = displayNote(degreeNote(itemKey.tonic, degree))
  const correct = picked !== null && (picked === 'yes') === (degree === 1)

  return (
    <>
      {phase === 'playing' ? (
        <p className="mono text-[length:var(--fs-3)]" role="status">
          {t('e0.listening')}
        </p>
      ) : null}

      {phase === 'answering' ? (
        <>
          <p className="display text-[length:var(--fs-4)]">{t('e0.prompt')}</p>
          <div className="flex flex-wrap gap-3">
            <button className={`${chip} text-[color:var(--ink)]`} onClick={() => handleAnswer('yes')}>
              {t('e0.yes')}
            </button>
            <button className={`${chip} text-[color:var(--ink)]`} onClick={() => handleAnswer('no')}>
              {t('e0.no')}
            </button>
          </div>
          <button className={`${smallChip} self-start text-[color:var(--ink)]`} onClick={present}>
            {t('e0.replay')}
          </button>
        </>
      ) : null}

      {phase === 'feedback' ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {correct
              ? t('e0.correct', { degree: displayDegree(degree), note: noteLabel, key: itemKey.label })
              : t('e0.incorrect', { degree: displayDegree(degree), note: noteLabel, key: itemKey.label })}
          </p>
          <p className="max-w-[65ch]">{t('e0.sing', { path: resolutionLabel })}</p>
          <div className="flex flex-wrap gap-3">
            <button
              className={`${smallChip} text-[color:var(--ink)]`}
              onClick={() => void withAudio(() => playResolution(itemKey.tonic, degree))}
            >
              {t('e0.playResolution')}
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
