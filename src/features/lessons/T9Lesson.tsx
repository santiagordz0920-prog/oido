import { useEffect, useRef, useState } from 'react'
import { LessonShell, type LessonSection } from './LessonShell'
import { useT } from '../../state/settings'
import { ensureAudio, playProgression } from '../../audio/engine'
import type { KeyDef } from '../../theory/keys'
import type { StringKey } from '../../i18n/strings'

// T9 — cadences and phrase structure (docs/curriculum.md §5 row T9). The
// same four-chord phrase closes differently depending on its last two
// chords: authentic (V–I) hardest, half (…–V) left open, plagal (IV–I)
// softer, deceptive (…–vi) a surprise.

type Props = {
  activeKey: KeyDef
  onComplete: () => void
}

type CadenceId = 'authentic' | 'half' | 'plagal' | 'deceptive'

const CADENCES: Record<CadenceId, string[]> = {
  authentic: ['I', 'IV', 'V', 'I'],
  half: ['I', 'ii', 'IV', 'V'],
  plagal: ['I', 'V', 'IV', 'I'],
  deceptive: ['I', 'IV', 'V', 'vi'],
}

const CADENCE_LABEL_KEY: Record<CadenceId, StringKey> = {
  authentic: 't9.demo.authentic',
  half: 't9.demo.half',
  plagal: 't9.demo.plagal',
  deceptive: 't9.demo.deceptive',
}

const CADENCE_IDS: CadenceId[] = ['authentic', 'half', 'plagal', 'deceptive']

type Ending = { label: string; chords: [string, string] }

const ENDINGS: Ending[] = [
  { label: 'V–I', chords: ['V', 'I'] },
  { label: 'V–vi', chords: ['V', 'vi'] },
  { label: 'IV–I', chords: ['IV', 'I'] },
  { label: 'ii–V', chords: ['ii', 'V'] },
]

export function T9Lesson({ activeKey, onComplete }: Props) {
  const t = useT()
  const [demoNumerals, setDemoNumerals] = useState<string[]>(CADENCES.authentic)
  const [demoIdx, setDemoIdx] = useState(-1)
  const [widgetNumerals, setWidgetNumerals] = useState<string[]>(['I', 'IV', ...ENDINGS[0].chords])
  const [widgetIdx, setWidgetIdx] = useState(-1)
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

  function playCadence(id: CadenceId) {
    const numerals = CADENCES[id]
    setDemoNumerals(numerals)
    setDemoIdx(-1)
    void withAudio(async () => {
      await playProgression(activeKey.tonic, numerals, {
        onChord: (i) => {
          if (mounted.current) setDemoIdx(i)
        },
      })
    })
  }

  function playEnding(ending: Ending) {
    const numerals = ['I', 'IV', ...ending.chords]
    setWidgetNumerals(numerals)
    setWidgetIdx(-1)
    void withAudio(async () => {
      await playProgression(activeKey.tonic, numerals, {
        onChord: (i) => {
          if (mounted.current) setWidgetIdx(i)
        },
      })
    })
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'
  const numeralChip = (sounding: boolean) =>
    `mono snap border-[length:var(--rule)] border-[var(--ink)] px-3 py-2 text-[length:var(--fs-2)] font-bold ${
      sounding ? 'key-chip' : 'bg-[var(--surface)]'
    }`

  const sections: LessonSection[] = [
    {
      headingKey: 't9.demo.heading',
      bodyKey: 't9.demo.body',
      bodyVars: { key: activeKey.label },
      content: (
        <>
          <div className="mb-4 flex flex-wrap gap-1" role="status">
            {demoNumerals.map((n, i) => (
              <span key={i} className={numeralChip(demoIdx === i)}>
                {n}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {CADENCE_IDS.map((id) => (
              <button key={id} className={chip} onClick={() => playCadence(id)}>
                {t(CADENCE_LABEL_KEY[id])}
              </button>
            ))}
          </div>
        </>
      ),
    },
    {
      headingKey: 't9.widget.heading',
      bodyKey: 't9.widget.body',
      content: (
        <>
          <div className="mb-2 mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {t('t9.widget.opening')}
          </div>
          <div className="mb-4 flex flex-wrap gap-1" role="status">
            {widgetNumerals.map((n, i) => (
              <span key={i} className={numeralChip(widgetIdx === i)}>
                {n}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {ENDINGS.map((ending) => (
              <button key={ending.label} className={chip} onClick={() => playEnding(ending)}>
                {ending.label}
              </button>
            ))}
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
      nodeId="T9"
      eyebrowKey="t9.eyebrow"
      titleKey="t9.title"
      claimKey="t9.claim"
      sections={sections}
      completeBodyKey="t9.complete.body"
      completeCtaLabelKey="lesson.cta.session"
      onComplete={onComplete}
    />
  )
}
