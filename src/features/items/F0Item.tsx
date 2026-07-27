import { useEffect, useRef, useState } from 'react'
import { Note } from 'tonal'
import { useT } from '../../state/settings'
import { configFor, useMicSettings } from '../../state/mic'
import { useMic } from '../../audio/input/useMic'
import { pitchClassOf, tonicPitchClassOf } from '../../audio/input/notes'
import { InputMeter } from '../../components/InputMeter'
import { Fretboard, type Marker } from '../../components/Fretboard'
import { midiAt } from '../../lib/fretboardMath'
import { displayNote, type KeyDef } from '../../theory/keys'
import type { ItemResult } from './E1Item'

// F0: note names in all positions under time pressure (docs/curriculum.md
// §7, mastery: all 12 roots under 8s). The app names a pitch class and a
// string; the user finds and plays it anywhere on that string. Grading is
// by pitch class only (rule 2 of the F-drills brief) — a laptop mic cannot
// tell which string rang, and the tap fallback follows the same rule so a
// tapped octave or an alternate voicing of the same letter still counts.
//
// The 8s countdown is display-only, the same way E3's 3s response-time
// target is: mastery.ts already gates F0 on median latency across the
// attempt window, so there is no forced fail at 0 — the user can keep
// trying, or bail to the tap fallback.

const COUNTDOWN_MS = 8000
const MAX_FRET = 12

// Octave-inclusive spelling for the live "what did I just hear" readout —
// same convention as P0Item's local noteLabel.
function heardLabel(midi: number): string {
  return Note.fromMidi(midi).replace('#', '♯')
}

type Result = {
  midi: number
  correct: boolean
  inputMode: NonNullable<ItemResult['inputMode']>
  // Only set for a tap, whose string is known for certain — a mic reading
  // never tells us which string rang.
  tappedString?: number
  tappedFret?: number
}

type Props = {
  pitchClass: KeyDef
  stringNumber: number
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
  onOpenCalibration?: () => void
}

