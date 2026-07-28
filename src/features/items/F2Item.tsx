import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../../state/settings'
import { useMicSettings } from '../../state/mic'
import { Fretboard, type Marker } from '../../components/Fretboard'
import { midiAt } from '../../lib/fretboardMath'
import { triadShape, stringSetLabel, type Inversion } from '../../lib/triads'
import { gradeChord, type ChordVerdict, type DetectedNote } from '../../audio/input/chordGrade'
import { captureAndTranscribe, polyWarm, warmPoly } from '../../audio/input/poly'
import type { ChordQuality, ChordDegree } from '../../theory'
import type { KeyDef } from '../../theory/keys'
import type { StringKey } from '../../i18n/strings'
import type { ItemResult } from './E1Item'

// F2: closed-voicing triads, all inversions, four string sets, four
// qualities (docs/curriculum.md §7 — "the highest-leverage block in the
// app"). The one drill graded through Tier 2, because a triad is three notes
// at once and Tier 1 hears one.
//
// Both input paths run through the same grader. A tap answer is turned into
// the notes those frets would sound and handed to gradeChord exactly as the
// mic's would be, so "correct" means the same thing either way — the tap
// fallback is a different way in, not a different standard.

const CAPTURE_SECONDS = 2.5
const STRUM_COUNTDOWN_MS = 800

type Phase = 'ready' | 'capturing' | 'grading' | 'feedback'

type Props = {
  root: KeyDef
  quality: ChordQuality
  stringSet: [number, number, number]
  inversion: Inversion
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
  onOpenCalibration?: () => void
}

