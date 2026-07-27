import type { TheoryCheck } from './checks'

// T4 check questions — key signatures and the circle of fifths. Note
// letters and counts only, never interval names.

export const T4_CHECKS: TheoryCheck[] = [
  { id: 'q1', prompt: 't4.q1.prompt', options: ['C', 'D', 'A', 'B'], answer: 'D' },
  { id: 'q2', prompt: 't4.q2.prompt', options: ['1', '2', '4', '7'], answer: '4' },
  { id: 'q3', prompt: 't4.q3.prompt', options: ['0', '1', '2', '7'], answer: '1' },
  { id: 'q4', prompt: 't4.q4.prompt', options: ['G', 'B', 'F♯', 'E♭'], answer: 'F♯' },
]
