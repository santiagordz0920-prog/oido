import { useEffect, useRef, useState } from 'react'
import { Note } from 'tonal'
import { LessonShell, type LessonSection } from './LessonShell'
import { useT } from '../../state/settings'
import { ensureAudio, playNotes, playPartials } from '../../audio/engine'
import { degreeNote } from '../../theory'
import type { KeyDef } from '../../theory/keys'

// T1 — the harmonic series (docs/curriculum.md §5 row T1). One string
// vibrates in many modes at once; partial 2 doubles the fundamental (the
// octave), partial 3 introduces a new pitch class (the fifth above that),
// and how cleanly partials line up is where consonance comes from.

type Props = {
  activeKey: KeyDef
  onComplete: () => void
}

const PARTIALS = [1, 2, 3, 4, 5, 6, 7, 8]
const WIDGET_DEPTHS = [2, 3, 4, 5, 8]

export function T1Lesson({ activeKey, onComplete }: Props) {
  const t = useT()
  const [sounding, setSounding] = useState(0)
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

  function fundamentalHz(): number {
    // Note.freq only returns null for unparseable note names; the tonic is
    // always a valid pitch class here.
    return Note.freq(`${activeKey.tonic}2`) ?? 65.4
  }

  function playStack(count: number) {
    void withAudio(() =>
      playPartials(fundamentalHz(), count, (n) => {
        if (mounted.current) setSounding(n)
      }),
    )
  }

  function playFifthAgainstTonic() {
    setSounding(0)
    void withAudio(() => playNotes([degreeNote(activeKey.tonic, 1), degreeNote(activeKey.tonic, 5)]))
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'
  const partialChip = (n: number) =>
    `mono snap flex h-11 w-11 items-center justify-center rounded-full border-[length:var(--rule)] border-[var(--ink)] text-[length:var(--fs-2)] font-bold ${
      sounding === n ? 'key-chip scale-110' : 'bg-[var(--surface)]'
    }`

  const sections: LessonSection[] = [
    {
      headingKey: 't1.demo.heading',
      bodyKey: 't1.demo.body',
      bodyVars: { key: activeKey.label },
      content: (
        <>
          <div className="mb-4 flex flex-wrap gap-2" role="status">
            {PARTIALS.map((n) => (
              <span key={n} className={partialChip(n)}>
                {n}
              </span>
            ))}
          </div>
          <button className={chip} onClick={() => playStack(8)}>
            {t('t1.demo.play')}
          </button>
        </>
      ),
    },
    {
      headingKey: 't1.widget.heading',
      bodyKey: 't1.widget.body',
      content: (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {WIDGET_DEPTHS.map((n) => (
              <button key={n} className={chip} onClick={() => playStack(n)}>
                {t('t1.widget.depth', { n })}
              </button>
            ))}
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <button className={chip} onClick={playFifthAgainstTonic}>
              {t('t1.widget.playFifth')}
            </button>
          </div>
          <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">{t('t1.widget.caption')}</p>
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
      nodeId="T1"
      eyebrowKey="t1.eyebrow"
      titleKey="t1.title"
      claimKey="t1.claim"
      sections={sections}
      completeBodyKey="t1.complete.body"
      completeCtaLabelKey="lesson.cta.session"
      onComplete={onComplete}
    />
  )
}
