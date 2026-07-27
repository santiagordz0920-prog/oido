import { useEffect, useState, type ReactNode } from 'react'
import { useT } from '../../state/settings'
import { useNodeCompleted } from '../../state/progress'
import { completeLesson } from '../../scheduler/engine'
import { LESSON_CHECKS } from '../../curriculum/checks'
import { stop } from '../../audio/engine'
import type { StringKey } from '../../i18n/strings'

// The four-part lesson frame (docs/curriculum.md §5): claim, audible
// demonstration, manipulable widget, check questions. The demo and widget
// are bespoke per lesson and arrive as children; the claim and the check
// flow (think first, then options, retry until correct) are shared. Checks
// come from the registry, so the same questions also serve as FSRS items.

export type LessonSection = {
  headingKey: StringKey
  bodyKey?: StringKey
  bodyVars?: Record<string, string | number>
  content: ReactNode
}

type Props = {
  nodeId: string
  eyebrowKey: StringKey
  titleKey: StringKey
  claimKey: StringKey
  sections: LessonSection[]
  completeBodyKey: StringKey
  completeCtaLabelKey: StringKey
  onComplete: () => void // CTA action after the checks are done
}

export function LessonShell({
  nodeId,
  eyebrowKey,
  titleKey,
  claimKey,
  sections,
  completeBodyKey,
  completeCtaLabelKey,
  onComplete,
}: Props) {
  const t = useT()
  const checks = LESSON_CHECKS[nodeId] ?? []
  const alreadyComplete = useNodeCompleted(nodeId)

  const [qIndex, setQIndex] = useState(0)
  const [optionsShown, setOptionsShown] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const done = qIndex >= checks.length

  useEffect(() => () => stop(), [])

  useEffect(() => {
    if (done && !alreadyComplete) void completeLesson(nodeId)
  }, [done, alreadyComplete, nodeId])

  function handlePick(option: string) {
    setPicked(option)
    if (option === checks[qIndex].answer) {
      // UI pacing, not musical timing — setTimeout is fine here
      setTimeout(() => {
        setQIndex((i) => i + 1)
        setOptionsShown(false)
        setPicked(null)
      }, 700)
    }
  }

  const section = 'border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] p-4 sm:p-6'
  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-3)] font-bold text-[color:var(--ink)]'

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <div>
        <div className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">{t(eyebrowKey)}</div>
        <h1 className="display text-[length:var(--fs-5)] leading-tight sm:text-[length:var(--fs-6)]">
          {t(titleKey)}
        </h1>
      </div>

      <p className="max-w-[65ch]">{t(claimKey)}</p>

      {sections.map((s, i) => (
        <section key={i} className={section}>
          <h2 className="display mb-2 text-[length:var(--fs-3)]">{t(s.headingKey)}</h2>
          {s.bodyKey ? <p className="mb-4 max-w-[65ch]">{t(s.bodyKey, s.bodyVars)}</p> : null}
          {s.content}
        </section>
      ))}

      <section className={section}>
        <h2 className="display mb-2 text-[length:var(--fs-3)]">{t('lesson.check.heading')}</h2>
        {!done ? (
          <>
            <div className="mono mb-2 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
              {t('lesson.check.progress', { n: qIndex + 1, total: checks.length })}
            </div>
            <p className="mb-3 max-w-[65ch] text-[length:var(--fs-3)]">{t(checks[qIndex].prompt)}</p>
            {!optionsShown ? (
              <>
                <p className="mb-3 text-[color:var(--ink-dim)]">{t('lesson.check.think')}</p>
                <button className={chip} onClick={() => setOptionsShown(true)}>
                  {t('lesson.check.showOptions')}
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {checks[qIndex].options.map((o) => (
                    <button key={o} className={chip} onClick={() => handlePick(o)} aria-pressed={picked === o}>
                      {o}
                    </button>
                  ))}
                </div>
                {picked !== null ? (
                  <p className="mono mt-3 text-[length:var(--fs-2)] font-bold" role="status">
                    {picked === checks[qIndex].answer ? t('lesson.check.correct') : t('lesson.check.incorrect')}
                  </p>
                ) : null}
              </>
            )}
          </>
        ) : (
          <div role="status">
            <h3 className="display text-[length:var(--fs-4)]">{t('lesson.complete.title')}</h3>
            <p className="mb-4 max-w-[65ch]">{t(completeBodyKey)}</p>
            <button className={chip} onClick={onComplete}>
              {t(completeCtaLabelKey)}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
