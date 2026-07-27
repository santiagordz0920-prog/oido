import { useEffect, useRef, useState } from 'react'
import { useT } from '../../state/settings'
import { ensureAudio, playScaleForm, stop } from '../../audio/engine'
import type { KeyDef } from '../../theory/keys'
import type { ScaleForm } from '../../theory'
import type { StringKey } from '../../i18n/strings'
import type { ItemResult } from './E1Item'

// E4: minor in three forms, contrasted against parallel major
// (docs/curriculum.md §6). The stimulus is the bare scale ascending from the
// tonic — no cadence, no resolution playback, because the target is the
// shape of the scale (its half/whole-step pattern), not a functional degree.
// Answer chips name the form in plain words, not scale degrees or numerals.

const FORMS: ScaleForm[] = ['major', 'natural minor', 'harmonic minor', 'melodic minor']

const FORM_KEY: Record<ScaleForm, StringKey> = {
  major: 'e4.form.major',
  'natural minor': 'e4.form.naturalMinor',
  'harmonic minor': 'e4.form.harmonicMinor',
  'melodic minor': 'e4.form.melodicMinor',
}

type Phase = 'playing' | 'answering' | 'feedback'

type Props = {
  itemKey: KeyDef
  form: ScaleForm
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
}

export function E4Item({ itemKey, form, nextLabel, onResult, onNext }: Props) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('playing')
  const [picked, setPicked] = useState<ScaleForm | null>(null)
  const [audioError, setAudioError] = useState(false)
  const answerStart = useRef(0)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      stop()
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

  function present() {
    setPhase('playing')
    setPicked(null)
    void withAudio(async () => {
      await playScaleForm(itemKey.tonic, form)
      if (mounted.current) {
        answerStart.current = performance.now()
        setPhase('answering')
      }
    })
  }

  const itemId = `${itemKey.tonic}|${form}`
  useEffect(() => {
    present()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  function handleAnswer(f: ScaleForm) {
    if (phase !== 'answering') return
    setPicked(f)
    setPhase('feedback')
    onResult({
      correct: f === form,
      latencyMs: Math.round(performance.now() - answerStart.current),
      response: f,
    })
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-6 py-3 text-[length:var(--fs-3)] font-bold'
  const smallChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  const formLabel = (f: ScaleForm) => t(FORM_KEY[f])

  return (
    <>
      {phase === 'playing' ? (
        <p className="mono text-[length:var(--fs-3)]" role="status">
          {t('e4.listening')}
        </p>
      ) : null}

      {phase === 'answering' ? (
        <>
          <p className="display text-[length:var(--fs-4)]">{t('e4.prompt')}</p>
          <div className="flex flex-wrap gap-3">
            {FORMS.map((f) => (
              <button key={f} className={`${chip} text-[color:var(--ink)]`} onClick={() => handleAnswer(f)}>
                {formLabel(f)}
              </button>
            ))}
          </div>
          <button className={`${smallChip} self-start text-[color:var(--ink)]`} onClick={present}>
            {t('e4.replay')}
          </button>
        </>
      ) : null}

      {phase === 'feedback' ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {picked === form
              ? t('e4.correct', { form: formLabel(form) })
              : t('e4.incorrect', { form: formLabel(form) })}
          </p>
          <div className="flex flex-wrap gap-3">
            <button className={`${smallChip} text-[color:var(--ink)]`} onClick={present}>
              {t('e4.replay')}
            </button>
            <button className={`${smallChip} text-[color:var(--ink)]`} onClick={onNext}>
              {nextLabel}
            </button>
          </div>
        </>
      ) : null}

      {audioError ? (
        <p className="mono text-[length:var(--fs-1)]" role="alert">
          {t('audio.error')}
        </p>
      ) : null}
    </>
  )
}
