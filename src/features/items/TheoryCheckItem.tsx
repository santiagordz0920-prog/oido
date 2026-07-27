import { useEffect, useRef, useState } from 'react'
import { useT } from '../../state/settings'
import { t2Check } from '../../curriculum/t2Checks'
import type { ItemResult } from './E1Item'

// One theory check question served as a review item inside a session.
// Unlike the lesson, this is one-shot retrieval: pick, see the verdict, move on.

type Props = {
  checkId: string
  nextLabel: string
  onResult: (r: ItemResult) => void
  onNext: () => void
}

export function TheoryCheckItem({ checkId, nextLabel, onResult, onNext }: Props) {
  const t = useT()
  const check = t2Check(checkId)
  const [picked, setPicked] = useState<string | null>(null)
  const shownAt = useRef(0)

  useEffect(() => {
    shownAt.current = performance.now()
    setPicked(null)
  }, [checkId])

  function handlePick(option: string) {
    if (picked !== null) return
    setPicked(option)
    onResult({
      correct: option === check.answer,
      latencyMs: Math.round(performance.now() - shownAt.current),
      response: option,
    })
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-3)] font-bold'

  return (
    <>
      <div className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">{t('session.theoryReview')}</div>
      <p className="max-w-[65ch] text-[length:var(--fs-3)]">{t(check.prompt)}</p>
      <div className="flex flex-wrap gap-2">
        {check.options.map((o) => (
          <button
            key={o}
            className={chip}
            onClick={() => handlePick(o)}
            aria-pressed={picked === o}
            disabled={picked !== null}
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null ? (
        <>
          <p className="mono text-[length:var(--fs-2)] font-bold" role="status">
            {picked === check.answer
              ? t('t2.check.correct')
              : t('session.check.reveal', { answer: check.answer })}
          </p>
          <button className={`${chip} self-start`} onClick={onNext}>
            {nextLabel}
          </button>
        </>
      ) : null}
    </>
  )
}
