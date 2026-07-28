import { useEffect, useRef, useState } from 'react'
import { Note } from 'tonal'
import { useT } from '../../state/settings'
import { configFor, useMicSettings } from '../../state/mic'
import { useMic } from '../../audio/input/useMic'
import { ensureAudio, playProgression, stop } from '../../audio/engine'
import { pitchClassOf, tonicPitchClassOf } from '../../audio/input/notes'
import { InputMeter } from '../../components/InputMeter'
import { Fretboard, type Marker } from '../../components/Fretboard'
import { midiAt } from '../../lib/fretboardMath'
import { parseNumeral } from '../../theory'
import { displayNote, type KeyDef } from '../../theory/keys'
import { f5TargetPitchClass, F5_NUMERALS } from '../../scheduler/items'
import type { ItemResult } from './E1Item'

// F5: scale degree relative to a moving root (docs/curriculum.md §7,
// mastery: 85%). A fixed I-IV-V-vi progression sounds chord by chord
// (audio/engine.ts playProgression); the last chord played is always the
// target, so its extra hold (chordSeconds * 1.6, built into playProgression)
// is what gives the user room to answer while it still rings. The target
// pitch class comes from f5TargetPitchClass, which reads the degree off the
// sounding chord's own quality — 1/3/5/♭7, never an interval name.

const FRETS = 12

function heardLabel(midi: number): string {
  return Note.fromMidi(midi).replace('#', '♯')
}

function lowestFretFor(stringNumber: number, pc: number): number {
  let fret = 0
  while (fret <= FRETS && pitchClassOf(midiAt(stringNumber, fret)) !== pc) fret++
  return Math.min(fret, FRETS)
}

function degreeLabel(degree: string): string {
  return degree === 'b7' ? '♭7' : degree
}

type Phase = 'playing' | 'answering'

type Result = {
  midi: number
  correct: boolean
  inputMode: NonNullable<ItemResult['inputMode']>
  tappedString?: number
  tappedFret?: number
}

type Props = {
  itemKey: KeyDef
  numeralIndex: number
  degree: string
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
  onOpenCalibration?: () => void
}

export function F5Item({
  itemKey,
  numeralIndex,
  degree,
  nextLabel,
  onResult,
  onNext,
  onOpenCalibration,
}: Props) {
  const t = useT()
  const micSettings = useMicSettings()
  const [phase, setPhase] = useState<Phase>('playing')
  const [result, setResult] = useState<Result | null>(null)
  const [heardMidi, setHeardMidi] = useState<number | null>(null)
  const [tapMode, setTapMode] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const startedAt = useRef(performance.now())
  const reported = useRef(false)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      stop()
    }
  }, [])

  const numeral = F5_NUMERALS[numeralIndex]
  const chordRoot = parseNumeral(itemKey.tonic, numeral).root
  const chordRootPc = tonicPitchClassOf(chordRoot)
  const targetPc = f5TargetPitchClass(itemKey.tonic, numeral, degree)

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
    setResult(null)
    setHeardMidi(null)
    setTapMode(false)
    reported.current = false
    void withAudio(async () => {
      await playProgression(itemKey.tonic, F5_NUMERALS.slice(0, numeralIndex + 1), {
        onChord: (i) => {
          if (i === numeralIndex && mounted.current) {
            startedAt.current = performance.now()
            setPhase('answering')
          }
        },
      })
    })
  }

  const itemId = `${itemKey.tonic}|${numeralIndex}|${degree}`
  useEffect(() => {
    present()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  const listening = phase === 'answering' && !tapMode && !result

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

  function handleTap(tappedString: number, tappedFret: number) {
    if (result) return
    const midi = midiAt(tappedString, tappedFret)
    finish(pitchClassOf(midi) === targetPc, 'tap', midi, [tappedString, tappedFret])
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'

  const rootMarkers: Marker[] = [1, 2, 3, 4, 5, 6].map((s) => ({
    string: s,
    fret: lowestFretFor(s, chordRootPc),
    label: displayNote(chordRoot),
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
      <p className="mono text-[length:var(--fs-1)]">{t('f5.chordIs', { numeral })}</p>

      {phase === 'playing' ? (
        <p className="mono text-[length:var(--fs-3)]" role="status">
          {t('f5.listening')}
        </p>
      ) : null}

      {phase === 'answering' ? (
        <p className="display text-[length:var(--fs-4)]">{t('f5.prompt', { degree: degreeLabel(degree) })}</p>
      ) : null}

      {phase === 'answering' ? (
        <Fretboard
          markers={[...rootMarkers, ...resultMarker]}
          onTap={tapMode && !result ? handleTap : undefined}
        />
      ) : null}

      {phase === 'answering' && !result ? (
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

            <div className="flex flex-wrap gap-3">
              <button className={chip} onClick={() => setTapMode(true)}>
                {t('fretboard.tap.switch')}
              </button>
              <button className={chip} onClick={present}>
                {t('f5.replay')}
              </button>
            </div>
          </>
        )
      ) : null}

      {result ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {result.correct
              ? t('f5.correct', { degree: degreeLabel(degree) })
              : t('f5.incorrect', { degree: degreeLabel(degree), note: displayNote(Note.fromMidi(result.midi)) })}
          </p>
          <button className={chip} onClick={onNext}>
            {nextLabel}
          </button>
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
