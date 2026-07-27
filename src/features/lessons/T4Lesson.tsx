import { useEffect, useRef, useState } from 'react'
import { Key } from 'tonal'
import { CircleOfFifths } from '../../components/CircleOfFifths'
import { LessonShell, type LessonSection } from './LessonShell'
import { useT } from '../../state/settings'
import { ensureAudio, playCadence } from '../../audio/engine'
import { KEYS, type KeyDef } from '../../theory/keys'

// T4 — key signatures and the circle of fifths as a map (docs/curriculum.md
// §5 row T4). Neighbors on the circle share every note but one, so a step in
// either direction is the smallest possible key change.

type Props = {
  activeKey: KeyDef
  onKeyChange: (k: KeyDef) => void
  onComplete: () => void
}

// tonal's Key.majorKey(tonic).keySignature is a run of '#' or 'b' characters
// (e.g. "####"), never a mix — turn it into a count and the real glyph.
// This is deliberately not theory/keys.ts's displayNote, which is built for
// note names (where "bb" means double-flat) rather than a run of single
// accidentals.
function signatureInfo(tonic: string): { count: number; glyphs: string } {
  const sig = Key.majorKey(tonic).keySignature
  if (sig.length === 0) return { count: 0, glyphs: '' }
  const glyph = sig[0] === '#' ? '♯' : '♭'
  return { count: sig.length, glyphs: glyph.repeat(sig.length) }
}

export function T4Lesson({ activeKey, onKeyChange, onComplete }: Props) {
  const t = useT()
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

  function playCadenceIn(tonic: string) {
    void withAudio(() => playCadence(tonic))
  }

  function stepKey(delta: number) {
    const next = KEYS[(activeKey.position + delta + KEYS.length) % KEYS.length]
    onKeyChange(next)
    playCadenceIn(next.tonic)
  }

  function tapKey(k: KeyDef) {
    onKeyChange(k)
    playCadenceIn(k.tonic)
  }

  const { count, glyphs } = signatureInfo(activeKey.tonic)

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'
  const keyChip = (k: KeyDef) =>
    `mono snap border px-2 py-1 text-[length:var(--fs-1)] ${
      k.tonic === activeKey.tonic
        ? 'key-chip border-[var(--ink)] font-bold'
        : 'border-[var(--ink-dim)] bg-[var(--surface)]'
    }`

  const sections: LessonSection[] = [
    {
      headingKey: 't4.demo.heading',
      bodyKey: 't4.demo.body',
      bodyVars: { key: activeKey.label },
      content: (
        <>
          <div className="mb-4 flex justify-center">
            <CircleOfFifths activeKey={activeKey} size={280} showLabels />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={chip} onClick={() => playCadenceIn(activeKey.tonic)}>
              {t('t4.demo.play')}
            </button>
            <button className={chip} onClick={() => stepKey(-1)}>
              {t('t4.demo.stepLeft')}
            </button>
            <button className={chip} onClick={() => stepKey(1)}>
              {t('t4.demo.stepRight')}
            </button>
          </div>
        </>
      ),
    },
    {
      headingKey: 't4.widget.heading',
      bodyKey: 't4.widget.body',
      content: (
        <>
          <div className="mb-4 flex flex-wrap gap-1">
            {KEYS.map((k) => (
              <button
                key={k.tonic}
                className={keyChip(k)}
                aria-pressed={k.tonic === activeKey.tonic}
                onClick={() => tapKey(k)}
                style={{ ['--active-key-hue' as string]: `${k.hue}deg` }}
              >
                {k.label}
              </button>
            ))}
          </div>
          <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {count === 0
              ? t('t4.widget.caption.none', { key: activeKey.label })
              : t('t4.widget.caption.some', { key: activeKey.label, count, glyphs })}
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
      nodeId="T4"
      eyebrowKey="t4.eyebrow"
      titleKey="t4.title"
      claimKey="t4.claim"
      sections={sections}
      completeBodyKey="t4.complete.body"
      completeCtaLabelKey="lesson.cta.session"
      onComplete={onComplete}
    />
  )
}
