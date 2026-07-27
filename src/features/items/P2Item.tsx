import { useEffect, useMemo, useRef, useState } from 'react'
import { Note } from 'tonal'
import { useT } from '../../state/settings'
import { configFor, useMicSettings } from '../../state/mic'
import { useMic } from '../../audio/input/useMic'
import { degreeOf, noteNameOf, tonicPitchClassOf } from '../../audio/input/notes'
import { InputMeter } from '../../components/InputMeter'
import { compareSequences, createPhraseCapture, fragmentDegrees } from '../../audio/input/sequence'
import { ensureAudio, playDegreeSequence, stop } from '../../audio/engine'
import { degreeNote } from '../../theory'
import type { KeyDef } from '../../theory/keys'
import type { ItemResult } from './E1Item'

// P2: play what you hear (docs/curriculum.md §8). A cadence plus a 3-5 note
// fragment sounds; the user reproduces it on the guitar. Grading is
// positional and by pitch class, same rationale as P0/P1 — an acoustic into
// a laptop mic cannot be trusted on octaves.

const STEP_TIMEOUT_MS = 25_000

// Degree pools per fragment length (brief §P2.5): a longer fragment draws
// from a wider pool, which is also why longer fragments seed harder.
export const P2_POOL_BY_LENGTH: Record<number, number[]> = {
  3: [1, 2, 3, 5],
  4: [1, 2, 3, 4, 5],
  5: [1, 2, 3, 4, 5, 6, 7],
}

// A tiny seeded RNG (mulberry32) so a fragment reproduces identically for
// the same {tonic, length, seed}: a replay and a re-review must show the
// same fragment, never a fresh random walk.
function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateFragment(tonic: string, length: number, seed: number): number[] {
  const pool = P2_POOL_BY_LENGTH[length]
  if (!pool) throw new Error(`No P2 degree pool for length ${length}`)
  const rng = mulberry32(hashSeed(`${tonic}|${length}|${seed}`))
  return fragmentDegrees(length, pool, rng)
}

function noteLabel(midi: number): string {
  return noteNameOf(midi).replace('#', '♯')
}

type Phase = 'playing' | 'answering' | 'feedback'
type AnsweredWith = 'mic' | 'tap' | null

type Position = {
  expectedDegree: number
  playedDegree: number | null
  kind: 'ok' | 'missing' | 'outside' | 'wrong'
}

type Props = {
  itemKey: KeyDef
  length: number
  seed: number
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
  onOpenCalibration?: () => void
}

