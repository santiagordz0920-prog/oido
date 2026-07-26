import { useEffect, useRef, useState } from 'react'
import { useT } from '../state/settings'
import {
  ensureAudio,
  playCadenceThenDegree,
  playResolution,
  stop,
} from '../audio/engine'
import { displayNote, randomKey, type KeyDef } from '../theory/keys'
import { degreeNote, resolutionDegrees } from '../theory'

// E1 — stable degrees in major: 1, 3, 5. Cadence establishes the key, one
// note sounds, the user names its degree by tap, then sings the resolution.
// Random selection across all 12 keys; the FSRS scheduler arrives in Phase 1.

const STABLE = [1, 3, 5]
const ROUND_LENGTH = 10

type ItemState = {
  key: KeyDef
  degree: number
}

function nextItem(prev: ItemState | null): ItemState {
  let key = randomKey()
  // avoid repeating the same key twice in a row so transposition is felt
  while (prev && key.tonic === prev.key.tonic) key = randomKey()
  return { key, degree: STABLE[Math.floor(Math.random() * STABLE.length)] }
}

type Phase = 'intro' | 'playing' | 'answering' | 'feedback' | 'summary'

type Props = {
  onKeyChange: (k: KeyDef) => void
}

export function E1Drill({ onKeyChange }: Props) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('intro')
  const [item, setItem] = useState<ItemState | null>(null)
  const [itemNumber, setItemNumber] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [audioError, setAudioError] = useState(false)

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

  function presentItem(it: ItemState) {
    setPhase('playing')
    setPicked(null)
    void withAudio(async () => {
      await playCadenceThenDegree(it.key.tonic, it.degree)
      if (mounted.current) setPhase('answering')
    })
  }

  function startItem(prev: ItemState | null, number: number) {
    const it = nextItem(prev)
    setItem(it)
    setItemNumber(number)
    onKeyChange(it.key)
    presentItem(it)
  }

  function handleBegin() {
    setCorrectCount(0)
    startItem(null, 1)
  }

  function handleReplay() {
    if (item) presentItem(item)
  }

  function handleAnswer(degree: number) {
    if (!item || phase !== 'answering') return
    setPicked(degree)
    if (degree === item.degree) setCorrectCount((c) => c + 1)
    setPhase('feedback')
    void withAudio(() => playResolution(item.key.tonic, item.degree))
  }

  function handleNext() {
    if (itemNumber >= ROUND_LENGTH) {
      stop()
      setPhase('summary')
    } else {
      startItem(item, itemNumber + 1)
    }
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-6 py-3 text-[length:var(--fs-4)] font-bold'
  const smallChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  const resolutionLabel = item ? resolutionDegrees(item.degree).join('–') : ''
  const noteLabel = item ? displayNote(degreeNote(item.key.tonic, item.degree)) : ''

  return (
    // The key's hue as a full-bleed field: the user always knows the key
    // without reading. The key name is still printed — never hue alone.
    <div className="key-field flex-1 p-4">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div>
          <div className="mono text-[length:var(--fs-1)] opacity-90">{t('e1.eyebrow')}</div>
          <h1 className="display text-[length:var(--fs-5)] leading-tight sm:text-[length:var(--fs-6)]">
            {t('e1.title')}
          </h1>
        </div>

        {phase === 'intro' ? (
          <>
            <p className="max-w-[65ch]">{t('e1.intro')}</p>
            <button className={`${chip} self-start text-[color:var(--ink)]`} onClick={handleBegin}>
              {t('e1.begin')}
            </button>
          </>
        ) : null}

        {phase !== 'intro' && phase !== 'summary' && item ? (
          <>
            <div className="mono flex flex-wrap gap-x-6 gap-y-1 text-[length:var(--fs-1)]">
              <span>{t('e1.item', { n: itemNumber, total: ROUND_LENGTH })}</span>
              <span>{t('e1.keyIs', { key: item.key.label })}</span>
            </div>

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
                <button className={`${smallChip} self-start text-[color:var(--ink)]`} onClick={handleReplay}>
                  {t('e1.replay')}
                </button>
              </>
            ) : null}

            {phase === 'feedback' ? (
              <>
                <p className="display text-[length:var(--fs-4)]" role="status">
                  {picked === item.degree
                    ? t('e1.correct', { degree: item.degree, note: noteLabel, key: item.key.label })
                    : t('e1.incorrect', { degree: item.degree, note: noteLabel, key: item.key.label })}
                </p>
                <p className="max-w-[65ch]">{t('e1.sing', { path: resolutionLabel })}</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    className={`${smallChip} text-[color:var(--ink)]`}
                    onClick={() => item && void withAudio(() => playResolution(item.key.tonic, item.degree))}
                  >
                    {t('e1.playResolution')}
                  </button>
                  <button className={`${smallChip} text-[color:var(--ink)]`} onClick={handleNext}>
                    {itemNumber >= ROUND_LENGTH ? t('e1.finish') : t('e1.next')}
                  </button>
                </div>
                <p className="mono text-[length:var(--fs-1)]">
                  {t('e1.score', { correct: correctCount, total: itemNumber })}
                </p>
              </>
            ) : null}
          </>
        ) : null}

        {phase === 'summary' ? (
          <div className="border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] p-6 text-[color:var(--ink)]">
            <h2 className="display text-[length:var(--fs-4)]">{t('e1.summary.title')}</h2>
            <p className="mono my-2 text-[length:var(--fs-5)] font-bold">
              {t('e1.score', { correct: correctCount, total: ROUND_LENGTH })}
            </p>
            <p className="mb-4 max-w-[65ch] text-[color:var(--ink-dim)]">{t('e1.summary.body')}</p>
            <button className={smallChip} onClick={handleBegin}>
              {t('e1.summary.again')}
            </button>
          </div>
        ) : null}

        {audioError ? (
          <p className="mono text-[length:var(--fs-1)]" role="alert">
            {t('audio.error')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
