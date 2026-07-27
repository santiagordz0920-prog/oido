import { useEffect, useRef, useState } from 'react'
import { LessonShell, type LessonSection } from './LessonShell'
import { useT } from '../../state/settings'
import { ensureAudio, playChordQuality } from '../../audio/engine'
import { chordCloseVoicing, type ChordSpec } from '../../theory'
import { displayNote, type KeyDef } from '../../theory/keys'
import type { StringKey } from '../../i18n/strings'

// T12 — inversions and slash chords (docs/curriculum.md §5 row T12). The
// same triad, three different bass notes: root position (bass = 1), first
// inversion (bass = 3), second inversion (bass = 5). Slash notation names
// the chord, then the note in the bass.

type Props = {
  activeKey: KeyDef
  onComplete: () => void
}

type Quality = 'maj' | 'min'
type Inversion = 0 | 1 | 2

const QUALITY_LABEL_KEY: Record<Quality, StringKey> = {
  maj: 'e5.quality.maj',
  min: 'e5.quality.min',
}

const INVERSION_LABEL_KEY: Record<Inversion, StringKey> = {
  0: 't12.demo.inv0',
  1: 't12.demo.inv1',
  2: 't12.demo.inv2',
}

const INVERSIONS: Inversion[] = [0, 1, 2]

export function T12Lesson({ activeKey, onComplete }: Props) {
  const t = useT()
  const [quality, setQuality] = useState<Quality>('maj')
  const [inversion, setInversion] = useState<Inversion>(0)
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

  function playDemoInversion(inv: Inversion) {
    void withAudio(() => playChordQuality({ root: activeKey.tonic, quality: 'maj' }, inv))
  }

  function playWidget(q: Quality, inv: Inversion) {
    void withAudio(() => playChordQuality({ root: activeKey.tonic, quality: q }, inv))
  }

  function pickQuality(q: Quality) {
    setQuality(q)
    playWidget(q, inversion)
  }

  function pickInversion(inv: Inversion) {
    setInversion(inv)
    playWidget(quality, inv)
  }

  const spec: ChordSpec = { root: activeKey.tonic, quality }
  const bassNote = displayNote(chordCloseVoicing(spec, inversion)[0])
  const chordDisplay = displayNote(activeKey.tonic)

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'
  const toggleChip = (active: boolean) =>
    `mono snap border-[length:var(--rule)] border-[var(--ink)] px-4 py-2 text-[length:var(--fs-2)] font-bold ${
      active ? 'key-chip' : 'bg-[var(--surface)]'
    }`

  const sections: LessonSection[] = [
    {
      headingKey: 't12.demo.heading',
      bodyKey: 't12.demo.body',
      bodyVars: { key: activeKey.label },
      content: (
        <div className="flex flex-wrap gap-2">
          {INVERSIONS.map((inv) => (
            <button key={inv} className={chip} onClick={() => playDemoInversion(inv)}>
              {t(INVERSION_LABEL_KEY[inv])}
            </button>
          ))}
        </div>
      ),
    },
    {
      headingKey: 't12.widget.heading',
      bodyKey: 't12.widget.body',
      content: (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <button className={toggleChip(quality === 'maj')} aria-pressed={quality === 'maj'} onClick={() => pickQuality('maj')}>
              {t(QUALITY_LABEL_KEY.maj)}
            </button>
            <button className={toggleChip(quality === 'min')} aria-pressed={quality === 'min'} onClick={() => pickQuality('min')}>
              {t(QUALITY_LABEL_KEY.min)}
            </button>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {INVERSIONS.map((inv) => (
              <button
                key={inv}
                className={toggleChip(inversion === inv)}
                aria-pressed={inversion === inv}
                onClick={() => pickInversion(inv)}
              >
                {t(INVERSION_LABEL_KEY[inv])}
              </button>
            ))}
          </div>
          <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {t('t12.widget.caption', { chord: chordDisplay, bass: bassNote })}
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
      nodeId="T12"
      eyebrowKey="t12.eyebrow"
      titleKey="t12.title"
      claimKey="t12.claim"
      sections={sections}
      completeBodyKey="t12.complete.body"
      completeCtaLabelKey="lesson.cta.session"
      onComplete={onComplete}
    />
  )
}
