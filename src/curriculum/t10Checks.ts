import type { TheoryCheck } from './checks'

// T10 check questions — seventh chords and the tritone. Answers stay in
// scale-degree numbers, never interval names.

export const T10_CHECKS: TheoryCheck[] = [
  {
    id: 'q1',
    prompt: 't10.q1.prompt',
    options: ['4, 7', '2, 6', '1, 5', '3, 7'],
    answer: '4, 7',
  },
  {
    id: 'q2',
    prompt: 't10.q2.prompt',
    options: ['3, 1', '2, 7', '4, 6', '5, 1'],
    answer: '3, 1',
  },
  { id: 'q3', prompt: 't10.q3.prompt', options: ['3', '4', '5', '7'], answer: '4' },
  { id: 'q4', prompt: 't10.q4.prompt', options: ['3', '5', '6', '7'], answer: '7' },
]
