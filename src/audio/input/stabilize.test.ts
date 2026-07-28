import { describe, expect, it } from 'vitest'
import { createStabilizer, DEFAULT_CONFIG, type DetectorFrame, type NoteEvent } from './stabilize'
import { midiToHz } from './notes'

// Frames arrive roughly every 21 ms (1024-sample hop at 48 kHz).
const HOP = 21
const LOUD = 0.08 // comfortably above the default gate
const E2 = midiToHz(40) // 82.41, the acoustic's worst case for a laptop mic

function frames(
  count: number,
  overrides: Partial<DetectorFrame> & { hz: number },
  startMs = 0,
): DetectorFrame[] {
  return Array.from({ length: count }, (_, i) => ({
    tMs: startMs + i * HOP,
    clarity: 0.95,
    rms: LOUD,
    halfHarmonicRatio: 0,
    ...overrides,
  }))
}

function run(stab: ReturnType<typeof createStabilizer>, fs: DetectorFrame[]): NoteEvent[] {
  return fs.map((f) => stab.push(f)).filter((e): e is NoteEvent => e !== null)
}

describe('stabilizer gates', () => {
  it('reports nothing below the measured noise floor', () => {
    const stab = createStabilizer()
    const events = run(stab, frames(10, { hz: E2, rms: DEFAULT_CONFIG.noiseFloorRms * 1.5 }))
    expect(events).toEqual([])
    expect(stab.current()).toBeNull()
  })

  it('reports nothing when clarity is under threshold', () => {
    const stab = createStabilizer()
    expect(run(stab, frames(10, { hz: E2, clarity: 0.5 }))).toEqual([])
  })

  it('ignores pitches outside the guitar and voice range', () => {
    const stab = createStabilizer()
    expect(run(stab, frames(10, { hz: 40 }))).toEqual([])
    expect(run(stab, frames(10, { hz: 3000 }))).toEqual([])
  })

  it('blanks the pick transient, then settles', () => {
    const stab = createStabilizer()
    // quiet, then a sharp rise: the attack frames must be discarded
    stab.push({ tMs: 0, hz: 0, clarity: 0, rms: 0.001, halfHarmonicRatio: 0 })
    const attack = stab.push({ tMs: HOP, hz: 600, clarity: 0.99, rms: LOUD, halfHarmonicRatio: 0 })
    expect(attack).toBeNull()
    // frames inside the blanking window are ignored even if confident
    expect(stab.push({ tMs: HOP * 2, hz: 600, clarity: 0.99, rms: LOUD, halfHarmonicRatio: 0 })).toBeNull()
    const events = run(stab, frames(5, { hz: E2 }, HOP * 4))
    expect(events.map((e) => e.kind)).toEqual(['note'])
  })
})

describe('note detection', () => {
  it('emits a stable note once a short window agrees', () => {
    const stab = createStabilizer()
    const events = run(stab, frames(5, { hz: E2 }))
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ kind: 'note', midi: 40 })
    expect(stab.current()).toBe(40)
  })

  it('does not re-emit while the same note is held', () => {
    const stab = createStabilizer()
    run(stab, frames(5, { hz: E2 }))
    expect(run(stab, frames(10, { hz: E2 }, 200))).toEqual([])
  })

  it('survives brief detector dropouts on a decaying note', () => {
    const stab = createStabilizer()
    run(stab, frames(5, { hz: E2 }))
    // two frames where MPM loses confidence, then it recovers
    stab.push({ tMs: 200, hz: 0, clarity: 0, rms: LOUD, halfHarmonicRatio: 0 })
    stab.push({ tMs: 221, hz: 0, clarity: 0, rms: LOUD, halfHarmonicRatio: 0 })
    expect(stab.current()).toBe(40)
  })

  it('releases the note after sustained silence', () => {
    const stab = createStabilizer()
    run(stab, frames(5, { hz: E2 }))
    const quiet = Array.from({ length: 12 }, (_, i) => ({
      tMs: 200 + i * HOP,
      hz: 0,
      clarity: 0,
      rms: 0.0001,
      halfHarmonicRatio: 0,
    }))
    const events = run(stab, quiet)
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('off')
    expect(stab.current()).toBeNull()
  })
})

