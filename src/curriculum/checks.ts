import type { StringKey } from '../i18n/strings'
import { T2_CHECKS } from './t2Checks'
import { T3_CHECKS } from './t3Checks'
import { T4_CHECKS } from './t4Checks'
import { T5_CHECKS } from './t5Checks'
import { T6_CHECKS } from './t6Checks'
import { T7_CHECKS } from './t7Checks'

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
  T3: T3_CHECKS,
  T4: T4_CHECKS,
  T5: T5_CHECKS,
  T6: T6_CHECKS,
  T7: T7_CHECKS,
}

export function lessonCheck(nodeId: string, checkId: string): TheoryCheck {
  const c = LESSON_CHECKS[nodeId]?.find((c) => c.id === checkId)
  if (!c) throw new Error(`Unknown check ${nodeId}/${checkId}`)
  return c
}
