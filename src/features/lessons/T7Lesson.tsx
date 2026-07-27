import { useEffect, useRef, useState } from 'react'
import { LessonShell, type LessonSection } from './LessonShell'
import { useT } from '../../state/settings'
import { ensureAudio, playCadenceThenNumeral, playProgression } from '../../audio/engine'
import { parseNumeral } from '../../theory'
import { displayNote, type KeyDef } from '../../theory/keys'

// T7 — harmonizing the scale (docs/curriculum.md §5 row T7). Stack every
// scale degree in thirds and you get one diatonic chord per degree.

type Props = {
  activeKey: KeyDef
  onComplete: () => void
}

const NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']

export function T7Lesson({ activeKey, onComplete }: Props) {
  const t = useT()
  const [soundingIdx, setSoundingIdx] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [lastNumeral, setLastNumeral] = useState<string | null>(null)
  const [audioError, setAudioError] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
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

  function handlePlayProgression() {
    setPlaying(true)
    void withAudio(async () => {
      await playProgression(activeKey.tonic, NUMERALS, {
        onChord: (i) => {
          if (mounted.current) setSoundingIdx(i)
        },
      })
      if (mounted.current) setPlaying(false)
    })
  }

  function tapNumeral(numeral: string, i: number) {
    setSoundingIdx(i)
    setLastNumeral(numeral)
    void withAudio(() =>
      playCadenceThenNumeral(activeKey.tonic, numeral, () => {
        if (mounted.current) setSoundingIdx(i)
      }),
    )
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'
  const numeralChip = (i: number) =>
    `mono snap border-[length:var(--rule)] border-[var(--ink)] px-3 py-2 text-[length:var(--fs-2)] font-bold ${
      soundingIdx === i ? 'key-chip' : 'bg-[var(--surface)]'
    }`

  const sections: LessonSection[] = [
    {
      headingKey: 't7.demo.heading',
      bodyKey: 't7.demo.body',
      content: (
        <>
          <div className="mb-4 flex flex-wrap gap-1" role="status">
            {NUMERALS.map((n, i) => (
              <span key={n} className={numeralChip(i)}>
                {n}
              </span>
            ))}
          </div>
          <button className={chip} onClick={handlePlayProgression}>
            {playing ? t('t7.demo.stop') : t('t7.demo.play')}
          </button>
        </>
      ),
    },
    {
      headingKey: 't7.widget.heading',
      bodyKey: 't7.widget.body',
      content: (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {NUMERALS.map((n, i) => (
              <button key={n} className={numeralChip(i)} aria-pressed={soundingIdx === i} onClick={() => tapNumeral(n, i)}>
                {n}
              </button>
            ))}
          </div>
          <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {lastNumeral
              ? t('t7.widget.caption', {
                  numeral: lastNumeral,
                  root: displayNote(parseNumeral(activeKey.tonic, lastNumeral).root),
                })
              : ''}
          </p>
          {audioError ? (
            <p className="mono mt-2 text-[length:var(--fs-1)]" role="alert">
              {t('audio.error')}
            </p>
          ) : null}
        </>
      ),
    },
  ]

  return (
    <LessonShell
      nodeId="T7"
      eyebrowKey="t7.eyebrow"
      titleKey="t7.title"
      claimKey="t7.claim"
      sections={sections}
      completeBodyKey="t7.complete.body"
      completeCtaLabelKey="lesson.cta.session"
      onComplete={onComplete}
    />
  )
}
