import type { StringKey } from '../i18n/strings'
import { T2_CHECKS } from './t2Checks'

// Check questions for every theory lesson, keyed by node id. Shared by the
// lesson screens and by the scheduler, because theory checks are FSRS items
// too — theory decays like everything else. Lessons register their checks
// here as they are built; the item generator in src/scheduler/items.ts
// reads this registry.

export type TheoryCheck = {
  id: string // FSRS card context within its node
  prompt: StringKey
  options: string[]
  answer: string
}

export const LESSON_CHECKS: Record<string, TheoryCheck[]> = {
  T2: T2_CHECKS,
}

export function lessonCheck(nodeId: string, checkId: string): TheoryCheck {
  const c = LESSON_CHECKS[nodeId]?.find((c) => c.id === checkId)
  if (!c) throw new Error(`Unknown check ${nodeId}/${checkId}`)
  return c
}
