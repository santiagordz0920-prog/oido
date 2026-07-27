import { useEffect, useRef, useState } from 'react'
import { LessonShell, type LessonSection } from './LessonShell'
import { useT } from '../../state/settings'
import { ensureAudio, playNotes, playProgression } from '../../audio/engine'
import { degreeNote } from '../../theory'
import type { KeyDef } from '../../theory/keys'

// T10 — seventh chords and the tritone (docs/curriculum.md §5 row T10).
// Adding the 7th to V creates an internal clash — scale degrees 4 and 7 —
// that resolves by collapsing into 3 and 1, which is why V7 pulls harder
// than a plain V.

type Props = {
  activeKey: KeyDef
  onComplete: () => void
}

export function T10Lesson({ activeKey, onComplete }: Props) {
  const t = useT()
  const [add7, setAdd7] = useState(false)
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

  function playCompare(withSeventh: boolean) {
    void withAudio(() => playProgression(activeKey.tonic, withSeventh ? ['V7', 'I'] : ['V', 'I']))
  }

  function playTritone() {
    void withAudio(() => playNotes([degreeNote(activeKey.tonic, 4), degreeNote(activeKey.tonic, 7)]))
  }

  function playResolved() {
    void withAudio(() => playNotes([degreeNote(activeKey.tonic, 3), degreeNote(activeKey.tonic, 8)]))
  }

  function toggleAdd7() {
    const next = !add7
    setAdd7(next)
    playCompare(next)
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  const sections: LessonSection[] = [
    {
      headingKey: 't10.demo.heading',
      bodyKey: 't10.demo.body',
      bodyVars: { key: activeKey.label },
      content: (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <button className={chip} onClick={() => playCompare(false)}>
              {t('t10.demo.playTriad')}
            </button>
            <button className={chip} onClick={() => playCompare(true)}>
              {t('t10.demo.playSeventh')}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={chip} onClick={playTritone}>
              {t('t10.demo.playTritone')}
            </button>
            <button className={chip} onClick={playResolved}>
              {t('t10.demo.playResolved')}
            </button>
          </div>
        </>
      ),
    },
    {
      headingKey: 't10.widget.heading',
      bodyKey: 't10.widget.body',
      content: (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <button className={chip} aria-pressed={add7} onClick={toggleAdd7}>
              {add7 ? t('t10.widget.toggleOn') : t('t10.widget.toggleOff')}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={chip} onClick={playTritone}>
              {t('t10.widget.playInner')}
            </button>
            <button className={chip} onClick={playResolved}>
              {t('t10.widget.playInnerResolved')}
            </button>
          </div>
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
      nodeId="T10"
      eyebrowKey="t10.eyebrow"
      titleKey="t10.title"
      claimKey="t10.claim"
      sections={sections}
      completeBodyKey="t10.complete.body"
      completeCtaLabelKey="lesson.cta.session"
      onComplete={onComplete}
    />
  )
}
