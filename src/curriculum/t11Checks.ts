import type { TheoryCheck } from './checks'

// T11 check questions — voice leading and guide tones. Answers stay in
// counts and chord-degree numbers, never interval names.

export const T11_CHECKS: TheoryCheck[] = [
  { id: 'q1', prompt: 't11.q1.prompt', options: ['2', '3', '4', '5'], answer: '3' },
  {
    id: 'q2',
    prompt: 't11.q2.prompt',
    options: ['1, 5', '3, 7', '2, 6', '4, 8'],
    answer: '3, 7',
  },
  { id: 'q3', prompt: 't11.q3.prompt', options: ['1', '3', '5', '7'], answer: '1' },
  { id: 'q4', prompt: 't11.q4.prompt', options: ['1', '2', '3', '4'], answer: '1' },
]
