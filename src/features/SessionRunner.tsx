import { useEffect, useRef, useState } from 'react'
import { useT } from '../state/settings'
import { db } from '../db'
import { nextItem, recordAttempt, type NextItem } from '../scheduler/engine'
import { MODES, type SessionMode } from '../session/modes'
import { ensureAudio, playCadence, playDegree, stop } from '../audio/engine'
import { keyByTonic, randomKey, type KeyDef } from '../theory/keys'
import { E0Item } from './items/E0Item'
import { E1Item, type ItemResult } from './items/E1Item'
import { E2Item } from './items/E2Item'
import { E3Item } from './items/E3Item'
import { TheoryCheckItem } from './items/TheoryCheckItem'

// The session runner: pick a mode, run its timed blocks, feed items from the
// scheduler, save the session. The clock here is wall time for pacing the
// session, not musical timing — audio still runs through Tone.Transport.

type Props = {
  mode: SessionMode
  onKeyChange: (k: KeyDef) => void
  onExit: () => void
}

type RunnerPhase = 'running' | 'summary'

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function SessionRunner({ mode, onKeyChange, onExit }: Props) {
  const t = useT()
  const def = MODES[mode]

  const [phase, setPhase] = useState<RunnerPhase>('running')
  const [blockIndex, setBlockIndex] = useState(0)
  const [deadline, setDeadline] = useState(() => Date.now() + def.blocks[0].minutes * 60_000)
  const [current, setCurrent] = useState<NextItem | null>(null)
  const [counts, setCounts] = useState({ items: 0, correct: 0 })
  const [remaining, setRemaining] = useState(def.blocks[0].minutes * 60_000)
  const [empty, setEmpty] = useState(false)

  const recent = useRef<string[]>([])
  const startTs = useRef(Date.now())
  const countsRef = useRef(counts)
  countsRef.current = counts
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      stop()
    }
  }, [])

  const block = def.blocks[blockIndex]

  async function finish() {
    stop()
    const c = countsRef.current
    await db.sessions.add({
      mode,
      startTs: startTs.current,
      endTs: Date.now(),
      items: c.items,
      correct: c.correct,
    })
    if (mounted.current) setPhase('summary')
  }

  async function loadNext(index: number) {
    const b = def.blocks[index]
    if (b.kind !== 'drill') return
    const found = await nextItem(b.tracks, recent.current)
    if (!mounted.current) return
    if (!found) {
      setEmpty(true)
      return
    }
    if (found.item.kind === 'recognition') {
      onKeyChange(keyByTonic(String(found.item.params.tonic)))
    }
    setCurrent(found)
  }

  function startBlock(index: number) {
    stop()
    setBlockIndex(index)
    setCurrent(null)
    const ms = def.blocks[index].minutes * 60_000
    setDeadline(Date.now() + ms)
    setRemaining(ms)
    void loadNext(index)
  }

  function advanceBlock() {
    if (blockIndex + 1 < def.blocks.length) startBlock(blockIndex + 1)
    else void finish()
  }

  // Session pacing tick (wall clock, once a second).
  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => {
      const left = deadline - Date.now()
      setRemaining(left)
      // Warm-up ends on the clock; drill blocks end at the next item boundary.
      if (left <= 0 && def.blocks[blockIndex].kind === 'warmup') advanceBlock()
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, deadline, blockIndex])

  useEffect(() => {
    void loadNext(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleResult(r: ItemResult) {
    const item = current?.item
    if (!item) return
    setCounts((c) => ({ items: c.items + 1, correct: c.correct + (r.correct ? 1 : 0) }))
    recent.current = [...recent.current.slice(-1), item.nodeId]
    void recordAttempt({ item, correct: r.correct, latencyMs: r.latencyMs, inputMode: 'tap', response: r.response })
  }

  function handleNext() {
    if (Date.now() >= deadline) advanceBlock()
    else void loadNext(blockIndex)
  }

  // text color is explicit because this chip also renders on the key-field,
  // where the inherited color is the reversed-out field color
  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'

  if (phase === 'summary') {
    const accuracy = counts.items > 0 ? Math.round((100 * counts.correct) / counts.items) : 0
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <div>
          <div className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {t(`session.mode.${mode}.name`)}
          </div>
          <h1 className="display text-[length:var(--fs-5)] leading-tight">{t('session.summary.title')}</h1>
        </div>
        <div className="border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] p-6">
          <p className="mono my-2 text-[length:var(--fs-5)] font-bold">
            {t('session.summary.score', { correct: counts.correct, total: counts.items })}
          </p>
          {counts.items > 0 ? (
            <p className="mb-4 max-w-[65ch] text-[color:var(--ink-dim)]">
              {t('session.summary.accuracy', { pct: accuracy })}
            </p>
          ) : null}
          <button className={chip} onClick={onExit}>
            {t('shell.back')}
          </button>
        </div>
      </div>
    )
  }

  const meta = (
    <div className="mono flex flex-wrap gap-x-6 gap-y-1 text-[length:var(--fs-1)]">
      <span>{t(`session.mode.${mode}.name`)}</span>
      <span>{t('session.timeLeft', { clock: formatClock(remaining) })}</span>
      <span>{t('session.count', { n: counts.items })}</span>
    </div>
  )

  const endButton = (
    <button className={`${chip} self-start`} onClick={() => void finish()}>
      {t('session.end')}
    </button>
  )

  if (block.kind === 'warmup') {
    return (
      <div className="key-field flex-1 p-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {meta}
          <WarmupBlock onKeyChange={onKeyChange} onSkip={advanceBlock} />
          {endButton}
        </div>
      </div>
    )
  }

  if (empty) {
    // No servable cards: the only gate that matters today is the T2 lesson.
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        {meta}
        <p className="max-w-[65ch]">{t('session.empty')}</p>
        {endButton}
      </div>
    )
  }

  if (!current) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        {meta}
        <p className="mono text-[length:var(--fs-2)]" role="status">
          {t('session.loading')}
        </p>
      </div>
    )
  }

  const note = block.fallbackNote ? (
    <p className="mono max-w-[65ch] text-[length:var(--fs-1)] opacity-90">{t(block.fallbackNote)}</p>
  ) : null

  if (current.item.kind === 'recognition') {
    const itemKey = keyByTonic(String(current.item.params.tonic))
    const degree = Number(current.item.params.degree)
    const nextLabel = t('e1.next')
    let recognitionItem
    if (current.item.nodeId === 'E0') {
      recognitionItem = (
        <E0Item
          itemKey={itemKey}
          degree={degree}
          gapSeconds={Number(current.item.params.gapSeconds)}
          nextLabel={nextLabel}
          onResult={handleResult}
          onNext={handleNext}
        />
      )
    } else if (current.item.nodeId === 'E2') {
      recognitionItem = (
        <E2Item itemKey={itemKey} degree={degree} nextLabel={nextLabel} onResult={handleResult} onNext={handleNext} />
      )
    } else if (current.item.nodeId === 'E3') {
      recognitionItem = (
        <E3Item itemKey={itemKey} degree={degree} nextLabel={nextLabel} onResult={handleResult} onNext={handleNext} />
      )
    } else {
      recognitionItem = (
        <E1Item itemKey={itemKey} degree={degree} nextLabel={nextLabel} onResult={handleResult} onNext={handleNext} />
      )
    }
    return (
      <div className="key-field flex-1 p-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {meta}
          {note}
          <div className="mono text-[length:var(--fs-1)]">{t('e1.keyIs', { key: itemKey.label })}</div>
          {recognitionItem}
          {endButton}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      {meta}
      {note}
      <TheoryCheckItem
        checkId={String(current.item.params.checkId)}
        nextLabel={t('e1.next')}
        onResult={handleResult}
        onNext={handleNext}
      />
      {endButton}
    </div>
  )
}

