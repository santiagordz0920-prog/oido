import { useEffect, useRef, useState } from 'react'
import { useT } from '../../state/settings'
import { ensureAudio, playChordQuality, stop } from '../../audio/engine'
import type { ChordQuality } from '../../theory'
import type { StringKey } from '../../i18n/strings'
import type { ItemResult } from './E1Item'

// E5: chord quality, context-free (docs/curriculum.md §6; see the comment on
// playChordQuality in audio/engine.ts — no cadence, because quality
// identification does not depend on a key). Two tiers share this node:
// triads (maj min dim aug) and sevenths (maj7 min7 dom7 m7b5 dim7),
// inversion 0 only for now. The item's tier picks which chip set answers
// it; the item's quality picks which chip is correct.

export type ChordTier = 'triad' | 'seventh'

const TRIAD_QUALITIES: ChordQuality[] = ['maj', 'min', 'dim', 'aug']
const SEVENTH_QUALITIES: ChordQuality[] = ['maj7', 'min7', 'dom7', 'm7b5', 'dim7']

const QUALITY_KEY: Record<ChordQuality, StringKey> = {
  maj: 'e5.quality.maj',
  min: 'e5.quality.min',
  dim: 'e5.quality.dim',
  aug: 'e5.quality.aug',
  maj7: 'e5.quality.maj7',
  min7: 'e5.quality.min7',
  dom7: 'e5.quality.dom7',
  m7b5: 'e5.quality.m7b5',
  dim7: 'e5.quality.dim7',
}

type Phase = 'playing' | 'answering' | 'feedback'

type Props = {
  root: string
  quality: ChordQuality
  tier: ChordTier
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
}

export function E5Item({ root, quality, tier, nextLabel, onResult, onNext }: Props) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('playing')
  const [picked, setPicked] = useState<ChordQuality | null>(null)
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
      await playChordQuality({ root, quality })
      if (mounted.current) {
        answerStart.current = performance.now()
        setPhase('answering')
      }
    })
  }

  const itemId = `${root}|${tier}|${quality}`
  useEffect(() => {
    present()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  function handleAnswer(q: ChordQuality) {
    if (phase !== 'answering') return
    setPicked(q)
    setPhase('feedback')
    onResult({
      correct: q === quality,
      latencyMs: Math.round(performance.now() - answerStart.current),
      response: q,
    })
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-6 py-3 text-[length:var(--fs-3)] font-bold'
  const smallChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  const qualities = tier === 'triad' ? TRIAD_QUALITIES : SEVENTH_QUALITIES
  const qualityLabel = (q: ChordQuality) => t(QUALITY_KEY[q])

  return (
    <>
      {phase === 'playing' ? (
        <p className="mono text-[length:var(--fs-3)]" role="status">
          {t('e5.listening')}
        </p>
      ) : null}

      {phase === 'answering' ? (
        <>
          <p className="display text-[length:var(--fs-4)]">{t('e5.prompt')}</p>
          <div className="flex flex-wrap gap-3">
            {qualities.map((q) => (
              <button key={q} className={`${chip} text-[color:var(--ink)]`} onClick={() => handleAnswer(q)}>
                {qualityLabel(q)}
              </button>
            ))}
          </div>
          <button className={`${smallChip} self-start text-[color:var(--ink)]`} onClick={present}>
            {t('e5.replay')}
          </button>
        </>
      ) : null}

      {phase === 'feedback' ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {picked === quality
              ? t('e5.correct', { quality: qualityLabel(quality) })
              : t('e5.incorrect', { quality: qualityLabel(quality) })}
          </p>
          <div className="flex flex-wrap gap-3">
            <button className={`${smallChip} text-[color:var(--ink)]`} onClick={present}>
              {t('e5.replay')}
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