export function F2Item({
  root,
  quality,
  stringSet,
  inversion,
  nextLabel,
  onResult,
  onNext,
  onOpenCalibration,
}: Props) {
  const t = useT()
  const micSettings = useMicSettings()

  const [phase, setPhase] = useState<Phase>('ready')
  const [progress, setProgress] = useState(0)
  const [verdict, setVerdict] = useState<ChordVerdict | null>(null)
  const [answeredWith, setAnsweredWith] = useState<'played' | 'tap' | null>(null)
  const [tapMode, setTapMode] = useState(false)
  const [tapped, setTapped] = useState<Array<{ string: number; fret: number }>>([])
  const [micError, setMicError] = useState<string | null>(null)
  const [warm, setWarm] = useState(polyWarm())

  const startedAt = useRef(performance.now())
  const reported = useRef(false)
  const mounted = useRef(true)
  const abort = useRef<AbortController | null>(null)

  const spec = useMemo(() => ({ root: root.tonic, quality }), [root.tonic, quality])
  const shape = useMemo(() => triadShape(spec, stringSet, inversion), [spec, stringSet, inversion])
  const bassDegree: ChordDegree = shape?.bassDegree ?? 1

  const itemId = `${root.tonic}|${quality}|${stringSet.join('-')}|${inversion}`
  useEffect(() => {
    startedAt.current = performance.now()
    setPhase('ready')
    setProgress(0)
    setVerdict(null)
    setAnsweredWith(null)
    setTapped([])
    setMicError(null)
    reported.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      abort.current?.abort()
    }
  }, [])

  // The model is warmed at session start, but a drill reached another way
  // (or a session that started before Track F was in it) still needs it.
  useEffect(() => {
    if (warm) return
    warmPoly()
    const id = setInterval(() => {
      if (polyWarm()) {
        if (mounted.current) setWarm(true)
        clearInterval(id)
      }
    }, 400)
    return () => clearInterval(id)
  }, [warm])

  function finish(v: ChordVerdict, mode: 'played' | 'tap') {
    if (reported.current) return
    reported.current = true
    setVerdict(v)
    setAnsweredWith(mode)
    setPhase('feedback')
    onResult({
      correct: v.correct,
      latencyMs: Math.round(performance.now() - startedAt.current),
      response: `${v.heard.join(',')}|${v.diagnosis.kind}`,
      inputMode: mode,
    })
  }

  async function listen() {
    setMicError(null)
    setPhase('capturing')
    setProgress(0)
    const controller = new AbortController()
    abort.current = controller
    try {
      const { notes } = await captureAndTranscribe({
        seconds: CAPTURE_SECONDS,
        signal: controller.signal,
        onProgress: (elapsed) => {
          if (mounted.current) setProgress(Math.min(1, elapsed / CAPTURE_SECONDS))
        },
      })
      if (!mounted.current) return
      setPhase('grading')
      finish(gradeChord(spec, notes, { expectedBass: bassDegree }), 'played')
    } catch (err) {
      if (!mounted.current) return
      if (err instanceof DOMException && err.name === 'AbortError') return
      setPhase('ready')
      setMicError(err instanceof Error && 'reason' in err ? String(err.reason) : 'failed')
    }
  }

  // A tap answer becomes the notes those frets would sound, then goes
  // through the same grader the mic's answer does.
  function gradeTaps(positions: Array<{ string: number; fret: number }>) {
    const notes: DetectedNote[] = positions.map((p) => ({
      midi: midiAt(p.string, p.fret),
      startSeconds: 0,
      durationSeconds: 1,
      amplitude: 1,
    }))
    finish(gradeChord(spec, notes, { expectedBass: bassDegree }), 'tap')
  }

  function handleTap(string: number, fret: number) {
    if (phase === 'feedback' || !stringSet.includes(string)) return
    // One note per string: tapping a string again moves that note.
    const next = [...tapped.filter((p) => p.string !== string), { string, fret }]
    setTapped(next)
    if (next.length === stringSet.length) gradeTaps(next)
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'

  const markers: Marker[] = useMemo(() => {
    if (phase === 'feedback' && shape) {
      return shape.positions.map((p) => ({
        string: p.string,
        fret: p.fret,
        label: String(p.degree),
        kind: verdict?.correct ? ('correct' as const) : ('target' as const),
      }))
    }
    return tapped.map((p) => ({ string: p.string, fret: p.fret, label: '•' }))
  }, [phase, shape, verdict, tapped])

  const qualityName = t(`e5.quality.${quality}` as never)

  return (
    <>
      <p className="display text-[length:var(--fs-4)]">
        {t('f2.prompt', {
          chord: `${root.label} ${qualityName}`,
          set: stringSetLabel(stringSet),
        })}
      </p>
      <p className="mono text-[length:var(--fs-2)]">{t('f2.bassIs', { degree: bassDegree })}</p>

      {/* The fretboard is shown when it carries something: the tap surface,
          or the shape being revealed. Before a mic answer it would be an
          empty diagram whose only content is the shape we must not give
          away. */}
      {tapMode || phase === 'feedback' ? (
        <Fretboard
          markers={markers}
          highlightStrings={stringSet}
          onTap={tapMode && phase !== 'feedback' ? handleTap : undefined}
        />
      ) : null}

      {phase === 'ready' ? (
        tapMode ? (
          <p className="max-w-[65ch]">{t('f2.tap.body', { n: stringSet.length - tapped.length })}</p>
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
            {micError ? (
              <p className="max-w-[65ch]" role="alert">
                {t(`cal.error.${micError}` as never)}
              </p>
            ) : null}
            <p className="max-w-[65ch]">{warm ? t('f2.strumBody') : t('f2.loadingModel')}</p>
            <div className="flex flex-wrap gap-3">
              <button className={chip} disabled={!warm} onClick={() => void listen()}>
                {t('f2.strum')}
              </button>
              <button className={chip} onClick={() => setTapMode(true)}>
                {t('f2.tap.switch')}
              </button>
            </div>
          </>
        )
      ) : null}

      {phase === 'capturing' ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {progress * CAPTURE_SECONDS * 1000 < STRUM_COUNTDOWN_MS ? t('f2.strumNow') : t('f2.letRing')}
          </p>
          <ProgressBar value={progress} label={t('f2.capturing')} />
        </>
      ) : null}

      {phase === 'grading' ? <ProgressBar value={1} label={t('f2.grading')} /> : null}

      {phase === 'feedback' && verdict ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {verdict.correct ? t('f2.correct') : t('f2.incorrect')}
          </p>
          <p className="max-w-[65ch]">{diagnosisLine(t, verdict, bassDegree)}</p>
          {answeredWith === 'tap' ? <p className="max-w-[65ch]">{t('f2.tap.note')}</p> : null}
          <button className={chip} onClick={onNext}>
            {nextLabel}
          </button>
        </>
      ) : null}
    </>
  )
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mono text-[length:var(--fs-1)]" role="status">
        {label}
      </span>
      <div
        className="h-3 w-56 border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)]"
        role="progressbar"
        aria-valuenow={Math.round(value * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-[var(--ink)]" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  )
}

// The diagnosis, in the app's own language: chord degrees, never interval
// names. "Wrong" is not something anyone can practise against.
function diagnosisLine(
  t: (key: StringKey, vars?: Record<string, string | number>) => string,
  verdict: ChordVerdict,
  expectedBass: ChordDegree,
): string {
  const d = verdict.diagnosis
  switch (d.kind) {
    case 'match':
      return t('f2.d.match')
    case 'inversion':
      return t('f2.d.inversion', { expected: expectedBass, played: d.playedBass })
    case 'seventh-added':
      return t('f2.d.seventhAdded')
    case 'suspended':
      return t('f2.d.suspended', { degree: d.replacedBy })
    case 'relative':
      return t('f2.d.relative')
    case 'quality':
      return t('f2.d.quality', { quality: t(`e5.quality.${d.played}` as StringKey) })
    case 'incomplete':
      return t('f2.d.incomplete', { degrees: d.missing.join(', ') })
    case 'extra':
      return t('f2.d.extra')
    case 'silence':
      return t('f2.d.silence')
  }
}
