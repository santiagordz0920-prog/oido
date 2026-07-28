import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../../state/settings'
import { configFor, useMicSettings } from '../../state/mic'
import { useMic } from '../../audio/input/useMic'
import { InputMeter } from '../../components/InputMeter'
import { Fretboard, type Marker } from '../../components/Fretboard'
import { midiAt, positionsFor } from '../../lib/fretboardMath'
import { tonicPitchClassOf } from '../../audio/input/notes'
import {
  createClockBridge,
  degreeInChord,
  gradeTargets,
  type BarWindow,
  type PlayedNote,
  type TargetVerdict,
} from '../../audio/input/improv'
import { startPlayAlong, type PlayAlong } from '../../audio/playalong'
import { chordDegreePitchClass, parseNumeral, type ChordDegree } from '../../theory'
import { loadProgressionFrequency, topProgressions } from '../../curriculum/progressions'
import { P3_POOL_SIZE } from '../../scheduler/items'
import type { KeyDef } from '../../theory/keys'
import type { ItemResult } from './E1Item'

// P3: target practice (docs/curriculum.md §8). A vamp loops, the user
// improvises freely, and a named chord tone has to land on beat 1 of every
// bar. The Play-Along Engine supplies the changes and the downbeats; Tier 1
// supplies the notes; improv.ts decides what landed where.
//
// The tap fallback is deliberately a smaller drill rather than a fake
// version of this one. Tapping cannot rehearse landing a note in time, so it
// asks the thing it can actually ask: where is the named chord tone on this
// chord? That is the knowledge the timed version depends on, and the UI says
// which one the user did.

const BARS_TO_GRADE = 8
const BPM = 84

type Phase = 'ready' | 'running' | 'feedback'

// Notes are timestamped by the detector, which runs late by a known amount
// (improv.ts DETECTION_LATENCY_MS), so grading a moment after the last bar
// ends is about waiting for already-timestamped notes to arrive — not about
// musical timing, which stays on the Transport.
const GRADING_GRACE_MS = 500

type Props = {
  itemKey: KeyDef
  rank: number
  target: ChordDegree
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
  onOpenCalibration?: () => void
}

