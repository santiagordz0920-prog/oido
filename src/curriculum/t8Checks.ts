import type { TheoryCheck } from './checks'

// T8 check questions — functional harmony (tonic, subdominant, dominant).
// Answers stay in the T/S/D function letters and Roman numerals the lesson
// itself uses, never interval names.

export const T8_CHECKS: TheoryCheck[] = [
  { id: 'q1', prompt: 't8.q1.prompt', options: ['T', 'S', 'D'], answer: 'D' },
  {
    id: 'q2',
    prompt: 't8.q2.prompt',
    options: ['I, vi, iii', 'IV, ii', 'V, vii°', 'I, IV, V'],
    answer: 'I, vi, iii',
  },
  { id: 'q3', prompt: 't8.q3.prompt', options: ['T', 'S', 'D'], answer: 'S' },
  { id: 'q4', prompt: 't8.q4.prompt', options: ['I', 'IV', 'vi', 'ii'], answer: 'I' },
]
