import { useEffect, useRef, useState } from 'react'
import { useT } from '../state/settings'
import type { StringKey } from '../i18n/strings'
import { ensureAudio, playCadenceThenBassLine, playCadenceThenProgression, stop } from '../audio/engine'
import type { KeyDef } from '../theory/keys'
import { NUMERAL_DEGREE } from '../scheduler/items'
import { completeCheckpoint } from '../scheduler/engine'
import { loadProgressionFrequency, type ProgressionFrequency } from '../curriculum/progressions'
import {
  CHECKPOINT_ITEM_COUNT,
  CHECKPOINT_PASS_THRESHOLD,
  CHECKPOINT_SECONDS,
  cp3DistractorRanks,
  cp3ModePool,
  drawCheckpointItems,
  type CheckpointId,
  type CheckpointItem,
} from '../curriculum/checkpoints'

// The stage checkpoint challenge (docs/pedagogy.md §4.1): one component for
// all three checkpoints, parameterized by checkpointId. Unlike every other
// drill in the app, this is a timed TEST built from real corpus
// progressions — no replay, no per-item feedback, and a strict pass/fail at
// 7 of 8 (brief: "a checkpoint the user cannot fail teaches nothing"). Item
// generation (src/curriculum/checkpoints.ts) is pure and lives outside this
// component; this component only orchestrates audio, the 12-second
// countdown (wall-clock setInterval — UI pacing, not musical timing) and
// the pass/fail screen.

type Phase = 'loading' | 'playing' | 'answering' | 'result'

type Props = {
  checkpointId: CheckpointId
  onKeyChange: (k: KeyDef) => void
  onExit: () => void
}

const NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
const DEGREES = [1, 2, 3, 4, 5, 6, 7]

