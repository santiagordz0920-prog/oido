import type { TheoryCheck } from './checks'

// T5 check questions — minor in three forms. Answers stay in scale-degree
// numbers and degree-to-degree arrows (never interval names or prose that
// would need per-locale option text).

export const T5_CHECKS: TheoryCheck[] = [
  { id: 'q1', prompt: 't5.q1.prompt', options: ['5', '6', '7', '2'], answer: '7' },
  {
    id: 'q2',
    prompt: 't5.q2.prompt',
    options: ['7 → 1', '6 → 5', '2 → 1', '4 → 3'],
    answer: '7 → 1',
  },
  {
    id: 'q3',
    prompt: 't5.q3.prompt',
    options: ['6, 7', '5, 6', '2, 3', '3, 7'],
    answer: '6, 7',
  },
  { id: 'q4', prompt: 't5.q4.prompt', options: ['0', '1', '2', '3'], answer: '0' },
]
