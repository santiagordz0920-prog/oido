import { useState } from 'react'
import { useT } from '../state/settings'
import { randomKey, type KeyDef } from '../theory/keys'
import { item } from '../scheduler/items'
import { recordAttempt } from '../scheduler/engine'
import { E1Item, type ItemResult } from './items/E1Item'

// E1 free practice — a round of 10 randomly selected items across all 12
// keys. Attempts feed the same scheduler state as sessions, so free practice
// still trains the FSRS cards and Elo ratings.

const STABLE = [1, 3, 5]
const ROUND_LENGTH = 10

type ItemState = {
  key: KeyDef
  degree: number
}

function nextItemState(prev: ItemState | null): ItemState {
  let key = randomKey()
  // avoid repeating the same key twice in a row so transposition is felt
  while (prev && key.tonic === prev.key.tonic) key = randomKey()
  return { key, degree: STABLE[Math.floor(Math.random() * STABLE.length)] }
}

type Phase = 'intro' | 'running' | 'summary'

type Props = {
  onKeyChange: (k: KeyDef) => void
}

export function E1Drill({ onKeyChange }: Props) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('intro')
  const [current, setCurrent] = useState<ItemState | null>(null)
  const [itemNumber, setItemNumber] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  function startItem(prev: ItemState | null, number: number) {
    const it = nextItemState(prev)
    setCurrent(it)
    setItemNumber(number)
    onKeyChange(it.key)
  }

  function handleBegin() {
    setCorrectCount(0)
    setPhase('running')
    startItem(null, 1)
  }

  function handleResult(r: ItemResult) {
    if (!current) return
    if (r.correct) setCorrectCount((c) => c + 1)
    void recordAttempt({
      item: item(`E1|${current.key.tonic}|${current.degree}`),
      correct: r.correct,
      latencyMs: r.latencyMs,
      inputMode: 'tap',
      response: r.response,
    })
  }

  function handleNext() {
    if (itemNumber >= ROUND_LENGTH) setPhase('summary')
    else startItem(current, itemNumber + 1)
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-6 py-3 text-[length:var(--fs-4)] font-bold'
  const smallChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  return (
    // The key's hue as a full-bleed field: the user always knows the key
    // without reading. The key name is still printed — never hue alone.
    <div className="key-field flex-1 p-4">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div>
          <div className="mono text-[length:var(--fs-1)] opacity-90">{t('e1.eyebrow')}</div>
          <h1 className="display text-[length:var(--fs-5)] leading-tight sm:text-[length:var(--fs-6)]">
            {t('e1.title')}
          </h1>
        </div>

        {phase === 'intro' ? (
          <>
            <p className="max-w-[65ch]">{t('e1.intro')}</p>
            <button className={`${chip} self-start text-[color:var(--ink)]`} onClick={handleBegin}>
              {t('e1.begin')}
            </button>
          </>
        ) : null}

        {phase === 'running' && current ? (
          <>
            <div className="mono flex flex-wrap gap-x-6 gap-y-1 text-[length:var(--fs-1)]">
              <span>{t('e1.item', { n: itemNumber, total: ROUND_LENGTH })}</span>
              <span>{t('e1.keyIs', { key: current.key.label })}</span>
            </div>
            <E1Item
              itemKey={current.key}
              degree={current.degree}
              nextLabel={itemNumber >= ROUND_LENGTH ? t('e1.finish') : t('e1.next')}
              onResult={handleResult}
              onNext={handleNext}
            />
            <p className="mono text-[length:var(--fs-1)]">
              {t('e1.score', { correct: correctCount, total: itemNumber })}
            </p>
          </>
        ) : null}

        {phase === 'summary' ? (
          <div className="border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] p-6 text-[color:var(--ink)]">
            <h2 className="display text-[length:var(--fs-4)]">{t('e1.summary.title')}</h2>
            <p className="mono my-2 text-[length:var(--fs-5)] font-bold">
              {t('e1.score', { correct: correctCount, total: ROUND_LENGTH })}
            </p>
            <p className="mb-4 max-w-[65ch] text-[color:var(--ink-dim)]">{t('e1.summary.body')}</p>
            <button className={smallChip} onClick={handleBegin}>
              {t('e1.summary.again')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
