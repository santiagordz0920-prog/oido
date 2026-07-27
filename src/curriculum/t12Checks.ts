import type { TheoryCheck } from './checks'

// T12 check questions — inversions and slash chords. Answers stay in chord
// degree numbers, never interval names.

export const T12_CHECKS: TheoryCheck[] = [
  { id: 'q1', prompt: 't12.q1.prompt', options: ['1', '3', '5', '7'], answer: '3' },
  { id: 'q2', prompt: 't12.q2.prompt', options: ['1', '3', '5', '7'], answer: '5' },
  { id: 'q3', prompt: 't12.q3.prompt', options: ['2', '3', '4', '6'], answer: '3' },
  { id: 'q4', prompt: 't12.q4.prompt', options: ['1', '3', '5', '7'], answer: '1' },
]
