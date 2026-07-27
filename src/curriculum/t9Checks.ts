import type { TheoryCheck } from './checks'

// T9 check questions — cadences and phrase structure. Answers stay in
// Roman-numeral endings (the app's own notation), never interval names.

export const T9_CHECKS: TheoryCheck[] = [
  {
    id: 'q1',
    prompt: 't9.q1.prompt',
    options: ['V–I', 'V–vi', 'IV–I', 'ii–V'],
    answer: 'V–I',
  },
  { id: 'q2', prompt: 't9.q2.prompt', options: ['vi', 'ii', 'IV', 'V'], answer: 'vi' },
  { id: 'q3', prompt: 't9.q3.prompt', options: ['V', 'I', 'IV', 'ii'], answer: 'V' },
  { id: 'q4', prompt: 't9.q4.prompt', options: ['IV', 'V', 'ii', 'vi'], answer: 'IV' },
]
