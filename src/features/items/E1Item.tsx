import { useEffect, useRef, useState } from 'react'
import { useT } from '../../state/settings'
import { ensureAudio, playCadenceThenDegree, playResolution, stop } from '../../audio/engine'
import { displayNote, type KeyDef } from '../../theory/keys'
import { degreeNote, resolutionDegrees } from '../../theory'

// One E1 recognition item: cadence establishes the key, one note sounds, the
// user names its degree by tap, then sings the resolution. Used by the free
// E1 drill and by the session runner.

export type ItemResult = {
  correct: boolean
  latencyMs: number
  response: string
}

const STABLE = [1, 3, 5]

type Phase = 'playing' | 'answering' | 'feedback'

type Props = {
  itemKey: KeyDef
  degree: number
  nextLabel: string
  onResult: (r: ItemResult) => void // fires once, when the answer lands
  onNext: () => void
}

export function E1Item({ itemKey, degree, nextLabel, onResult, onNext }: Props) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('playing')
  const [picked, setPicked] = useState<number | null>(null)
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

  // Present automatically when the item changes.
  const itemId = `${itemKey.tonic}|${degree}`
  useEffect(() => {
    present()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  function handleAnswer(d: number) {
    if (phase !== 'answering') return
    setPicked(d)
    setPhase('feedback')
    onResult({
      correct: d === degree,
      latencyMs: Math.round(performance.now() - answerStart.current),
      response: String(d),
    })
    void withAudio(() => playResolution(itemKey.tonic, degree))
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-6 py-3 text-[length:var(--fs-4)] font-bold'
  const smallChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  const resolutionLabel = resolutionDegrees(degree).join('–')
  const noteLabel = displayNote(degreeNote(itemKey.tonic, degree))

  return (
    <>
      {phase === 'playing' ? (
        <p className="mono text-[length:var(--fs-3)]" role="status">
          {t('e1.listening')}
        </p>
      ) : null}

      {phase === 'answering' ? (
        <>
          <p className="display text-[length:var(--fs-4)]">{t('e1.prompt')}</p>
          <div className="flex flex-wrap gap-3">
            {STABLE.map((d) => (
              <button key={d} className={`${chip} text-[color:var(--ink)]`} onClick={() => handleAnswer(d)}>
                {d}
              </button>
            ))}
          </div>
          <button className={`${smallChip} self-start text-[color:var(--ink)]`} onClick={present}>
            {t('e1.replay')}
          </button>
        </>
      ) : null}

      {phase === 'feedback' ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {picked === degree
              ? t('e1.correct', { degree, note: noteLabel, key: itemKey.label })
              : t('e1.incorrect', { degree, note: noteLabel, key: itemKey.label })}
          </p>
          <p className="max-w-[65ch]">{t('e1.sing', { path: resolutionLabel })}</p>
          <div className="flex flex-wrap gap-3">
            <button
              className={`${smallChip} text-[color:var(--ink)]`}
              onClick={() => void withAudio(() => playResolution(itemKey.tonic, degree))}
            >
              {t('e1.playResolution')}
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
