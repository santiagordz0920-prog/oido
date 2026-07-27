import { useEffect, useRef, useState } from 'react'
import { Note } from 'tonal'
import { useT } from '../../state/settings'
import { configFor, useMicSettings } from '../../state/mic'
import { useMic } from '../../audio/input/useMic'
import { pitchClassOf, tonicPitchClassOf } from '../../audio/input/notes'
import { InputMeter } from '../../components/InputMeter'
import { Fretboard, type Marker } from '../../components/Fretboard'
import { midiAt } from '../../lib/fretboardMath'
import { degreeNote } from '../../theory'
import { displayNote, type KeyDef } from '../../theory/keys'
import type { ItemResult } from './E1Item'

// F1: degrees from a given root across string pairs (docs/curriculum.md §7,
// mastery: 90%). The root's position(s) on the two strings in play are
// shown as target markers so the user has to find the degree relative to
// them rather than from an absolute fret number. Grading is by pitch class
// (rule 2 of the F-drills brief), same as every other fretboard item.

const STEP_TIMEOUT_MS = 20_000
const FRETS = 12

function heardLabel(midi: number): string {
  return Note.fromMidi(midi).replace('#', '♯')
}

// Lowest fret on `stringNumber` that sounds `pc` — always found within one
// octave (0..11), since a string's twelve consecutive frets carry every
// pitch class exactly once.
function lowestFretFor(stringNumber: number, pc: number): number {
  let fret = 0
  while (fret <= FRETS && pitchClassOf(midiAt(stringNumber, fret)) !== pc) fret++
  return Math.min(fret, FRETS)
}

type Result = {
  midi: number
  correct: boolean
  inputMode: NonNullable<ItemResult['inputMode']>
  tappedString?: number
  tappedFret?: number
}

type Props = {
  root: KeyDef
  degree: number
  stringSet: [number, number]
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
  onOpenCalibration?: () => void
}

export function F1Item({ root, degree, stringSet, nextLabel, onResult, onNext, onOpenCalibration }: Props) {
  const t = useT()
  const micSettings = useMicSettings()
  const [result, setResult] = useState<Result | null>(null)
  const [heardMidi, setHeardMidi] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [tapMode, setTapMode] = useState(false)
  const startedAt = useRef(performance.now())
  const reported = useRef(false)

  const rootPc = tonicPitchClassOf(root.tonic)
  const targetMidi = Note.midi(degreeNote(root.tonic, degree))
  const targetPc = pitchClassOf(targetMidi ?? 0)

  const itemId = `${root.tonic}|${degree}|${stringSet.join('-')}`
  useEffect(() => {
    startedAt.current = performance.now()
    setResult(null)
    setHeardMidi(null)
    setTimedOut(false)
    reported.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function finish(correct: boolean, inputMode: Result['inputMode'], midi: number, tapped?: [number, number]) {
    if (reported.current) return
    reported.current = true
    setResult({ midi, correct, inputMode, tappedString: tapped?.[0], tappedFret: tapped?.[1] })
    onResult({
      correct,
      latencyMs: Math.round(performance.now() - startedAt.current),
      response: correct ? 'played' : 'missed',
      inputMode,
    })
  }

  useEffect(() => {
    if (result || tapMode) return
    setTimedOut(false)
    const id = setTimeout(() => setTimedOut(true), STEP_TIMEOUT_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, result, tapMode])

  function handleTap(tappedString: number, tappedFret: number) {
    if (result) return
    const midi = midiAt(tappedString, tappedFret)
    finish(pitchClassOf(midi) === targetPc, 'tap', midi, [tappedString, tappedFret])
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'

  const rootMarkers: Marker[] = stringSet.map((s) => ({
    string: s,
    fret: lowestFretFor(s, rootPc),
    label: root.label,
    kind: 'target',
  }))
  const resultMarker: Marker[] =
    result && result.tappedString !== undefined
      ? [
          {
            string: result.tappedString,
            fret: result.tappedFret!,
            label: displayNote(Note.fromMidi(result.midi)),
            kind: result.correct ? 'correct' : 'wrong',
          },
        ]
      : []

  return (
    <>
      <p className="display text-[length:var(--fs-4)]">
        {t('f1.prompt', { degree, a: stringSet[0], b: stringSet[1] })}
      </p>

      <Fretboard
        markers={[...rootMarkers, ...resultMarker]}
        highlightStrings={stringSet}
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
              ? t('f1.correct', { degree })
              : t('f1.incorrect', { degree, note: displayNote(Note.fromMidi(result.midi)) })}
          </p>
          <button className={chip} onClick={onNext}>
            {nextLabel}
          </button>
        </>
      )}
    </>
  )
}
