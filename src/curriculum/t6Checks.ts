import type { TheoryCheck } from './checks'

// T6 check questions — triad construction, four qualities. Quality answers
// use the ° / + suffixes the app's own Roman-numeral notation already uses
// (vii°, V+), which read the same in both locales.

export const T6_CHECKS: TheoryCheck[] = [
  { id: 'q1', prompt: 't6.q1.prompt', options: ['1', '3', '5', '7'], answer: '3' },
  { id: 'q2', prompt: 't6.q2.prompt', options: ['°', '+', 'maj', 'min'], answer: '°' },
  { id: 'q3', prompt: 't6.q3.prompt', options: ['+', '°', 'maj', 'min'], answer: '+' },
  { id: 'q4', prompt: 't6.q4.prompt', options: ['2', '3', '4', '7'], answer: '4' },
]
