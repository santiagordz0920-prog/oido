import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../../state/settings'
import { configFor, useMicSettings } from '../../state/mic'
import { useMic } from '../../audio/input/useMic'
import { degreeOf, noteNameOf, tonicPitchClassOf } from '../../audio/input/notes'
import { InputMeter } from '../../components/InputMeter'
import { compareSequences, createPhraseCapture, fragmentDegrees } from '../../audio/input/sequence'
import { ensureAudio, playCadence, stop } from '../../audio/engine'
import type { KeyDef } from '../../theory/keys'
import type { ItemResult } from './E1Item'

// P1: play what you sing (docs/curriculum.md §8). A cadence establishes the
// key, the user sings a short phrase, the app transcribes it as scale
// degrees (never note names, never staff notation), and the user then finds
// the same phrase on the guitar. Grading compares the two captured phrases
// by pitch class — the same rationale as P0/P2: an acoustic into a laptop
// mic cannot be trusted on octaves.

const STEP_TIMEOUT_MS = 25_000
const MAX_SUNG_NOTES = 5

// The tap fallback presents a *different* task, since P1 cannot function at
// all without a mic (there is nothing to transcribe): a generated fragment,
// shown as degrees, self-reported. Length and pool mirror P2's tiers, but
// this fragment is not seeded/graded — it exists only to give the fallback
// something concrete to ask for.
const TAP_POOL_BY_LENGTH: Record<number, number[]> = {
  3: [1, 2, 3, 5],
  4: [1, 2, 3, 4, 5],
  5: [1, 2, 3, 4, 5, 6, 7],
}

function randomTapFragment(): number[] {
  const length = 3 + Math.floor(Math.random() * 3)
  return fragmentDegrees(length, TAP_POOL_BY_LENGTH[length])
}

function noteLabel(midi: number): string {
  return noteNameOf(midi).replace('#', '♯')
}

type Phase = 'cadence' | 'singing' | 'leftKey' | 'playingGuitar' | 'feedback'

type Row = { expectedDegree: number | null; playedDegree: number | null; missing: boolean; ok: boolean }

type Props = {
  itemKey: KeyDef
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
  onOpenCalibration?: () => void
}

