import { useEffect, useRef, useState } from 'react'
import { useT } from '../../state/settings'
import { ensureAudio, playCadenceThenNumeral, stop } from '../../audio/engine'
import { displayNote, type KeyDef } from '../../theory/keys'
import { parseNumeral } from '../../theory'
import type { ItemResult } from './E1Item'

// E6: diatonic function in major, presented after a tonic cadence
// (docs/curriculum.md §6). Chips are the seven diatonic Roman numerals,
// printed exactly as written — vii° keeps its ring, and the case already
// carries the third (ii, iii, vi are minor), so no separate quality label
// is needed. Feedback names the numeral and its chord's root pitch class in
// the current key, e.g. "IV — A♭ in E♭ major".

const NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']

type Phase = 'playing' | 'answering' | 'feedback'

type Props = {
  itemKey: KeyDef
  numeral: string
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
}

export function E6Item({ itemKey, numeral, nextLabel, onResult, onNext }: Props) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('playing')
  const [picked, setPicked] = useState<string | null>(null)
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
      await playCadenceThenNumeral(itemKey.tonic, numeral)
      if (mounted.current) {
        answerStart.current = performance.now()
        setPhase('answering')
      }
    })
  }

  const itemId = `${itemKey.tonic}|${numeral}`
  useEffect(() => {
    present()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  function handleAnswer(n: string) {
    if (phase !== 'answering') return
    setPicked(n)
    setPhase('feedback')
    onResult({
      correct: n === numeral,
      latencyMs: Math.round(performance.now() - answerStart.current),
      response: n,
    })
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-6 py-3 text-[length:var(--fs-4)] font-bold'
  const smallChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  const root = displayNote(parseNumeral(itemKey.tonic, numeral).root)

  return (
    <>
      {phase === 'playing' ? (
        <p className="mono text-[length:var(--fs-3)]" role="status">
          {t('e6.listening')}
        </p>
      ) : null}

      {phase === 'answering' ? (
        <>
          <p className="display text-[length:var(--fs-4)]">{t('e6.prompt')}</p>
          <div className="flex flex-wrap gap-3">
            {NUMERALS.map((n) => (
              <button key={n} className={`${chip} text-[color:var(--ink)]`} onClick={() => handleAnswer(n)}>
                {n}
              </button>
            ))}
          </div>
          <button className={`${smallChip} self-start text-[color:var(--ink)]`} onClick={present}>
            {t('e6.replay')}
          </button>
        </>
      ) : null}

      {phase === 'feedback' ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {picked === numeral
              ? t('e6.correct', { numeral, note: root, key: itemKey.label })
              : t('e6.incorrect', { numeral, note: root, key: itemKey.label })}
          </p>
          <div className="flex flex-wrap gap-3">
            <button className={`${smallChip} text-[color:var(--ink)]`} onClick={present}>
              {t('e6.replay')}
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