export function P3Item({ itemKey, rank, target, nextLabel, onResult, onNext, onOpenCalibration }: Props) {
  const t = useT()
  const micSettings = useMicSettings()

  const [numerals, setNumerals] = useState<string[] | null>(null)
  const [phase, setPhase] = useState<Phase>('ready')
  const [countIn, setCountIn] = useState<number | null>(null)
  const [barsDone, setBarsDone] = useState(0)
  const [currentNumeral, setCurrentNumeral] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<TargetVerdict | null>(null)
  const [tapMode, setTapMode] = useState(false)
  const [tapped, setTapped] = useState<Array<{ correct: boolean; midi: number; string: number; fret: number }>>([])
  const [audioError, setAudioError] = useState(false)

  const track = useRef<PlayAlong | null>(null)
  const windows = useRef<BarWindow[]>([])
  const notes = useRef<PlayedNote[]>([])
  const bridge = useRef(createClockBridge())
  const startedAt = useRef(performance.now())
  const reported = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      track.current?.stop()
    }
  }, [])

  const itemId = `${itemKey.tonic}|${rank}|${target}`
  useEffect(() => {
    let cancelled = false
    setNumerals(null)
    setPhase('ready')
    setVerdict(null)
    setTapped([])
    setTapMode(false)
    setBarsDone(0)
    setCurrentNumeral(null)
    reported.current = false
    windows.current = []
    notes.current = []
    bridge.current.reset()
    startedAt.current = performance.now()
    void loadProgressionFrequency().then((data) => {
      if (cancelled) return
      const entry = topProgressions(data, 'major', 'two', P3_POOL_SIZE)[rank]
      setNumerals(entry ? entry.p : ['I', 'IV'])
    })
    return () => {
      cancelled = true
      track.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  const listening = phase === 'running' && !tapMode

  const mic = useMic({
    active: listening,
    config: configFor(micSettings.noiseFloorRms, micSettings.gateMarginDb),
    onNote: (event) => {
      if (event.kind !== 'note') return
      notes.current.push({ midi: event.midi, atMs: bridge.current.wallMsFor(event.tMs) })
    },
  })

  function finish(v: TargetVerdict, mode: 'played' | 'tap') {
    if (reported.current) return
    reported.current = true
    setVerdict(v)
    setPhase('feedback')
    onResult({
      correct: v.correct,
      latencyMs: Math.round(performance.now() - startedAt.current),
      response: `${v.hits}/${v.total}`,
      inputMode: mode,
    })
  }

  async function start() {
    if (!numerals) return
    setAudioError(false)
    setPhase('running')
    setBarsDone(0)
    windows.current = []
    notes.current = []
    bridge.current.reset()
    startedAt.current = performance.now()
    try {
      const handle = await startPlayAlong({
        tonic: itemKey.tonic,
        numerals,
        bpm: BPM,
        feel: 'straight',
        barsPerChord: 1,
        onBar: (bar) => {
          // The audio-clock callback, so the window is recorded against the
          // downbeat's real time rather than a repaint's.
          const absolute = bar.pass * numerals.length + bar.barIndex
          if (absolute < BARS_TO_GRADE) {
            windows.current.push({
              barIndex: absolute,
              chordIndex: bar.chordIndex,
              numeral: bar.numeral,
              atMs: bar.atMs,
              barMs: bar.barMs,
            })
          }
        },
        onBarDraw: (bar) => {
          if (!mounted.current) return
          const absolute = bar.pass * numerals.length + bar.barIndex
          setCountIn(null)
          setCurrentNumeral(bar.numeral)
          setBarsDone(Math.min(absolute, BARS_TO_GRADE))
          // Drawn on the audio clock at the moment the bar is heard, so this
          // fires exactly when the last graded bar has finished sounding.
          if (absolute >= BARS_TO_GRADE) {
            track.current?.stop()
            track.current = null
            setTimeout(() => {
              if (!mounted.current) return
              finish(gradeTargets(itemKey.tonic, windows.current, notes.current, target), 'played')
            }, GRADING_GRACE_MS)
          }
        },
        onCountIn: (beatsLeft) => {
          if (mounted.current) setCountIn(beatsLeft)
        },
      })
      if (!mounted.current) {
        handle.stop()
        return
      }
      track.current = handle
    } catch {
      if (mounted.current) {
        setAudioError(true)
        setPhase('ready')
      }
    }
  }

  // The tap version: name the target tone on each chord of the vamp, once
  // per chord, untimed.
  function handleTap(string: number, fret: number) {
    if (!numerals || phase === 'feedback') return
    const chordIndex = tapped.length
    if (chordIndex >= numerals.length) return
    const midi = midiAt(string, fret)
    const correct = degreeInChord(itemKey.tonic, numerals[chordIndex], midi) === target
    const next = [...tapped, { correct, midi, string, fret }]
    setTapped(next)
    if (next.length === numerals.length) {
      const hits = next.filter((x) => x.correct).length
      finish(
        {
          bars: next.map((x, i) => ({
            barIndex: i,
            target,
            hit: x.correct,
            played: degreeInChord(itemKey.tonic, numerals[i], x.midi),
            offsetMs: null,
          })),
          hits,
          total: next.length,
          correct: hits === next.length,
        },
        'tap',
      )
    }
  }

  const tapChordIndex = tapped.length
  // Where the taps actually landed, numbered by which chord they answered.
  const tapMarkers: Marker[] = useMemo(
    () =>
      tapped.map((x, i) => ({
        string: x.string,
        fret: x.fret,
        label: String(i + 1),
        kind: x.correct ? ('correct' as const) : ('wrong' as const),
      })),
    [tapped],
  )

  // While running, show where the target tone lives on the chord that is
  // sounding — this drill trains landing it, not hunting for it.
  const targetMarkers: Marker[] = useMemo(() => {
    const numeral = currentNumeral ?? numerals?.[tapMode ? tapChordIndex : 0]
    if (!numeral) return []
    const spec = parseNumeral(itemKey.tonic, numeral)
    const pc = chordDegreePitchClass(spec, target)
    if (pc === null) return []
    return positionsFor([tonicPitchClassOf(pc)]).map((p) => ({
      string: p.string,
      fret: p.fret,
      label: String(target),
    }))
  }, [currentNumeral, numerals, itemKey.tonic, target, tapMode, tapChordIndex])

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'

  if (!numerals) {
    return (
      <p className="mono text-[length:var(--fs-2)]" role="status">
        {t('playalong.loadingCorpus')}
      </p>
    )
  }

  return (
    <>
      <p className="display text-[length:var(--fs-4)]">{t('p3.prompt', { degree: target })}</p>
      <p className="mono text-[length:var(--fs-2)]">
        {t('p3.vampIs', { numerals: numerals.join(' ') })}
      </p>

      {phase === 'ready' ? (
        tapMode ? (
          <>
            <p className="max-w-[65ch]">{t('p3.tap.body', { numeral: numerals[tapChordIndex] ?? '' })}</p>
            {/* No target overlay here: in the tap version, finding the tone
                IS the question. Showing it would answer it. */}
            <Fretboard markers={tapMarkers} onTap={handleTap} />
            <p className="mono text-[length:var(--fs-1)]">
              {t('p3.tap.progress', { n: tapped.length, total: numerals.length })}
            </p>
          </>
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
            <p className="max-w-[65ch]">{t('p3.body', { bars: BARS_TO_GRADE, degree: target })}</p>
            <Fretboard markers={targetMarkers} />
            <div className="flex flex-wrap gap-3">
              <button className={chip} onClick={() => void start()}>
                {t('p3.start')}
              </button>
              <button className={chip} onClick={() => setTapMode(true)}>
                {t('p3.tap.switch')}
              </button>
            </div>
          </>
        )
      ) : null}

      {phase === 'running' ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {countIn !== null ? t('playalong.countIn', { n: countIn }) : t('p3.bar', { n: barsDone + 1, total: BARS_TO_GRADE })}
          </p>
          <p className="mono text-[length:var(--fs-3)]">{currentNumeral ?? ''}</p>
          <Fretboard markers={targetMarkers} />
          <InputMeter
            rms={mic.rms}
            floorRms={micSettings.noiseFloorRms}
            gateMarginDb={micSettings.gateMarginDb ?? undefined}
          />
          <button
            className={chip}
            onClick={() => {
              track.current?.stop()
              track.current = null
              finish(gradeTargets(itemKey.tonic, windows.current, notes.current, target), 'played')
            }}
          >
            {t('p3.stop')}
          </button>
        </>
      ) : null}

      {phase === 'feedback' && verdict ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {verdict.correct ? t('p3.correct', { hits: verdict.hits, total: verdict.total }) : t('p3.incorrect', { hits: verdict.hits, total: verdict.total })}
          </p>
          <div className="flex flex-wrap gap-2">
            {verdict.bars.map((bar) => (
              <div
                key={bar.barIndex}
                className={`mono flex h-10 w-10 items-center justify-center border-[length:var(--rule)] border-[var(--ink)] ${
                  bar.hit ? 'bg-[var(--ink)] text-[color:var(--surface)]' : 'bg-[var(--surface)] text-[color:var(--ink)]'
                }`}
                title={`${bar.barIndex + 1}`}
              >
                {bar.hit ? '✓' : bar.played === null ? '–' : bar.played}
              </div>
            ))}
          </div>
          <p className="max-w-[65ch]">{t('p3.legend', { degree: target })}</p>
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