function displayNumeral(n: string): string {
  return n.replace(/^b+/, (m) => '♭'.repeat(m.length)).replace(/^#+/, (m) => '♯'.repeat(m.length))
}

function motionLabel(numerals: string[]): string {
  return numerals.map(displayNumeral).join('–')
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

type CP3Option = { rank: number; label: string }

export function Checkpoint({ checkpointId, onKeyChange, onExit }: Props) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('loading')
  const [data, setData] = useState<ProgressionFrequency | null>(null)
  const [items, setItems] = useState<CheckpointItem[] | null>(null)
  const [index, setIndex] = useState(0)
  const [entered, setEntered] = useState<number[]>([])
  const [cp3Options, setCp3Options] = useState<CP3Option[]>([])
  const [deadline, setDeadline] = useState<number | null>(null)
  const [remainingMs, setRemainingMs] = useState(CHECKPOINT_SECONDS * 1000)
  const [audioError, setAudioError] = useState(false)

  const mounted = useRef(true)
  const resolvedRef = useRef(false)
  const resultsRef = useRef<boolean[]>([])
  const completingRef = useRef(false)

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

  function present(activeItems: CheckpointItem[], i: number, corpus: ProgressionFrequency) {
    const item = activeItems[i]
    resolvedRef.current = false
    setEntered([])
    setDeadline(null)
    setRemainingMs(CHECKPOINT_SECONDS * 1000)
    setPhase('playing')
    onKeyChange(item.key)

    if (checkpointId === 'CP3') {
      const ranks = [item.rank, ...cp3DistractorRanks(item.rank, item.mode)].sort((a, b) => a - b)
      const pool = cp3ModePool(corpus, item.mode)
      setCp3Options(ranks.map((r) => ({ rank: r, label: motionLabel(pool[r]) })))
    }

    void withAudio(async () => {
      if (checkpointId === 'CP1') {
        await playCadenceThenBassLine(item.key.tonic, 'major', item.numerals)
      } else {
        await playCadenceThenProgression(item.key.tonic, item.mode, item.numerals)
      }
      if (mounted.current) {
        setDeadline(Date.now() + CHECKPOINT_SECONDS * 1000)
        setPhase('answering')
      }
    })
  }

  function startChallenge() {
    setPhase('loading')
    setItems(null)
    resultsRef.current = []
    setIndex(0)
    void loadProgressionFrequency().then((corpus) => {
      if (!mounted.current) return
      setData(corpus)
      const drawn = drawCheckpointItems(checkpointId, corpus)
      setItems(drawn)
      present(drawn, 0, corpus)
    })
  }

  useEffect(() => {
    startChallenge()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpointId])

  function finish() {
    const correct = resultsRef.current.filter(Boolean).length
    setPhase('result')
    if (correct >= CHECKPOINT_PASS_THRESHOLD && !completingRef.current) {
      completingRef.current = true
      void completeCheckpoint(checkpointId)
    }
  }

  function resolveItem(correct: boolean) {
    if (resolvedRef.current || !items) return
    resolvedRef.current = true
    resultsRef.current = [...resultsRef.current, correct]
    const nextIndex = index + 1
    if (nextIndex < items.length && data) {
      setIndex(nextIndex)
      present(items, nextIndex, data)
    } else {
      finish()
    }
  }

  function handleTimeout() {
    resolveItem(false)
  }

  // Countdown tick: wall-clock UI pacing only, not musical timing (brief
  // explicitly allows setInterval here).
  useEffect(() => {
    if (phase !== 'answering' || deadline === null) return
    const id = setInterval(() => {
      const left = deadline - Date.now()
      setRemainingMs(left)
      if (left <= 0) handleTimeout()
    }, 200)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, deadline])

  function handleDegree(d: number) {
    if (phase !== 'answering' || !items) return
    const item = items[index]
    const next = [...entered, d]
    if (next.length > 2) return
    setEntered(next)
    if (next.length === 2) {
      const targetDegrees = item.numerals.map((n) => NUMERAL_DEGREE[n])
      resolveItem(next.every((v, i) => v === targetDegrees[i]))
    }
  }

  function handleClear() {
    if (phase === 'answering') setEntered([])
  }

  function handleNumeral(n: string) {
    if (phase !== 'answering' || !items) return
    resolveItem(n === items[index].numerals[1])
  }

  function handleMotion(rank: number) {
    if (phase !== 'answering' || !items) return
    resolveItem(rank === items[index].rank)
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-6 py-3 text-[length:var(--fs-4)] font-bold text-[color:var(--ink)]'
  const smallChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'
  const slot =
    'mono flex h-16 w-16 items-center justify-center border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] text-[length:var(--fs-4)] font-bold text-[color:var(--ink)]'

  if (phase === 'result') {
    const correct = resultsRef.current.filter(Boolean).length
    const passed = correct >= CHECKPOINT_PASS_THRESHOLD
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <h1 className="display text-[length:var(--fs-5)] leading-tight">{t(`cp.${checkpointId}.title` as StringKey)}</h1>
        <div className="border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] p-6">
          <p className="mono my-2 text-[length:var(--fs-5)] font-bold" role="status">
            {passed
              ? t('cp.result.pass', { correct, total: CHECKPOINT_ITEM_COUNT })
              : t('cp.result.fail', { correct, total: CHECKPOINT_ITEM_COUNT })}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {!passed ? (
              <button className={smallChip} onClick={startChallenge}>
                {t('cp.result.retry')}
              </button>
            ) : null}
            <button className={smallChip} onClick={onExit}>
              {t('cp.result.continue')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const header = (
    <div className="mono flex flex-wrap items-center gap-x-6 gap-y-1 text-[length:var(--fs-1)]">
      <span>{t(`cp.${checkpointId}.title` as StringKey)}</span>
      {items ? <span>{t('cp.itemCount', { current: index + 1, total: CHECKPOINT_ITEM_COUNT })}</span> : null}
      {phase === 'answering' ? (
        <span role="timer" aria-label={t('cp.timeLeft', { clock: formatCountdown(remainingMs) })}>
          {formatCountdown(remainingMs)}
        </span>
      ) : null}
    </div>
  )

  if (phase === 'loading' || !items) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        {header}
        <p className="mono text-[length:var(--fs-2)]" role="status">
          {t('cp.loading')}
        </p>
      </div>
    )
  }

  const item = items[index]
  const keyLine = t(item.mode === 'major' ? 'cp.keyIs.major' : 'cp.keyIs.minor', { key: item.key.label })

  return (
    <div className="key-field flex-1 p-4">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        {header}
        <div className="mono text-[length:var(--fs-1)]">{keyLine}</div>

        {phase === 'playing' ? (
          <p className="mono text-[length:var(--fs-3)]" role="status">
            {t('cp.listening')}
          </p>
        ) : null}

        {phase === 'answering' && checkpointId === 'CP1' ? (
          <>
            <p className="display text-[length:var(--fs-4)]">{t('cp.cp1.prompt')}</p>
            <div className="flex gap-3">
              {[0, 1].map((i) => (
                <div key={i} className={slot}>
                  {entered[i] ?? ''}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {DEGREES.map((d) => (
                <button key={d} className={chip} disabled={entered.length >= 2} onClick={() => handleDegree(d)}>
                  {d}
                </button>
              ))}
              <button className={chip} onClick={handleClear}>
                {t('cp.clear')}
              </button>
            </div>
          </>
        ) : null}

        {phase === 'answering' && checkpointId === 'CP2' ? (
          <>
            <p className="display text-[length:var(--fs-4)]">{t('cp.cp2.prompt')}</p>
            <div className="flex flex-wrap gap-3">
              {NUMERALS.map((n) => (
                <button key={n} className={chip} onClick={() => handleNumeral(n)}>
                  {n}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {phase === 'answering' && checkpointId === 'CP3' ? (
          <>
            <p className="display text-[length:var(--fs-4)]">{t('cp.cp3.prompt')}</p>
            <div className="flex flex-wrap gap-3">
              {cp3Options.map((opt) => (
                <button
                  key={opt.rank}
                  className={`${chip} text-[length:var(--fs-1)]`}
                  onClick={() => handleMotion(opt.rank)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {audioError ? (
          <p className="mono text-[length:var(--fs-1)]" role="alert">
            {t('audio.error')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
