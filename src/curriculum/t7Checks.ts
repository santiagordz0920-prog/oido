import type { TheoryCheck } from './checks'

// T7 check questions — harmonizing the scale. Answers stay in Roman
// numerals and the ° suffix, which the app already uses untranslated.

export const T7_CHECKS: TheoryCheck[] = [
  {
    id: 'q1',
    prompt: 't7.q1.prompt',
    options: ['ii, iii, vi', 'I, IV, V', 'ii, IV, vi', 'iii, V, vii°'],
    answer: 'ii, iii, vi',
  },
  { id: 'q2', prompt: 't7.q2.prompt', options: ['°', '+', 'maj', 'min'], answer: '°' },
  {
    id: 'q3',
    prompt: 't7.q3.prompt',
    options: ['I, IV, V', 'ii, iii, vi', 'IV, V, vi', 'I, iii, V'],
    answer: 'I, IV, V',
  },
  { id: 'q4', prompt: 't7.q4.prompt', options: ['I', 'IV', 'ii', 'vi'], answer: 'I' },
]