describe('octave-error suppression', () => {
  it('halves a candidate when a partial sits between it and its octave', () => {
    // The laptop-mic case: the 82 Hz fundamental is filtered away, MPM
    // latches onto 164 Hz, but energy at 247 Hz (1.5 x 164) can only come
    // from a fundamental at 82.
    const stab = createStabilizer()
    const events = run(stab, frames(5, { hz: E2 * 2, halfHarmonicRatio: 0.6 }))
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ midi: 40 })
  })

  it('leaves a genuine note alone when no such partial exists', () => {
    const stab = createStabilizer()
    const events = run(stab, frames(5, { hz: E2 * 2, halfHarmonicRatio: 0.05 }))
    expect(events[0]).toMatchObject({ midi: 52 })
  })

  it('ignores low-confidence octave flicker against the held note', () => {
    const stab = createStabilizer()
    run(stab, frames(5, { hz: E2 }))
    const events = run(stab, frames(6, { hz: E2 * 2, clarity: 0.88 }, 200))
    expect(events).toEqual([])
    expect(stab.current()).toBe(40)
  })

  it('accepts a deliberate octave jump that reads clearly', () => {
    const stab = createStabilizer()
    run(stab, frames(5, { hz: E2 }))
    const events = run(stab, frames(6, { hz: E2 * 2, clarity: 0.97 }, 200))
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ midi: 52 })
  })
})

describe('re-attacking a string', () => {
  // Reported from real use: a wrong note, then the right one, and the right
  // one never registered. Two causes — attacks were being missed, and a held
  // note was only replaced by a DIFFERENT pitch, never re-triggered.
  const G2 = midiToHz(43)

  function attack(startMs: number, hz: number, count = 8, level = LOUD): DetectorFrame[] {
    return Array.from({ length: count }, (_, i) => ({
      tMs: startMs + i * HOP,
      hz,
      clarity: 0.95,
      // A pluck: the attack rises over a few frames, then decays.
      rms: i < 3 ? level * (0.5 + i * 0.35) : level * Math.exp(-(i - 3) * 0.12),
      halfHarmonicRatio: 0,
    }))
  }

  it('reports the corrected note played over one still ringing', () => {
    const stab = createStabilizer()
    // wrong note first
    const first = run(stab, attack(0, G2))
    expect(first.some((e) => e.kind === 'note' && e.midi === 43)).toBe(true)
    // the right note, plucked while the wrong one is still decaying
    const second = run(stab, attack(8 * HOP, E2))
    expect(second.some((e) => e.kind === 'note' && e.midi === 40)).toBe(true)
    expect(stab.current()).toBe(40)
  })

  it('reports the same note played twice as two notes', () => {
    // Playing the same note again is a new answer, not a non-event.
    const stab = createStabilizer()
    run(stab, attack(0, E2))
    expect(stab.current()).toBe(40)
    const again = run(stab, attack(8 * HOP, E2))
    expect(again.filter((e) => e.kind === 'note' && e.midi === 40)).toHaveLength(1)
  })

  it('does not invent attacks while a note sustains or decays', () => {
    const stab = createStabilizer()
    run(stab, frames(5, { hz: E2 }))
    // steady sustain, then a long decay: neither is a new attack
    const sustain = run(stab, frames(10, { hz: E2 }, 200))
    const decay = run(
      stab,
      Array.from({ length: 12 }, (_, i) => ({
        tMs: 420 + i * HOP,
        hz: E2,
        clarity: 0.95,
        rms: LOUD * Math.exp(-i * 0.15),
        halfHarmonicRatio: 0,
      })),
    )
    expect([...sustain, ...decay].filter((e) => e.kind === 'off')).toHaveLength(0)
  })
})
