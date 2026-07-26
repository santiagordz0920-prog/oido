import { useEffect, useRef, useState } from 'react'
import { DegreeRuler } from '../components/DegreeRuler'
import { useT } from '../state/settings'
import { useProgress } from '../state/progress'
import { ensureAudio, playDegreeAgainstTonic, playScale, stop } from '../audio/engine'
import { KEYS, type KeyDef } from '../theory/keys'
import type { StringKey } from '../i18n/strings'

// T2 — the major scale as the measuring ruler. Four parts per docs/curriculum.md §5:
// a claim, an audible demonstration, a manipulable widget, and check questions.

type Check = {
  prompt: StringKey
  options: string[]
  answer: string
}

const CHECKS: Check[] = [
  { prompt: 't2.q1.prompt', options: ['1', '3', '5', '7'], answer: '1' },
  { prompt: 't2.q2.prompt', options: ['5', '7', '8', '12'], answer: '7' },
  { prompt: 't2.q3.prompt', options: ['A', 'B', 'G♯', 'C♯'], answer: 'B' },
  { prompt: 't2.q4.prompt', options: ['C', 'C♯', 'E♭', 'D'], answer: 'C' },
]

type Props = {
  activeKey: KeyDef
  onKeyChange: (k: KeyDef) => void
  onGoToDrill: () => void
}

export function T2Lesson({ activeKey, onKeyChange, onGoToDrill }: Props) {
  const t = useT()
  const { t2Complete, completeT2 } = useProgress()
  const [sounding, setSounding] = useState(0)
  const [audioError, setAudioError] = useState(false)
  const [playing, setPlaying] = useState(false)

  // Check-question state
  const [qIndex, setQIndex] = useState(0)
  const [optionsShown, setOptionsShown] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const done = qIndex >= CHECKS.length

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      stop()
    }
  }, [])

  useEffect(() => {
    if (done && !t2Complete) completeT2()
  }, [done, t2Complete, completeT2])

  async function withAudio(fn: () => Promise<void>) {
    try {
      setAudioError(false)
      await ensureAudio()
      await fn()
    } catch {
      if (mounted.current) setAudioError(true)
    }
  }

  function handlePlayScale() {
    if (playing) {
      stop()
      setPlaying(false)
      setSounding(0)
      return
    }
    setPlaying(true)
    void withAudio(async () => {
      await playScale(activeKey.tonic, (d) => {
        if (mounted.current) setSounding(d)
      })
      if (mounted.current) setPlaying(false)
    })
  }

  function handleTapDegree(d: number) {
    setSounding(d)
    void withAudio(() => playDegreeAgainstTonic(activeKey.tonic, d))
  }

  function handlePick(option: string) {
    setPicked(option)
    if (option === CHECKS[qIndex].answer) {
      // UI pacing, not musical timing — setTimeout is fine here
      setTimeout(() => {
        if (!mounted.current) return
        setQIndex((i) => i + 1)
        setOptionsShown(false)
        setPicked(null)
      }, 700)
    }
  }

  const section = 'border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] p-4 sm:p-6'
  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-3)] font-bold'

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <div>
        <div className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">{t('t2.eyebrow')}</div>
        <h1 className="display text-[length:var(--fs-5)] leading-tight sm:text-[length:var(--fs-6)]">
          {t('t2.title')}
        </h1>
      </div>

      <p className="max-w-[65ch]">{t('t2.claim')}</p>

      {/* 2. Audible demonstration */}
      <section className={section}>
        <h2 className="display mb-2 text-[length:var(--fs-3)]">{t('t2.demo.heading')}</h2>
        <p className="mb-4 max-w-[65ch]">{t('t2.demo.body', { key: activeKey.label })}</p>
        <DegreeRuler tonic={activeKey.tonic} soundingDegree={sounding} />
        <button className={`${chip} mt-4`} onClick={handlePlayScale}>
          {playing ? t('t2.demo.stop') : t('t2.demo.play')}
        </button>
      </section>

      {/* 3. Manipulable widget */}
      <section className={section}>
        <h2 className="display mb-2 text-[length:var(--fs-3)]">{t('t2.widget.heading')}</h2>
        <p className="mb-4 max-w-[65ch]">{t('t2.widget.body')}</p>
        <div className="mb-4 flex flex-wrap items-center gap-1">
          <span className="mono mr-2 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {t('t2.widget.keyLabel')}
          </span>
          {KEYS.map((k) => (
            <button
              key={k.tonic}
              onClick={() => {
                stop()
                setSounding(0)
                onKeyChange(k)
              }}
              aria-pressed={k.tonic === activeKey.tonic}
              className={`mono snap border px-2 py-1 text-[length:var(--fs-1)] ${
                k.tonic === activeKey.tonic
                  ? 'key-chip border-[var(--ink)] font-bold'
                  : 'border-[var(--ink-dim)] bg-[var(--surface)]'
              }`}
              style={{ ['--active-key-hue' as string]: `${k.hue}deg` }}
            >
              {k.label}
            </button>
          ))}
        </div>
        <DegreeRuler tonic={activeKey.tonic} soundingDegree={sounding} onTap={handleTapDegree} showNotes />
      </section>

      {/* 4. Check questions */}
      <section className={section}>
        <h2 className="display mb-2 text-[length:var(--fs-3)]">{t('t2.check.heading')}</h2>
        {!done ? (
          <>
            <div className="mono mb-2 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
              {t('t2.check.progress', { n: qIndex + 1, total: CHECKS.length })}
            </div>
            <p className="mb-3 max-w-[65ch] text-[length:var(--fs-3)]">{t(CHECKS[qIndex].prompt)}</p>
            {!optionsShown ? (
              <>
                <p className="mb-3 text-[color:var(--ink-dim)]">{t('t2.check.think')}</p>
                <button className={chip} onClick={() => setOptionsShown(true)}>
                  {t('t2.check.showOptions')}
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {CHECKS[qIndex].options.map((o) => (
                    <button key={o} className={chip} onClick={() => handlePick(o)} aria-pressed={picked === o}>
                      {o}
                    </button>
                  ))}
                </div>
                {picked !== null ? (
                  <p className="mono mt-3 text-[length:var(--fs-2)] font-bold" role="status">
                    {picked === CHECKS[qIndex].answer ? t('t2.check.correct') : t('t2.check.incorrect')}
                  </p>
                ) : null}
              </>
            )}
          </>
        ) : (
          <div role="status">
            <h3 className="display text-[length:var(--fs-4)]">{t('t2.complete.title')}</h3>
            <p className="mb-4 max-w-[65ch]">{t('t2.complete.body')}</p>
            <button className={chip} onClick={onGoToDrill}>
              {t('t2.complete.cta')}
            </button>
          </div>
        )}
      </section>

      {audioError ? (
        <p className="mono text-[length:var(--fs-1)]" role="alert">
          {t('audio.error')}
        </p>
      ) : null}
    </div>
  )
}