// Bench warm-up: re-anchor the ear to a tonic before drilling. A cadence
// establishes a key; the user sings the tonic and checks against the piano.
function WarmupBlock({ onKeyChange, onSkip }: { onKeyChange: (k: KeyDef) => void; onSkip: () => void }) {
  const t = useT()
  const [key, setKey] = useState<KeyDef>(() => randomKey())
  const [audioError, setAudioError] = useState(false)

  useEffect(() => {
    onKeyChange(key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  async function withAudio(fn: () => Promise<void>) {
    try {
      setAudioError(false)
      await ensureAudio()
      await fn()
    } catch {
      setAudioError(true)
    }
  }

  function newKey() {
    stop()
    let k = randomKey()
    while (k.tonic === key.tonic) k = randomKey()
    setKey(k)
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'

  return (
    <>
      <h1 className="display text-[length:var(--fs-5)] leading-tight">{t('session.warmup.title')}</h1>
      <div className="mono text-[length:var(--fs-1)]">{t('e1.keyIs', { key: key.label })}</div>
      <p className="max-w-[65ch]">{t('session.warmup.body')}</p>
      <div className="flex flex-wrap gap-3">
        <button className={chip} onClick={() => void withAudio(() => playCadence(key.tonic))}>
          {t('session.warmup.play')}
        </button>
        <button className={chip} onClick={() => void withAudio(() => playDegree(key.tonic, 1))}>
          {t('session.warmup.tonic')}
        </button>
        <button className={chip} onClick={newKey}>
          {t('session.warmup.nextKey')}
        </button>
        <button className={chip} onClick={onSkip}>
          {t('session.warmup.skip')}
        </button>
      </div>
      {audioError ? (
        <p className="mono text-[length:var(--fs-1)]" role="alert">
          {t('audio.error')}
        </p>
      ) : null}
    </>
  )
}
