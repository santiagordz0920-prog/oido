import { useEffect, useRef, useState } from 'react'
import { LessonShell, type LessonSection } from './LessonShell'
import { useT } from '../../state/settings'
import { ensureAudio, playChordQuality } from '../../audio/engine'
import type { ChordSpec } from '../../theory'
import type { KeyDef } from '../../theory/keys'
import type { StringKey } from '../../i18n/strings'

// T6 — triad construction, the four qualities (docs/curriculum.md §5 row
// T6). Every triad stacks a 1, 3 and 5; moving the 3 or the 5 a half step
// changes the whole quality.

type Props = {
  activeKey: KeyDef
  onComplete: () => void
}

type TriadQuality = 'maj' | 'min' | 'dim' | 'aug'

const QUALITY_LABEL_KEY: Record<TriadQuality, StringKey> = {
  maj: 'e5.quality.maj',
  min: 'e5.quality.min',
  dim: 'e5.quality.dim',
  aug: 'e5.quality.aug',
}

export function T6Lesson({ activeKey, onComplete }: Props) {
  const t = useT()
  const [quality, setQuality] = useState<TriadQuality>('maj')
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

  function playQuality(q: TriadQuality) {
    const spec: ChordSpec = { root: activeKey.tonic, quality: q }
    void withAudio(() => playChordQuality(spec))
  }

  function transform(q: TriadQuality) {
    setQuality(q)
    playQuality(q)
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  const sections: LessonSection[] = [
    {
      headingKey: 't6.demo.heading',
      bodyKey: 't6.demo.body',
      content: (
        <div className="flex flex-wrap gap-2">
          <button className={chip} onClick={() => playQuality('maj')}>
            {t('t6.demo.maj')}
          </button>
          <button className={chip} onClick={() => playQuality('min')}>
            {t('t6.demo.min')}
          </button>
          <button className={chip} onClick={() => playQuality('dim')}>
            {t('t6.demo.dim')}
          </button>
          <button className={chip} onClick={() => playQuality('aug')}>
            {t('t6.demo.aug')}
          </button>
        </div>
      ),
    },
    {
      headingKey: 't6.widget.heading',
      bodyKey: 't6.widget.body',
      content: (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <button className={chip} onClick={() => transform('min')}>
              {t('t6.widget.lower3')}
            </button>
            <button className={chip} onClick={() => transform('dim')}>
              {t('t6.widget.lower5ofMinor')}
            </button>
            <button className={chip} onClick={() => transform('aug')}>
              {t('t6.widget.raise5ofMajor')}
            </button>
          </div>
          <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {t('t6.widget.current', { root: activeKey.label, quality: t(QUALITY_LABEL_KEY[quality]) })}
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
      nodeId="T6"
      eyebrowKey="t6.eyebrow"
      titleKey="t6.title"
      claimKey="t6.claim"
      sections={sections}
      completeBodyKey="t6.complete.body"
      completeCtaLabelKey="lesson.cta.session"
      onComplete={onComplete}
    />
  )
}
