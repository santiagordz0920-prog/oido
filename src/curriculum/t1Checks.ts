import type { TheoryCheck } from './checks'

// T1 check questions — the harmonic series. Answers stay in partial numbers
// and scale-degree numbers (never interval names), matching the T2 precedent.

export const T1_CHECKS: TheoryCheck[] = [
  { id: 'q1', prompt: 't1.q1.prompt', options: ['2', '3', '4', '5'], answer: '2' },
  { id: 'q2', prompt: 't1.q2.prompt', options: ['2', '3', '4', '5'], answer: '3' },
  { id: 'q3', prompt: 't1.q3.prompt', options: ['2', '3', '5', '7'], answer: '5' },
  { id: 'q4', prompt: 't1.q4.prompt', options: ['1', '2', '3', '4'], answer: '2' },
]
