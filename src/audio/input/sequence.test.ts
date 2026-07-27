import { describe, expect, it } from 'vitest'
import {
  compareSequences,
  createPhraseCapture,
  firstMismatch,
  fragmentDegrees,
} from './sequence'
import type { NoteEvent } from './stabilize'

const note = (midi: number, tMs: number): NoteEvent => ({
  kind: 'note',
  midi,
  hz: 0,
  cents: 0,
  clarity: 1,
  tMs,
})
const off = (tMs: number): NoteEvent => ({ kind: 'off', tMs })

describe('createPhraseCapture', () => {
  it('returns the phrase once it reaches the expected length', () => {
    const capture = createPhraseCapture({ maxNotes: 3, endGapMs: 900 })
    expect(capture.push(note(60, 0))).toBeNull()
    expect(capture.push(note(62, 400))).toBeNull()
    const phrase = capture.push(note(64, 800))
    expect(phrase?.map((n) => n.midi)).toEqual([60, 62, 64])
  })

  it('closes a short phrase when the player stops', () => {
    const capture = createPhraseCapture({ maxNotes: 5, endGapMs: 900 })
    capture.push(note(60, 0))
    capture.push(note(62, 400))
    capture.push(off(700))
    // the next note comes after a long gap, so it starts a new phrase
    const phrase = capture.push(note(67, 2000))
    expect(phrase?.map((n) => n.midi)).toEqual([60, 62])
    expect(capture.notes().map((n) => n.midi)).toEqual([67])
  })

  it('keeps the phrase open across a brief gap', () => {
    const capture = createPhraseCapture({ maxNotes: 5, endGapMs: 900 })
    capture.push(note(60, 0))
    capture.push(off(300))
    expect(capture.push(note(62, 500))).toBeNull()
    expect(capture.notes().map((n) => n.midi)).toEqual([60, 62])
  })

  it('can be closed on demand', () => {
    const capture = createPhraseCapture({ maxNotes: 5, endGapMs: 900 })
    capture.push(note(60, 0))
    capture.push(note(62, 200))
    expect(capture.finish().map((n) => n.midi)).toEqual([60, 62])
    expect(capture.notes()).toEqual([])
  })
})

describe('compareSequences', () => {
  it('accepts the right phrase played in another octave', () => {
    const verdict = compareSequences([72, 74, 76], [60, 62, 64])
    expect(verdict.correct).toBe(true)
  })

  it('points at the position that went wrong', () => {
    const verdict = compareSequences([60, 63, 64], [60, 62, 64])
    expect(verdict.correct).toBe(false)
    expect(firstMismatch(verdict)).toBe(1)
    expect(verdict.positions[1]).toMatchObject({ expected: 62, played: 63, ok: false })
  })

  it('marks missing notes rather than silently passing', () => {
    const verdict = compareSequences([60, 62], [60, 62, 64])
    expect(verdict.correct).toBe(false)
    expect(verdict.positions[2]).toMatchObject({ played: null, ok: false })
  })

  it('counts notes played past the end of the target', () => {
    const verdict = compareSequences([60, 62, 64, 65], [60, 62, 64])
    expect(verdict.correct).toBe(false)
    expect(verdict.extra).toBe(1)
  })
})

describe('fragmentDegrees', () => {
  it('never repeats a degree back to back', () => {
    // Repeated pitches would merge into one note event on this input path,
    // so fragments must not contain them.
    for (let seed = 0; seed < 50; seed++) {
      let n = seed
      const rng = () => {
        n = (n * 1103515245 + 12345) % 2147483648
        return n / 2147483648
      }
      const fragment = fragmentDegrees(5, [1, 2, 3, 5], rng)
      expect(fragment).toHaveLength(5)
      for (let i = 1; i < fragment.length; i++) {
        expect(fragment[i]).not.toBe(fragment[i - 1])
      }
    }
  })

  it('refuses a pool it cannot walk without repeating', () => {
    expect(() => fragmentDegrees(3, [1])).toThrow()
  })
})
