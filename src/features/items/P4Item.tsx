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
  gradeImprov,
  guideToneDegrees,
  type BarWindow,
  type Constraint,
  type ImprovVerdict,
  type PlayedNote,
} from '../../audio/input/improv'
import { startPlayAlong, type PlayAlong } from '../../audio/playalong'
import { chordDegreePitchClass, parseNumeral } from '../../theory'
import { loadProgressionFrequency, topProgressions } from '../../curriculum/progressions'
import { P4_POOL_SIZE } from '../../scheduler/items'
import type { StringKey } from '../../i18n/strings'
import type { KeyDef } from '../../theory/keys'
import type { ItemResult } from './E1Item'

// P4: constrained improvisation over changes (docs/curriculum.md §8).
// Guide tones only, then approach tones, then open — a ladder rather than
// three settings, which is why each stage is its own item with its own
// difficulty rather than a toggle on one drill.
//
// The constraint is the whole exercise, so the feedback names it per note:
// which chord each note was played over, whether it was a guide tone, an
// approach, or something else. A percentage alone would say nothing about
// what to do differently.

const BARS_TO_GRADE = 8
const BPM = 84
const GRADING_GRACE_MS = 500

type Phase = 'ready' | 'running' | 'feedback'

type Props = {
  itemKey: KeyDef
  rank: number
  constraint: Constraint
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
  onOpenCalibration?: () => void
}

