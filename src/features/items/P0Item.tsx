import { useEffect, useRef, useState } from 'react'
import { Note } from 'tonal'
import { useT } from '../../state/settings'
import { configFor, useMicSettings } from '../../state/mic'
import { useMic } from '../../audio/input/useMic'
import { degreeOf, noteNameOf, pitchClassOf, tonicPitchClassOf } from '../../audio/input/notes'
import { InputMeter } from '../../components/InputMeter'
import { degreeNote } from '../../theory'
import type { KeyDef } from '../../theory/keys'
import type { ItemResult } from './E1Item'

// P0: the app names a degree, the user plays it, then sings it. The point is
// audiation of what the hands already do, so nothing on screen names the
// note until the answer is in — the user has to find it from the degree.
//
// Grading is by pitch class. A sung note lands wherever the voice lives, and
// a played one may be fingered in any octave; neither says anything about
// whether the degree was understood.

type Step = 'play' | 'sing' | 'done'

const STEP_TIMEOUT_MS = 25_000

function noteLabel(midi: number): string {
  return noteNameOf(midi).replace('#', '♯')
}

type Props = {
  itemKey: KeyDef
  degree: number
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
  onOpenCalibration?: () => void
}

export function P0Item({ itemKey, degree, nextLabel, onResult, onNext, onOpenCalibration }: Props) {
  const t = useT()
  const micSettings = useMicSettings()
  const [step, setStep] = useState<Step>('play')
  const [heardMidi, setHeardMidi] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [tapMode, setTapMode] = useState(false)
  const [playedLabel, setPlayedLabel] = useState<string | null>(null)
  const startedAt = useRef(performance.now())
  const reported = useRef(false)

  const targetMidi = Note.midi(degreeNote(itemKey.tonic, degree))
  const targetPc = pitchClassOf(targetMidi ?? 0)
  const tonicPc = tonicPitchClassOf(itemKey.tonic)

  const listening = !tapMode && step !== 'done'

  const mic = useMic({
    active: listening,
    config: configFor(micSettings.noiseFloorRms),
    onNote: (event) => {
      if (event.kind !== 'note') return
      setHeardMidi(event.midi)
      if (pitchClassOf(event.midi) !== targetPc) return
      setStep((current) => {
        if (current === 'play') {
          setPlayedLabel(noteLabel(event.midi))
          setTimedOut(false)
          startedAt.current = performance.now()
          return 'sing'
        }
        if (current === 'sing') {
          finish(true, 'sung')
          return 'done'
        }
        return current
      })
    },
  })

  function finish(correct: boolean, inputMode: ItemResult['inputMode']) {
    if (reported.current) return
    reported.current = true
    onResult({
      correct,
      latencyMs: Math.round(performance.now() - startedAt.current),
      response: correct ? 'produced' : 'missed',
      inputMode,
    })
  }

  useEffect(() => {
    if (step === 'done' || tapMode) return
    setTimedOut(false)
    const id = setTimeout(() => setTimedOut(true), STEP_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [step, tapMode])

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'
  const bigChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-6 py-3 text-[length:var(--fs-4)] font-bold text-[color:var(--ink)]'

  // Feedback names what was heard in degree terms whenever it belongs to the
  // key: "that is degree 3, find 5" teaches, "wrong" does not.
  function heardFeedback(): string | null {
    if (heardMidi === null || pitchClassOf(heardMidi) === targetPc) return null
    const heardDegree = degreeOf(heardMidi, tonicPc)
    return heardDegree === null
      ? t('p0.wrongChromatic', { target: degree })
      : t('p0.wrongDegree', { degree: heardDegree, target: degree })
  }

  if (tapMode) {
    return (
      <>
        <p className="display text-[length:var(--fs-4)]">
          {t('p0.play.prompt', { degree })} · {t('p0.sing.prompt')}
        </p>
        <p className="max-w-[65ch]">{t('p0.tap.body')}</p>
        {step === 'done' ? (
          <button className={chip} onClick={onNext}>
            {nextLabel}
          </button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              className={bigChip}
              onClick={() => {
                finish(true, 'tap')
                setStep('done')
              }}
            >
              {t('p0.tap.did')}
            </button>
            <button
              className={bigChip}
              onClick={() => {
                finish(false, 'tap')
                setStep('done')
              }}
            >
              {t('p0.tap.didnt')}
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {step !== 'done' ? (
        <p className="display text-[length:var(--fs-4)]">
          {step === 'play' ? t('p0.play.prompt', { degree }) : t('p0.sing.prompt')}
        </p>
      ) : null}

      {step === 'sing' && playedLabel ? (
        <p className="mono text-[length:var(--fs-2)]">
          {t('p0.played', { note: playedLabel, degree })}
        </p>
      ) : null}

      {step !== 'done' ? (
        <>
          {micSettings.calibratedAt === null ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="max-w-[65ch]">{t('p0.needsCalibration')}</p>
              {onOpenCalibration ? (
                <button className={chip} onClick={onOpenCalibration}>
                  {t('home.mic.calibrate')}
                </button>
              ) : null}
            </div>
          ) : null}

          {mic.status === 'error' && mic.error ? (
            <p className="max-w-[65ch]" role="alert">
              {t(`cal.error.${mic.error}` as never)}
            </p>
          ) : (
            <>
              <InputMeter rms={mic.rms} floorRms={micSettings.noiseFloorRms} />
              <p className="mono text-[length:var(--fs-2)]" role="status">
                {heardMidi === null ? t('p0.listening') : t('p0.heard', { note: noteLabel(heardMidi) })}
              </p>
              {heardFeedback() ? <p className="max-w-[65ch]">{heardFeedback()}</p> : null}
            </>
          )}

          {timedOut ? <p className="max-w-[65ch]">{t('p0.timeout')}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button className={chip} onClick={() => setTapMode(true)}>
              {t('p0.tap.switch')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {t('p0.sung', { degree, key: itemKey.label })}
          </p>
          <button className={chip} onClick={onNext}>
            {nextLabel}
          </button>
        </>
      )}
    </>
  )
}