export function F0Item({ pitchClass, stringNumber, nextLabel, onResult, onNext, onOpenCalibration }: Props) {
  const t = useT()
  const micSettings = useMicSettings()
  const [result, setResult] = useState<Result | null>(null)
  const [heardMidi, setHeardMidi] = useState<number | null>(null)
  const [remainingMs, setRemainingMs] = useState(COUNTDOWN_MS)
  const [timedOut, setTimedOut] = useState(false)
  const [tapMode, setTapMode] = useState(false)
  const startedAt = useRef(performance.now())
  const reported = useRef(false)

  const targetPc = tonicPitchClassOf(pitchClass.tonic)

  const itemId = `${pitchClass.tonic}|${stringNumber}`
  useEffect(() => {
    startedAt.current = performance.now()
    setResult(null)
    setHeardMidi(null)
    setRemainingMs(COUNTDOWN_MS)
    setTimedOut(false)
    reported.current = false
  }, [itemId])

  const listening = !tapMode && !result

  const mic = useMic({
    active: listening,
    config: configFor(micSettings.noiseFloorRms, micSettings.gateMarginDb),
    onNote: (event) => {
      if (event.kind !== 'note') return
      setHeardMidi(event.midi)
      if (pitchClassOf(event.midi) !== targetPc) return
      finish(true, 'played', event.midi)
    },
  })

  // The fret the requested string would need in order to sound this exact
  // MIDI note — only meaningful as "this is plausibly the right string",
  // never a real verification of which string actually rang.
  function fretOnTargetString(midi: number): number | null {
    const fret = midi - midiAt(stringNumber, 0)
    return fret >= 0 && fret <= MAX_FRET ? fret : null
  }

  function finish(correct: boolean, inputMode: Result['inputMode'], midi: number, tapped?: [number, number]) {
    if (reported.current) return
    reported.current = true
    setResult({
      midi,
      correct,
      inputMode,
      tappedString: tapped?.[0],
      tappedFret: tapped?.[1],
    })
    onResult({
      correct,
      latencyMs: Math.round(performance.now() - startedAt.current),
      response: correct ? 'played' : 'missed',
      inputMode,
    })
  }

  // Visible countdown, UI pacing only — never gates correctness.
  useEffect(() => {
    if (result || tapMode) return
    const id = setInterval(() => {
      const left = COUNTDOWN_MS - (performance.now() - startedAt.current)
      setRemainingMs(Math.max(0, left))
      if (left <= 0) setTimedOut(true)
    }, 100)
    return () => clearInterval(id)
  }, [itemId, result, tapMode])

  function handleTap(tappedString: number, tappedFret: number) {
    if (result) return
    const midi = midiAt(tappedString, tappedFret)
    finish(pitchClassOf(midi) === targetPc, 'tap', midi, [tappedString, tappedFret])
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'

  // Known-right-string fret, for the "when it is on the right string" hint:
  // a tap already tells us the string; a mic reading only lets us guess one.
  const knownFret = result
    ? result.tappedString !== undefined
      ? result.tappedString === stringNumber
        ? (result.tappedFret ?? null)
        : null
      : fretOnTargetString(result.midi)
    : null

  const markers: Marker[] = result
    ? result.tappedString !== undefined
      ? [
          {
            string: result.tappedString,
            fret: result.tappedFret!,
            label: displayNote(Note.fromMidi(result.midi)),
            kind: result.correct ? 'correct' : 'wrong',
          },
        ]
      : knownFret !== null
        ? [
            {
              string: stringNumber,
              fret: knownFret,
              label: displayNote(Note.fromMidi(result.midi)),
              kind: result.correct ? 'correct' : 'wrong',
            },
          ]
        : []
    : []

  return (
    <>
      <p className="display text-[length:var(--fs-4)]">
        {t('f0.prompt', { note: pitchClass.label, string: stringNumber })}
      </p>

      {!result ? (
        <p className="mono text-[length:var(--fs-2)]" role="status">
          {t('f0.countdown', { s: Math.ceil(remainingMs / 1000) })}
        </p>
      ) : null}

      <Fretboard
        markers={markers}
        highlightStrings={[stringNumber]}
        onTap={tapMode && !result ? handleTap : undefined}
      />

      {!result ? (
        tapMode ? (
          <p className="max-w-[65ch]">{t('fretboard.tap.body')}</p>
        ) : (
          <>
            {micSettings.calibratedAt === null ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="max-w-[65ch]">{t('fretboard.needsCalibration')}</p>
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
                <InputMeter
                rms={mic.rms}
                floorRms={micSettings.noiseFloorRms}
                gateMarginDb={micSettings.gateMarginDb ?? undefined}
              />
                <p className="mono text-[length:var(--fs-2)]" role="status">
                  {heardMidi === null ? t('fretboard.listening') : t('fretboard.heard', { note: heardLabel(heardMidi) })}
                </p>
              </>
            )}

            {timedOut ? <p className="max-w-[65ch]">{t('fretboard.timeout')}</p> : null}

            <div className="flex flex-wrap gap-3">
              <button className={chip} onClick={() => setTapMode(true)}>
                {t('fretboard.tap.switch')}
              </button>
            </div>
          </>
        )
      ) : (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {result.correct
              ? t('f0.correct', { note: displayNote(Note.fromMidi(result.midi)) })
              : t('f0.incorrect', {
                  note: displayNote(Note.fromMidi(result.midi)),
                  target: pitchClass.label,
                  string: stringNumber,
                })}
          </p>
          {knownFret !== null ? (
            <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
              {t('f0.fretHint', { string: stringNumber, fret: knownFret })}
            </p>
          ) : null}
          <button className={chip} onClick={onNext}>
            {nextLabel}
          </button>
        </>
      )}
    </>
  )
}
