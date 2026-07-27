import { describe, expect, it } from 'vitest'
import {
  MAX_GATE_MARGIN_DB,
  MIN_GATE_MARGIN_DB,
  gateMarginFor,
  noiseFloorFrom,
} from './mic'

// Frames arrive about every 21 ms, so 120 samples is roughly the 2.5 s
// calibration window.
function steady(level: number, count: number): number[] {
  return Array.from({ length: count }, () => level)
}

describe('noiseFloorFrom', () => {
  it('reports the level the room sits at, not its loudest moment', () => {
    // A real room: a steady background with a burst partway through — a car
    // outside, a chair, someone in the next room. The burst must not define
    // the floor, or the gate built on it sits above the guitar.
    const room = 0.004
    const samples = [...steady(room, 60), ...steady(0.06, 20), ...steady(room, 40)]
    const floor = noiseFloorFrom(samples)
    expect(floor).toBeGreaterThan(room * 0.7)
    expect(floor).toBeLessThan(room * 1.5)
  })

  it('shrugs off single-frame spikes', () => {
    const samples = steady(0.003, 120)
    samples[30] = 0.4
    samples[77] = 0.35
    expect(noiseFloorFrom(samples)).toBeLessThan(0.005)
  })

  it('still reports a genuinely loud room as loud', () => {
    // Under-reporting a noisy room would be just as wrong in the other
    // direction: the gate would let the room through as notes.
    const floor = noiseFloorFrom(steady(0.02, 120))
    expect(floor).toBeGreaterThan(0.015)
  })

  it('keeps an absolute minimum so silence cannot produce a zero gate', () => {
    expect(noiseFloorFrom(steady(0, 120))).toBeGreaterThan(0)
  })

  it('falls back to the default with no samples', () => {
    expect(noiseFloorFrom([])).toBeGreaterThan(0)
  })
})

describe('gateMarginFor', () => {
  it('places the gate halfway between the room and the guitar, in dB', () => {
    const floor = 0.004
    const peak = floor * 10 ** (16 / 20) // 16 dB of separation
    expect(gateMarginFor(floor, peak)).toBeCloseTo(8, 1)
  })

  it('does not demand more separation than a noisy room can offer', () => {
    // The reported case: practising in a room with normal background noise,
    // where the guitar clears the floor by well under the old fixed 12 dB.
    const floor = 0.01
    const peak = floor * 10 ** (8 / 20)
    expect(gateMarginFor(floor, peak)).toBe(MIN_GATE_MARGIN_DB)
  })

  it('caps the margin in a very quiet room', () => {
    const floor = 0.0009
    const peak = floor * 10 ** (40 / 20)
    expect(gateMarginFor(floor, peak)).toBe(MAX_GATE_MARGIN_DB)
  })

  it('falls back to the widest margin when no note was measured', () => {
    expect(gateMarginFor(0.004, null)).toBe(MAX_GATE_MARGIN_DB)
    expect(gateMarginFor(0.004, 0)).toBe(MAX_GATE_MARGIN_DB)
  })
})
