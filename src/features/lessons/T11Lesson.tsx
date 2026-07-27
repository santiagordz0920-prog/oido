import { useEffect, useRef, useState } from 'react'
import { LessonShell, type LessonSection } from './LessonShell'
import { useT } from '../../state/settings'
import { ensureAudio, playProgression, playProgressionBlock } from '../../audio/engine'
import type { KeyDef } from '../../theory/keys'

// T11 — voice leading and guide tones (docs/curriculum.md §5 row T11). The
// same chords played as jumpy root-position blocks versus voice-led — the
// upper voices moving as little as possible — travel very different
// distances even though the harmony is identical.

type Props = {
  activeKey: KeyDef
  onComplete: () => void
}

const SHORT_LOOP = ['ii', 'V', 'I']
const LONG_LOOP = ['I', 'vi', 'ii', 'V']

export function T11Lesson({ activeKey, onComplete }: Props) {
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

  function playBlock(numerals: string[]) {
    void withAudio(() => playProgressionBlock(activeKey.tonic, numerals))
  }

  function playVoiced(numerals: string[]) {
    void withAudio(() => playProgression(activeKey.tonic, numerals))
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  const sections: LessonSection[] = [
    {
      headingKey: 't11.demo.heading',
      bodyKey: 't11.demo.body',
      bodyVars: { key: activeKey.label },
      content: (
        <div className="flex flex-wrap gap-2">
          <button className={chip} onClick={() => playBlock(SHORT_LOOP)}>
            {t('t11.demo.playBlock')}
          </button>
          <button className={chip} onClick={() => playVoiced(SHORT_LOOP)}>
            {t('t11.demo.playVoiced')}
          </button>
        </div>
      ),
    },
    {
      headingKey: 't11.widget.heading',
      bodyKey: 't11.widget.body',
      content: (
        <>
          <div className="flex flex-wrap gap-2">
            <button className={chip} onClick={() => playBlock(LONG_LOOP)}>
              {t('t11.demo.playBlock')}
            </button>
            <button className={chip} onClick={() => playVoiced(LONG_LOOP)}>
              {t('t11.demo.playVoiced')}
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
      nodeId="T11"
      eyebrowKey="t11.eyebrow"
      titleKey="t11.title"
      claimKey="t11.claim"
      sections={sections}
      completeBodyKey="t11.complete.body"
      completeCtaLabelKey="lesson.cta.session"
      onComplete={onComplete}
    />
  )
}