export function P1Item({ itemKey, nextLabel, onResult, onNext, onOpenCalibration }: Props) {
  const t = useT()
  const micSettings = useMicSettings()

  const [tapMode, setTapMode] = useState(false)
  const [tapFragment, setTapFragment] = useState<number[]>(randomTapFragment)
  const [tapDone, setTapDone] = useState(false)

  const [phase, setPhase] = useState<Phase>('cadence')
  const [heardMidi, setHeardMidi] = useState<number | null>(null)
  const [sungMidis, setSungMidis] = useState<number[] | null>(null)
  const [playedMidis, setPlayedMidis] = useState<number[] | null>(null)
  const [audioError, setAudioError] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  const answerStart = useRef(performance.now())
  const mountedAt = useRef(performance.now())
  const reported = useRef(false)
  const capture = useRef(createPhraseCapture({ maxNotes: MAX_SUNG_NOTES, endGapMs: 1200 }))

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      stop()
    }
  }, [])

  const tonicPc = tonicPitchClassOf(itemKey.tonic)

  async function withAudio(fn: () => Promise<void>) {
    try {
      setAudioError(false)
      await ensureAudio()
      await fn()
    } catch {
      if (mounted.current) setAudioError(true)
    }
  }

  function startSinging() {
    setPhase('singing')
    setHeardMidi(null)
    setSungMidis(null)
    setPlayedMidis(null)
    setTimedOut(false)
    reported.current = false
    capture.current = createPhraseCapture({ maxNotes: MAX_SUNG_NOTES, endGapMs: 1200 })
    answerStart.current = performance.now()
  }

  function startCadence() {
    setPhase('cadence')
    setSungMidis(null)
    setPlayedMidis(null)
    setHeardMidi(null)
    setTimedOut(false)
    // A new item (even the same track drawn twice in a row, since
    // SessionRunner renders items without a remount-forcing key) must start
    // fresh: without this, a prior item's tap-fallback completion would
    // carry over and silently skip this item's prompt and grading.
    setTapMode(false)
    setTapDone(false)
    setTapFragment(randomTapFragment())
    reported.current = false
    void withAudio(async () => {
      await playCadence(itemKey.tonic)
      if (mounted.current) startSinging()
    })
  }

  const itemId = itemKey.tonic
  useEffect(() => {
    startCadence()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  function startPlayingGuitar(count: number) {
    setPhase('playingGuitar')
    setHeardMidi(null)
    setTimedOut(false)
    capture.current = createPhraseCapture({ maxNotes: count, endGapMs: 1200 })
    answerStart.current = performance.now()
  }

  function handleSungFinished(midis: number[]) {
    if (midis.length === 0) return
    const outsideCount = midis.filter((m) => degreeOf(m, tonicPc) === null).length
    setSungMidis(midis)
    if (outsideCount > 1) {
      setPhase('leftKey')
      return
    }
    startPlayingGuitar(midis.length)
  }

  function handlePlayedFinished(midis: number[]) {
    if (reported.current) return
    reported.current = true
    setPlayedMidis(midis)
    setPhase('feedback')
    const verdict = compareSequences(midis, sungMidis ?? [])
    onResult({
      correct: verdict.correct,
      latencyMs: Math.round(performance.now() - answerStart.current),
      response: midis.join('-'),
      inputMode: 'played',
    })
  }

  const listening = !tapMode && (phase === 'singing' || phase === 'playingGuitar')

  const mic = useMic({
    active: listening,
    config: configFor(micSettings.noiseFloorRms),
    onNote: (event) => {
      if (event.kind === 'note') setHeardMidi(event.midi)
      const finished = capture.current.push(event)
      if (!finished) return
      if (phase === 'singing') handleSungFinished(finished.map((n) => n.midi))
      else if (phase === 'playingGuitar') handlePlayedFinished(finished.map((n) => n.midi))
    },
  })

  useEffect(() => {
    if (tapMode || (phase !== 'singing' && phase !== 'playingGuitar')) return
    setTimedOut(false)
    const id = setTimeout(() => setTimedOut(true), STEP_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [phase, tapMode])

  function handleSingDone() {
    if (phase !== 'singing') return
    handleSungFinished(capture.current.finish().map((n) => n.midi))
  }

  function handlePlayDone() {
    if (phase !== 'playingGuitar') return
    handlePlayedFinished(capture.current.finish().map((n) => n.midi))
  }

  function labelFor(degree: number | null): string {
    return degree === null ? t('p1.outsideWord') : t('p1.degreeWord', { degree })
  }

  const rows: Row[] = useMemo(() => {
    if (phase !== 'feedback' || !sungMidis) return []
    const verdict = compareSequences(playedMidis ?? [], sungMidis)
    return sungMidis.map((sm, i) => {
      const p = verdict.positions[i]
      const missing = p.played === null
      return {
        expectedDegree: degreeOf(sm, tonicPc),
        playedDegree: missing ? null : degreeOf(p.played as number, tonicPc),
        missing,
        ok: p.ok,
      }
    })
  }, [phase, sungMidis, playedMidis, tonicPc])

  const overallCorrect = rows.length > 0 && rows.every((r) => r.ok)

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'
  const bigChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-6 py-3 text-[length:var(--fs-4)] font-bold text-[color:var(--ink)]'
  const dot =
    'mono flex h-10 w-10 items-center justify-center border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'
  const dotFilled =
    'mono flex h-10 w-10 items-center justify-center border-[length:var(--rule)] border-[var(--ink)] bg-[var(--ink)] text-[length:var(--fs-2)] font-bold text-[color:var(--surface)]'

  if (tapMode) {
    return (
      <>
        <p className="display text-[length:var(--fs-4)]">{t('p1.tap.title')}</p>
        <p className="max-w-[65ch]">{t('p1.tap.body')}</p>
        <div className="mono flex flex-wrap gap-2 text-[length:var(--fs-3)] font-bold text-[color:var(--ink)]">
          {tapFragment.join(' – ')}
        </div>
        {tapDone ? (
          <button className={chip} onClick={onNext}>
            {nextLabel}
          </button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              className={bigChip}
              onClick={() => {
                setTapDone(true)
                onResult({
                  correct: true,
                  latencyMs: Math.round(performance.now() - mountedAt.current),
                  response: 'played',
                  inputMode: 'tap',
                })
              }}
            >
              {t('p1.tap.did')}
            </button>
            <button
              className={bigChip}
              onClick={() => {
                setTapDone(true)
                onResult({
                  correct: false,
                  latencyMs: Math.round(performance.now() - mountedAt.current),
                  response: 'missed',
                  inputMode: 'tap',
                })
              }}
            >
              {t('p1.tap.didnt')}
            </button>
          </div>
        )}
        <p className="max-w-[65ch] text-[color:var(--ink-dim)]">{t('p1.tap.note')}</p>
      </>
    )
  }

  return (
    <>
      <p className="display text-[length:var(--fs-4)]">{t('p1.title')}</p>

      {phase === 'cadence' ? (
        <p className="mono text-[length:var(--fs-3)]" role="status">
          {t('p1.cadence.listening')}
        </p>
      ) : null}

      {phase === 'singing' || phase === 'playingGuitar' ? (
        <>
          <p className="display text-[length:var(--fs-4)]">
            {phase === 'singing' ? t('p1.sing.prompt') : t('p1.play.prompt')}
          </p>

          {micSettings.calibratedAt === null ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="max-w-[65ch]">{t('p1.needsCalibration')}</p>
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
                {heardMidi === null ? t('p1.listening') : t('p1.heard', { note: noteLabel(heardMidi) })}
              </p>
            </>
          )}

          {timedOut ? <p className="max-w-[65ch]">{t('p1.timeout')}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button className={chip} onClick={phase === 'singing' ? handleSingDone : handlePlayDone}>
              {t('p1.done')}
            </button>
            <button className={chip} onClick={() => setTapMode(true)}>
              {t('p1.tap.switch')}
            </button>
          </div>
        </>
      ) : null}

      {phase === 'leftKey' ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {t('p1.leftKey')}
          </p>
          <button className={chip} onClick={startSinging}>
            {t('p1.singAgain')}
          </button>
        </>
      ) : null}

      {phase === 'feedback' && sungMidis ? (
        <>
          <p className="mono text-[length:var(--fs-1)]">{t('p1.transcription.title')}</p>
          <div className="flex gap-2">
            {sungMidis.map((sm, i) => (
              <div key={i} className={dot}>
                {degreeOf(sm, tonicPc) ?? t('p1.outsideChip')}
              </div>
            ))}
          </div>

          <p className="display text-[length:var(--fs-4)]" role="status">
            {overallCorrect ? t('p1.correct') : t('p1.incorrect')}
          </p>
          <div className="flex gap-2">
            {rows.map((r, i) => (
              <div key={i} className={r.ok ? dotFilled : dot}>
                {r.expectedDegree ?? t('p1.outsideChip')}
                {r.ok ? ' ✓' : ' ✗'}
              </div>
            ))}
          </div>
          {rows.map((r, i) =>
            r.ok ? null : (
              <p key={i} className="max-w-[65ch]">
                {r.missing
                  ? t('p1.position.missing', { position: i + 1, expected: labelFor(r.expectedDegree) })
                  : t('p1.position.wrong', {
                      position: i + 1,
                      expected: labelFor(r.expectedDegree),
                      played: labelFor(r.playedDegree),
                    })}
              </p>
            ),
          )}
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