export function P4Item({
  itemKey,
  rank,
  constraint,
  nextLabel,
  onResult,
  onNext,
  onOpenCalibration,
}: Props) {
  const t = useT()
  const micSettings = useMicSettings()

  const [numerals, setNumerals] = useState<string[] | null>(null)
  const [phase, setPhase] = useState<Phase>('ready')
  const [countIn, setCountIn] = useState<number | null>(null)
  const [barsDone, setBarsDone] = useState(0)
  const [currentNumeral, setCurrentNumeral] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<ImprovVerdict | null>(null)
  const [tapMode, setTapMode] = useState(false)
  const [tapped, setTapped] = useState<Array<{ correct: boolean; string: number; fret: number }>>([])
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

  const itemId = `${itemKey.tonic}|${rank}|${constraint}`
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
      const entry = topProgressions(data, 'major', 'four', P4_POOL_SIZE)[rank]
      setNumerals(entry ? entry.p : ['I', 'vi', 'IV', 'V'])
    })
    return () => {
      cancelled = true
      track.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  const mic = useMic({
    active: phase === 'running' && !tapMode,
    config: configFor(micSettings.noiseFloorRms, micSettings.gateMarginDb),
    onNote: (event) => {
      if (event.kind !== 'note') return
      notes.current.push({ midi: event.midi, atMs: bridge.current.wallMsFor(event.tMs) })
    },
  })

  function finish(v: ImprovVerdict, mode: 'played' | 'tap') {
    if (reported.current) return
    reported.current = true
    setVerdict(v)
    setPhase('feedback')
    onResult({
      correct: v.correct,
      latencyMs: Math.round(performance.now() - startedAt.current),
      response: `${constraint}:${Math.round(v.accuracy * 100)}`,
      inputMode: mode,
    })
  }

  function gradeNow() {
    finish(gradeImprov(itemKey.tonic, windows.current, notes.current, constraint), 'played')
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
        feel: 'swing',
        barsPerChord: 1,
        onBar: (bar) => {
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
          if (absolute >= BARS_TO_GRADE) {
            track.current?.stop()
            track.current = null
            setTimeout(() => {
              if (mounted.current) gradeNow()
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

  // The tap version: find a guide tone on each chord of the progression.
  // Untimed, and openly the smaller drill — tapping cannot rehearse playing
  // a line, but it can rehearse knowing where the guide tones are, which is
  // what the timed version runs on.
  function handleTap(string: number, fret: number) {
    if (!numerals || phase === 'feedback') return
    const chordIndex = tapped.length
    if (chordIndex >= numerals.length) return
    const midi = midiAt(string, fret)
    const numeral = numerals[chordIndex]
    const degree = degreeInChord(itemKey.tonic, numeral, midi)
    const correct = degree !== null && guideToneDegrees(itemKey.tonic, numeral).includes(degree)
    const next = [...tapped, { correct, string, fret }]
    setTapped(next)
    if (next.length === numerals.length) {
      const hits = next.filter((x) => x.correct).length
      finish(
        {
          notes: [],
          accuracy: hits / next.length,
          chordsMissed: next.map((x, i) => (x.correct ? -1 : i)).filter((i) => i >= 0),
          correct: hits === next.length,
        },
        'tap',
      )
    }
  }

  const activeNumeral = currentNumeral ?? numerals?.[tapMode ? tapped.length : 0] ?? null

  // Guide tones for the chord currently sounding. Shown while playing —
  // this drill is about using them, not about hunting for them — but never
  // in the tap version, where finding them is the question.
  const guideMarkers: Marker[] = useMemo(() => {
    if (!activeNumeral || tapMode) return []
    const spec = parseNumeral(itemKey.tonic, activeNumeral)
    const pcs: number[] = []
    const labels = new Map<number, string>()
    for (const degree of guideToneDegrees(itemKey.tonic, activeNumeral)) {
      const pc = chordDegreePitchClass(spec, degree)
      if (pc === null) continue
      const value = tonicPitchClassOf(pc)
      pcs.push(value)
      labels.set(value, String(degree))
    }
    return positionsFor(pcs).map((p) => ({
      string: p.string,
      fret: p.fret,
      label: labels.get(p.pitchClass) ?? '',
    }))
  }, [activeNumeral, itemKey.tonic, tapMode])

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
      <p className="display text-[length:var(--fs-4)]">{t(`p4.prompt.${constraint}` as StringKey)}</p>
      <p className="mono text-[length:var(--fs-2)]">{t('p4.changesAre', { numerals: numerals.join(' ') })}</p>

      {phase === 'ready' ? (
        tapMode ? (
          <>
            <p className="max-w-[65ch]">{t('p4.tap.body', { numeral: numerals[tapped.length] ?? '' })}</p>
            <Fretboard markers={tapMarkers} onTap={handleTap} />
            <p className="mono text-[length:var(--fs-1)]">
              {t('p4.tap.progress', { n: tapped.length, total: numerals.length })}
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
            <p className="max-w-[65ch]">{t(`p4.body.${constraint}` as StringKey, { bars: BARS_TO_GRADE })}</p>
            <Fretboard markers={guideMarkers} />
            <div className="flex flex-wrap gap-3">
              <button className={chip} onClick={() => void start()}>
                {t('p4.start')}
              </button>
              <button className={chip} onClick={() => setTapMode(true)}>
                {t('p4.tap.switch')}
              </button>
            </div>
          </>
        )
      ) : null}

      {phase === 'running' ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {countIn !== null
              ? t('playalong.countIn', { n: countIn })
              : t('p4.bar', { n: barsDone + 1, total: BARS_TO_GRADE })}
          </p>
          <p className="mono text-[length:var(--fs-3)]">{activeNumeral ?? ''}</p>
          <Fretboard markers={guideMarkers} />
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
              gradeNow()
            }}
          >
            {t('p4.stop')}
          </button>
        </>
      ) : null}

      {phase === 'feedback' && verdict ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {verdict.correct ? t('p4.correct') : t('p4.incorrect')}
          </p>
          <p className="mono text-[length:var(--fs-2)]">
            {/* The tap version grades one answer per chord, not a line of
                notes, so it must not report a note percentage. */}
            {tapMode
              ? t('p4.score.tap', { pct: Math.round(verdict.accuracy * 100) })
              : constraint === 'open'
                ? t('p4.score.open', { missed: verdict.chordsMissed.length })
                : t('p4.score', { pct: Math.round(verdict.accuracy * 100) })}
          </p>
          {verdict.notes.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-1">
                {verdict.notes.map((n, i) => (
                  <div
                    key={i}
                    className={`mono flex h-8 min-w-8 items-center justify-center border-[length:var(--rule)] border-[var(--ink)] px-1 text-[length:var(--fs-1)] ${
                      n.ok
                        ? 'bg-[var(--ink)] text-[color:var(--surface)]'
                        : 'bg-[var(--surface)] text-[color:var(--ink)]'
                    }`}
                    title={n.numeral}
                  >
                    {n.degree ?? '·'}
                  </div>
                ))}
              </div>
              <p className="max-w-[65ch]">{t('p4.legend')}</p>
            </>
          ) : null}
          {verdict.chordsMissed.length > 0 ? (
            <p className="max-w-[65ch]">
              {t('p4.missed', {
                numerals: verdict.chordsMissed.map((c) => numerals[c] ?? '?').join(', '),
              })}
            </p>
          ) : null}
          {tapMode ? <p className="max-w-[65ch]">{t('p4.tap.note')}</p> : null}
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
