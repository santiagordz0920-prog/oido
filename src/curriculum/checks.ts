import type { StringKey } from '../i18n/strings'
import { T1_CHECKS } from './t1Checks'
import { T2_CHECKS } from './t2Checks'
import { T3_CHECKS } from './t3Checks'
import { T4_CHECKS } from './t4Checks'
import { T5_CHECKS } from './t5Checks'
import { T6_CHECKS } from './t6Checks'
import { T7_CHECKS } from './t7Checks'
import { T8_CHECKS } from './t8Checks'
import { T9_CHECKS } from './t9Checks'
import { T10_CHECKS } from './t10Checks'
import { T11_CHECKS } from './t11Checks'
import { T12_CHECKS } from './t12Checks'

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
  T1: T1_CHECKS,
  T2: T2_CHECKS,
  T3: T3_CHECKS,
  T4: T4_CHECKS,
  T5: T5_CHECKS,
  T6: T6_CHECKS,
  T7: T7_CHECKS,
  T8: T8_CHECKS,
  T9: T9_CHECKS,
  T10: T10_CHECKS,
  T11: T11_CHECKS,
  T12: T12_CHECKS,
}

export function lessonCheck(nodeId: string, checkId: string): TheoryCheck {
  const c = LESSON_CHECKS[nodeId]?.find((c) => c.id === checkId)
  if (!c) throw new Error(`Unknown check ${nodeId}/${checkId}`)
  return c
}
