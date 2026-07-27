import type { TheoryCheck } from './checks'

// T3 check questions — tendency and resolution. Answers stay in scale
// degrees and note letters (never interval names), which keeps them
// language-neutral: the prose prompts are localized via StringKey, but the
// option/answer tokens themselves are not translated (see t2Checks.ts).

export const T3_CHECKS: TheoryCheck[] = [
  { id: 'q1', prompt: 't3.q1.prompt', options: ['2', '4', '6', '7'], answer: '7' },
  { id: 'q2', prompt: 't3.q2.prompt', options: ['2', '3', '5', '6'], answer: '3' },
  {
    id: 'q3',
    prompt: 't3.q3.prompt',
    options: ['1, 3, 5', '2, 4, 6', '1, 4, 5', '2, 4, 7'],
    answer: '1, 3, 5',
  },
  { id: 'q4', prompt: 't3.q4.prompt', options: ['G', 'G♯', 'A', 'F♯'], answer: 'G♯' },
]
