import { useEffect, useRef, useState } from 'react'
import { LessonShell, type LessonSection } from './LessonShell'
import { useT } from '../../state/settings'
import { ensureAudio, playProgression } from '../../audio/engine'
import type { KeyDef } from '../../theory/keys'
import type { StringKey } from '../../i18n/strings'

// T8 — functional harmony: tonic, subdominant, dominant (docs/curriculum.md
// §5 row T8). The most important lesson in the app: every diatonic chord
// does one of three jobs — sit at home (T), move away (S), or pull back
// home (D).

type Props = {
  activeKey: KeyDef
  onComplete: () => void
}

type Function = 'T' | 'S' | 'D'

const FUNCTION_OF: Record<string, Function> = {
  I: 'T',
  vi: 'T',
  iii: 'T',
  IV: 'S',
  ii: 'S',
  V: 'D',
  'vii°': 'D',
}

const DEMO_NUMERALS = ['I', 'IV', 'V', 'I']
const DEMO_FUNCTIONS = DEMO_NUMERALS.map((n) => FUNCTION_OF[n])

const FAMILY_NUMERALS: Record<Function, string[]> = {
  T: ['I', 'vi', 'iii'],
  S: ['IV', 'ii'],
  D: ['V', 'vii°'],
}

const PHRASE_TSDT = ['I', 'IV', 'V', 'I']
const PHRASE_TDST = ['I', 'V', 'IV', 'I']

export function T8Lesson({ activeKey, onComplete }: Props) {
  const t = useT()
  const [soundingIdx, setSoundingIdx] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [lastPhrase, setLastPhrase] = useState<StringKey | null>(null)
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

  function handlePlayDemo() {
    setPlaying(true)
    void withAudio(async () => {
      await playProgression(activeKey.tonic, DEMO_NUMERALS, {
        onChord: (i) => {
          if (mounted.current) setSoundingIdx(i)
        },
      })
      if (mounted.current) setPlaying(false)
    })
  }

  function playFamily(fam: Function) {
    setLastPhrase(null)
    void withAudio(() => playProgression(activeKey.tonic, FAMILY_NUMERALS[fam]))
  }

  function playPhrase(numerals: string[], labelKey: StringKey) {
    setLastPhrase(labelKey)
    void withAudio(() => playProgression(activeKey.tonic, numerals))
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'
  const numeralChip = (i: number) =>
    `mono snap border-[length:var(--rule)] border-[var(--ink)] px-3 py-2 text-[length:var(--fs-2)] font-bold ${
      soundingIdx === i ? 'key-chip' : 'bg-[var(--surface)]'
    }`

  const sections: LessonSection[] = [
    {
      headingKey: 't8.demo.heading',
      bodyKey: 't8.demo.body',
      bodyVars: { key: activeKey.label },
      content: (
        <>
          <div className="mb-4 flex flex-wrap gap-1" role="status">
            {DEMO_NUMERALS.map((n, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className={numeralChip(i)}>{n}</span>
                <span
                  className={`mono text-[length:var(--fs-1)] ${
                    soundingIdx === i ? 'font-bold text-[color:var(--ink)]' : 'text-[color:var(--ink-dim)]'
                  }`}
                >
                  {DEMO_FUNCTIONS[i]}
                </span>
              </div>
            ))}
          </div>
          <button className={chip} onClick={handlePlayDemo}>
            {playing ? t('t8.demo.stop') : t('t8.demo.play')}
          </button>
        </>
      ),
    },
    {
      headingKey: 't8.widget.heading',
      bodyKey: 't8.widget.body',
      content: (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <button className={chip} onClick={() => playFamily('T')}>
              {t('t8.widget.playT')}
            </button>
            <button className={chip} onClick={() => playFamily('S')}>
              {t('t8.widget.playS')}
            </button>
            <button className={chip} onClick={() => playFamily('D')}>
              {t('t8.widget.playD')}
            </button>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <button className={chip} onClick={() => playPhrase(PHRASE_TSDT, 't8.widget.phraseTSDT')}>
              {t('t8.widget.phraseTSDT')}
            </button>
            <button className={chip} onClick={() => playPhrase(PHRASE_TDST, 't8.widget.phraseTDST')}>
              {t('t8.widget.phraseTDST')}
            </button>
          </div>
          {lastPhrase ? (
            <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
              {t('t8.widget.lastPhrase', { phrase: t(lastPhrase) })}
            </p>
          ) : null}
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
      nodeId="T8"
      eyebrowKey="t8.eyebrow"
      titleKey="t8.title"
      claimKey="t8.claim"
      sections={sections}
      completeBodyKey="t8.complete.body"
      completeCtaLabelKey="lesson.cta.session"
      onComplete={onComplete}
    />
  )
}
