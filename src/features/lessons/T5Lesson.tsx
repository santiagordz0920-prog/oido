import { useEffect, useRef, useState } from 'react'
import { DegreeRuler } from '../../components/DegreeRuler'
import { LessonShell, type LessonSection } from './LessonShell'
import { useT } from '../../state/settings'
import { ensureAudio, playScaleForm } from '../../audio/engine'
import type { ScaleForm } from '../../theory'
import type { KeyDef } from '../../theory/keys'
import type { StringKey } from '../../i18n/strings'

// T5 — minor in three forms (docs/curriculum.md §5 row T5). Natural is the
// exact relative of major; harmonic raises 7 so it pulls to 1; melodic
// ascending also raises 6 to soften the gap that leaves.

type Props = {
  activeKey: KeyDef
  onComplete: () => void
}

const MINOR_FORMS: ScaleForm[] = ['natural minor', 'harmonic minor', 'melodic minor']

// Reuse E4's existing form labels rather than duplicating them.
const FORM_LABEL_KEY: Record<ScaleForm, StringKey> = {
  major: 'e4.form.major',
  'natural minor': 'e4.form.naturalMinor',
  'harmonic minor': 'e4.form.harmonicMinor',
  'melodic minor': 'e4.form.melodicMinor',
}

export function T5Lesson({ activeKey, onComplete }: Props) {
  const t = useT()
  const [form, setForm] = useState<ScaleForm>('natural minor')
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

  function playForm(f: ScaleForm) {
    setForm(f)
    void withAudio(() =>
      playScaleForm(activeKey.tonic, f, (d) => {
        if (mounted.current) setSounding(d)
      }),
    )
  }

  function handleCompare() {
    void withAudio(async () => {
      await playScaleForm(activeKey.tonic, 'major', (d) => {
        if (mounted.current) setSounding(d)
      })
      await playScaleForm(activeKey.tonic, form, (d) => {
        if (mounted.current) setSounding(d)
      })
    })
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  const sections: LessonSection[] = [
    {
      headingKey: 't5.demo.heading',
      bodyKey: 't5.demo.body',
      content: (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <button className={chip} onClick={() => playForm('natural minor')}>
              {t('t5.demo.natural')}
            </button>
            <button className={chip} onClick={() => playForm('harmonic minor')}>
              {t('t5.demo.harmonic')}
            </button>
            <button className={chip} onClick={() => playForm('melodic minor')}>
              {t('t5.demo.melodic')}
            </button>
          </div>
          <DegreeRuler tonic={activeKey.tonic} soundingDegree={sounding} showNotes />
        </>
      ),
    },
    {
      headingKey: 't5.widget.heading',
      bodyKey: 't5.widget.body',
      content: (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {MINOR_FORMS.map((f) => (
              <button key={f} className={chip} aria-pressed={form === f} onClick={() => setForm(f)}>
                {t(FORM_LABEL_KEY[f])}
              </button>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <button className={chip} onClick={handleCompare}>
              {t('t5.widget.compare')}
            </button>
          </div>
          <DegreeRuler tonic={activeKey.tonic} soundingDegree={sounding} showNotes />
          <p className="mono mt-4 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {t('t5.widget.selected', { form: t(FORM_LABEL_KEY[form]) })}
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
      nodeId="T5"
      eyebrowKey="t5.eyebrow"
      titleKey="t5.title"
      claimKey="t5.claim"
      sections={sections}
      completeBodyKey="t5.complete.body"
      completeCtaLabelKey="lesson.cta.session"
      onComplete={onComplete}
    />
  )
}
