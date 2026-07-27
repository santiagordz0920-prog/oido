import type { StringKey } from '../i18n/strings'

// T2 check questions. Shared by the lesson and by the scheduler, because
// theory checks are FSRS items too — theory decays like everything else.

export type TheoryCheck = {
  id: string // FSRS card context within node T2
  prompt: StringKey
  options: string[]
  answer: string
}

export const T2_CHECKS: TheoryCheck[] = [
  { id: 'q1', prompt: 't2.q1.prompt', options: ['1', '3', '5', '7'], answer: '1' },
  { id: 'q2', prompt: 't2.q2.prompt', options: ['5', '7', '8', '12'], answer: '7' },
  { id: 'q3', prompt: 't2.q3.prompt', options: ['A', 'B', 'G♯', 'C♯'], answer: 'B' },
  { id: 'q4', prompt: 't2.q4.prompt', options: ['C', 'C♯', 'E♭', 'D'], answer: 'C' },
]

export function t2Check(id: string): TheoryCheck {
  const c = T2_CHECKS.find((c) => c.id === id)
  if (!c) throw new Error(`Unknown T2 check: ${id}`)
  return c
}
