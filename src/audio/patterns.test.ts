import { describe, expect, it } from 'vitest'
import {
  barPlan,
  barSeconds,
  bassPattern,
  compPattern,
  drumPattern,
  FEELS,
  secondsPerBeat,
  swingBeat,
  BEATS_PER_BAR,
} from './patterns'

describe('swingBeat', () => {
  it('pushes the second eighth into a 2:1 ratio', () => {
    expect(swingBeat(0.5, 'swing')).toBeCloseTo(2 / 3, 10)
    expect(swingBeat(2.5, 'swing')).toBeCloseTo(2 + 2 / 3, 10)
  })

  it('leaves downbeats and quarters alone', () => {
    for (const beat of [0, 1, 2, 3]) expect(swingBeat(beat, 'swing')).toBe(beat)
  })

  it('is the identity for the unswung feels', () => {
    for (const feel of ['straight', 'ballad'] as const) {
      for (const beat of [0, 0.5, 1.5, 2.5]) expect(swingBeat(beat, feel)).toBe(beat)
    }
  })
})

describe('patterns', () => {
  it('keeps every hit inside its bar', () => {
    for (const feel of FEELS) {
      const hits = [...bassPattern(feel), ...compPattern(feel), ...drumPattern(feel)]
      expect(hits.length).toBeGreaterThan(0)
      for (const hit of hits) {
        expect(hit.beat).toBeGreaterThanOrEqual(0)
        expect(swingBeat(hit.beat, feel)).toBeLessThan(BEATS_PER_BAR)
        expect(hit.velocity).toBeGreaterThan(0)
        expect(hit.velocity).toBeLessThanOrEqual(1)
      }
    }
  })

  it('always sounds the root on the downbeat, in every feel', () => {
    for (const feel of FEELS) {
      const downbeat = bassPattern(feel).find((h) => h.beat === 0)
      expect(downbeat?.tone).toBe('root')
    }
  })

  // Only the walking line looks ahead; a straight or ballad bass that
  // borrowed the next chord's leading tone would blur the change.
  it('uses an approach tone only in the swing feel', () => {
    expect(bassPattern('swing').some((h) => h.tone === 'approach')).toBe(true)
    expect(bassPattern('straight').some((h) => h.tone === 'approach')).toBe(false)
    expect(bassPattern('ballad').some((h) => h.tone === 'approach')).toBe(false)
  })

  it('gives every feel a backbeat to play against', () => {
    for (const feel of FEELS) {
      expect(drumPattern(feel).some((h) => h.piece === 'snare')).toBe(true)
      expect(drumPattern(feel).some((h) => h.piece === 'kick')).toBe(true)
    }
  })
})

describe('barPlan', () => {
  it('gives one bar per chord by default', () => {
    const plan = barPlan(['I', 'IV', 'V'])
    expect(plan.map((b) => b.numeral)).toEqual(['I', 'IV', 'V'])
    expect(plan.map((b) => b.barIndex)).toEqual([0, 1, 2])
    expect(plan.map((b) => b.chordIndex)).toEqual([0, 1, 2])
  })

  it('stretches a chord across bars for a vamp', () => {
    const plan = barPlan(['I', 'IV'], 2)
    expect(plan.map((b) => b.numeral)).toEqual(['I', 'I', 'IV', 'IV'])
    expect(plan.map((b) => b.chordIndex)).toEqual([0, 0, 1, 1])
    expect(plan.map((b) => b.barIndex)).toEqual([0, 1, 2, 3])
  })

  // The loop is the point: the last chord leads back to the first, so the
  // walking bass approaches the top of the progression rather than nothing.
  it('wraps the next numeral at the end of the loop', () => {
    const plan = barPlan(['ii', 'V', 'I'])
    expect(plan.map((b) => b.nextNumeral)).toEqual(['V', 'I', 'ii'])
  })

  it('rejects an empty progression', () => {
    expect(() => barPlan([])).toThrow()
    expect(() => barPlan(['I'], 0)).toThrow()
  })
})

describe('tempo arithmetic', () => {
  it('converts bpm to seconds', () => {
    expect(secondsPerBeat(120)).toBeCloseTo(0.5, 10)
    expect(barSeconds(120)).toBeCloseTo(2, 10)
    expect(barSeconds(90)).toBeCloseTo(8 / 3, 10)
  })
})