export function P2Item({ itemKey, length, seed, nextLabel, onResult, onNext, onOpenCalibration }: Props) {
  const t = useT()
  const micSettings = useMicSettings()

  const [phase, setPhase] = useState<Phase>('playing')
  const [playingIndex, setPlayingIndex] = useState(-1)
  const [tapMode, setTapMode] = useState(false)
  const [tapped, setTapped] = useState<number[]>([])
  const [heardMidi, setHeardMidi] = useState<number | null>(null)
  const [playedMidis, setPlayedMidis] = useState<number[] | null>(null)
  const [answeredWith, setAnsweredWith] = useState<AnsweredWith>(null)
  const [audioError, setAudioError] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  const answerStart = useRef(performance.now())
  const reported = useRef(false)
  const capture = useRef(createPhraseCapture({ maxNotes: length, endGapMs: 1200 }))

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      stop()
    }
  }, [])

  const fragment = useMemo(() => generateFragment(itemKey.tonic, length, seed), [itemKey.tonic, length, seed])
  const targetMidis = useMemo(
    () => fragment.map((d) => Note.midi(degreeNote(itemKey.tonic, d)) ?? 0),
    [fragment, itemKey.tonic],
  )
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

  function present() {
    setPhase('playing')
    setPlayingIndex(-1)
    setTapMode(false)
    setTapped([])
    setHeardMidi(null)
    setPlayedMidis(null)
    setAnsweredWith(null)
    setTimedOut(false)
    reported.current = false
    capture.current = createPhraseCapture({ maxNotes: length, endGapMs: 1200 })
    void withAudio(async () => {
      await playDegreeSequence(itemKey.tonic, fragment, {
        onDegree: (i) => {
          if (mounted.current) setPlayingIndex(i)
        },
      })
      if (mounted.current) {
        answerStart.current = performance.now()
        setPhase('answering')
      }
    })
  }

  const itemId = `${itemKey.tonic}|${length}|${seed}`
  useEffect(() => {
    present()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  function finish(midis: number[] | null, tappedDegrees: number[] | null, mode: 'mic' | 'tap') {
    if (reported.current) return
    reported.current = true
    let correct: boolean
    let response: string
    if (mode === 'mic' && midis) {
      setPlayedMidis(midis)
      correct = compareSequences(midis, targetMidis).correct
      response = midis.join('-')
    } else {
      const degs = tappedDegrees ?? []
      correct = degs.length === fragment.length && degs.every((d, i) => d === fragment[i])
      response = degs.join('-')
    }
    setAnsweredWith(mode)
    setPhase('feedback')
    onResult({
      correct,
      latencyMs: Math.round(performance.now() - answerStart.current),
      response,
      inputMode: mode === 'mic' ? 'played' : 'tap',
    })
  }

  const listening = phase === 'answering' && !tapMode

  const mic = useMic({
    active: listening,
    config: configFor(micSettings.noiseFloorRms),
    onNote: (event) => {
      if (event.kind === 'note') setHeardMidi(event.midi)
      const finished = capture.current.push(event)
      if (finished) finish(finished.map((n) => n.midi), null, 'mic')
    },
  })

  useEffect(() => {
    if (phase !== 'answering' || tapMode) return
    setTimedOut(false)
    const id = setTimeout(() => setTimedOut(true), STEP_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [phase, tapMode])

  function handleTap(d: number) {
    if (phase !== 'answering' || tapped.length >= fragment.length) return
    const next = [...tapped, d]
    setTapped(next)
    if (next.length === fragment.length) finish(null, next, 'tap')
  }

  function handleUndo() {
    if (phase === 'answering') setTapped((cur) => cur.slice(0, -1))
  }

  const feedback = useMemo(() => {
    if (phase !== 'feedback') return null
    if (answeredWith === 'tap') {
      const positions: Position[] = fragment.map((d, i) => {
        const played = tapped[i] ?? null
        return {
          expectedDegree: d,
          playedDegree: played,
          kind: played === null ? 'missing' : played === d ? 'ok' : 'wrong',
        }
      })
      return { positions, extra: 0, correct: positions.every((p) => p.kind === 'ok') }
    }
    const verdict = compareSequences(playedMidis ?? [], targetMidis)
    const positions: Position[] = fragment.map((d, i) => {
      const p = verdict.positions[i]
      if (p.played === null) return { expectedDegree: d, playedDegree: null, kind: 'missing' }
      const playedDegree = degreeOf(p.played, tonicPc)
      if (playedDegree === null) return { expectedDegree: d, playedDegree: null, kind: 'outside' }
      return { expectedDegree: d, playedDegree, kind: playedDegree === d ? 'ok' : 'wrong' }
    })
    return { positions, extra: verdict.extra, correct: verdict.correct }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, answeredWith, fragment, tapped, playedMidis, targetMidis, tonicPc])

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'
  const bigChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-6 py-3 text-[length:var(--fs-4)] font-bold text-[color:var(--ink)]'
  const dot =
    'mono flex h-10 w-10 items-center justify-center border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'
  const dotFilled =
    'mono flex h-10 w-10 items-center justify-center border-[length:var(--rule)] border-[var(--ink)] bg-[var(--ink)] text-[length:var(--fs-2)] font-bold text-[color:var(--surface)]'

  return (
    <>
      <p className="display text-[length:var(--fs-4)]">{t('p2.title')}</p>

      {phase === 'playing' ? (
        <>
          <p className="mono text-[length:var(--fs-3)]" role="status">
            {playingIndex >= 0
              ? t('p2.notePosition', { n: playingIndex + 1, total: fragment.length })
              : t('p2.listening')}
          </p>
          <div className="flex gap-2" aria-hidden="true">
            {fragment.map((_, i) => (
              <div key={i} className={i === playingIndex ? dotFilled : dot} />
            ))}
          </div>
        </>
      ) : null}

      {phase === 'answering' ? (
        <>
          <p className="display text-[length:var(--fs-4)]">{t('p2.prompt')}</p>

          {tapMode ? (
            <>
              <p className="max-w-[65ch]">{t('p2.tap.body')}</p>
              <div className="flex gap-2">
                {fragment.map((_, i) => (
                  <div key={i} className={dot}>
                    {tapped[i] ?? ''}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    className={bigChip}
                    disabled={tapped.length >= fragment.length}
                    onClick={() => handleTap(d)}
                  >
                    {d}
                  </button>
                ))}
                <button className={chip} onClick={handleUndo}>
                  {t('p2.tap.undo')}
                </button>
              </div>
            </>
          ) : (
            <>
              {micSettings.calibratedAt === null ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="max-w-[65ch]">{t('p2.needsCalibration')}</p>
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
                    {heardMidi === null ? t('p2.hearingYou') : t('p2.heard', { note: noteLabel(heardMidi) })}
                  </p>
                </>
              )}

              {timedOut ? <p className="max-w-[65ch]">{t('p2.timeout')}</p> : null}
            </>
          )}

          <div className="flex flex-wrap gap-3">
            <button className={chip} onClick={present}>
              {t('p2.replay')}
            </button>
            {!tapMode ? (
              <button className={chip} onClick={() => setTapMode(true)}>
                {t('p2.tap.switch')}
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {phase === 'feedback' && feedback ? (
        <>
          <p className="display text-[length:var(--fs-4)]" role="status">
            {feedback.correct ? t('p2.correct') : t('p2.incorrect')}
          </p>
          {answeredWith === 'tap' ? <p className="max-w-[65ch]">{t('p2.tap.note')}</p> : null}
          <div className="flex gap-2">
            {feedback.positions.map((p, i) => (
              <div key={i} className={p.kind === 'ok' ? dotFilled : dot}>
                {p.expectedDegree}
                {p.kind === 'ok' ? ' ✓' : ' ✗'}
              </div>
            ))}
          </div>
          {feedback.positions.map((p, i) =>
            p.kind === 'ok' ? null : (
              <p key={i} className="max-w-[65ch]">
                {p.kind === 'missing'
                  ? t('p2.position.missing', { position: i + 1, expected: p.expectedDegree })
                  : p.kind === 'outside'
                    ? t('p2.position.outside', { position: i + 1, expected: p.expectedDegree })
                    : t('p2.position.wrong', {
                        position: i + 1,
                        expected: p.expectedDegree,
                        played: p.playedDegree ?? 0,
                      })}
              </p>
            ),
          )}
          {answeredWith === 'mic' && feedback.extra > 0 ? (
            <p className="max-w-[65ch]">{t('p2.extra', { n: feedback.extra })}</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button className={chip} onClick={present}>
              {t('p2.replay')}
            </button>
            <button className={chip} onClick={onNext}>
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
