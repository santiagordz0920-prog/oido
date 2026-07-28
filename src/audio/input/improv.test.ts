import { describe, expect, it } from 'vitest'
import { Note } from 'tonal'
import {
  createClockBridge,
  DETECTION_LATENCY_MS,
  degreeInChord,
  gradeImprov,
  gradeTargets,
  guideToneDegrees,
  type BarWindow,
  type PlayedNote,
} from './improv'

const BAR_MS = 2000 // 4 beats at 120 bpm
const BEAT_MS = BAR_MS / 4

// A two-chord vamp in C: one bar of I, one of vi, repeating.
function vamp(numerals: string[], startMs = 10_000): BarWindow[] {
  return numerals.map((numeral, i) => ({
    barIndex: i,
    chordIndex: i,
    numeral,
    atMs: startMs + i * BAR_MS,
    barMs: BAR_MS,
  }))
}

// Notes arrive from the detector already late by DETECTION_LATENCY_MS, so
// tests describe when the string was actually struck and add the lag, the
// way the real signal path does.
function played(name: string, atMs: number): PlayedNote {
  return { midi: Note.midi(name)!, atMs: atMs + DETECTION_LATENCY_MS }
}

describe('degreeInChord', () => {
  it('names a note by the chord it is played over, not the key', () => {
    expect(degreeInChord('C', 'I', Note.midi('E4')!)).toBe(3)
    expect(degreeInChord('C', 'vi', Note.midi('E4')!)).toBe(5)
    expect(degreeInChord('C', 'V', Note.midi('B4')!)).toBe(3)
  })

  it('returns null for a note outside the chord', () => {
    expect(degreeInChord('C', 'I', Note.midi('D4')!)).toBeNull()
  })

  // The bug this exists to avoid: a fixed major-third offset would call
  // C♯ the 3rd of A minor, which is neither in the chord nor in the key.
  it('takes the third from the chord quality, not from a fixed offset', () => {
    expect(degreeInChord('C', 'vi', Note.midi('C4')!)).toBe(3)
    expect(degreeInChord('C', 'vi', Note.midi('C#4')!)).toBeNull()
  })
})

describe('guideToneDegrees', () => {
  it('is the 3rd and the 7th where both exist', () => {
    expect(guideToneDegrees('C', 'V7')).toEqual([3, 7])
  })

  // A triad's 3rd carries the quality alone. Falling back to the root would
  // quietly turn a guide-tone drill into a root drill.
  it('is the 3rd alone on a triad, never the root', () => {
    expect(guideToneDegrees('C', 'I')).toEqual([3])
    expect(guideToneDegrees('C', 'vi')).toEqual([3])
  })
})

describe('createClockBridge', () => {
  it('takes its offset from the first note and holds it', () => {
    let now = 5000
    const bridge = createClockBridge(() => now)
    expect(bridge.offsetMs()).toBeNull()
    expect(bridge.wallMsFor(1000)).toBe(5000)
    now = 9999 // the clock moves on; the offset must not
    expect(bridge.wallMsFor(2000)).toBe(6000)
    expect(bridge.offsetMs()).toBe(4000)
  })

  it('re-anchors after a reset', () => {
    let now = 5000
    const bridge = createClockBridge(() => now)
    bridge.wallMsFor(1000)
    bridge.reset()
    now = 8000
    expect(bridge.wallMsFor(1000)).toBe(8000)
  })
})

describe('gradeTargets (P3)', () => {
  const bars = vamp(['I', 'vi', 'I', 'vi'])

  it('passes when the named chord tone lands on every downbeat', () => {
    // The 3rd of I is E, the 3rd of vi is C.
    const notes = [
      played('E4', bars[0].atMs),
      played('C4', bars[1].atMs),
      played('E4', bars[2].atMs),
      played('C4', bars[3].atMs),
    ]
    const v = gradeTargets('C', bars, notes, 3)
    expect(v.hits).toBe(4)
    expect(v.correct).toBe(true)
  })

  // Without the latency correction every one of these would read as late
  // and the drill would fail playing that was in fact on the beat.
  it('corrects for the detector being systematically late', () => {
    const notes = [played('E4', bars[0].atMs)]
    const v = gradeTargets('C', [bars[0]], notes, 3)
    expect(v.bars[0].hit).toBe(true)
    expect(v.bars[0].offsetMs).toBeCloseTo(0, 5)
  })

  it('allows a note slightly early or slightly late', () => {
    const early = gradeTargets('C', [bars[0]], [played('E4', bars[0].atMs - 0.4 * BEAT_MS)], 3)
    const late = gradeTargets('C', [bars[0]], [played('E4', bars[0].atMs + 0.4 * BEAT_MS)], 3)
    expect(early.bars[0].hit).toBe(true)
    expect(late.bars[0].hit).toBe(true)
  })

  it('rejects a note that misses the window entirely', () => {
    const v = gradeTargets('C', [bars[0]], [played('E4', bars[0].atMs + 1.5 * BEAT_MS)], 3)
    expect(v.bars[0].hit).toBe(false)
    expect(v.bars[0].played).toBeNull()
  })

  // The drill grades the landing, not the improvisation around it.
  it('does not penalise notes played between the downbeats', () => {
    const notes = [
      played('E4', bars[0].atMs),
      played('F4', bars[0].atMs + 1.5 * BEAT_MS),
      played('G4', bars[0].atMs + 2.5 * BEAT_MS),
      played('C4', bars[1].atMs),
    ]
    const v = gradeTargets('C', bars.slice(0, 2), notes, 3)
    expect(v.hits).toBe(2)
    expect(v.correct).toBe(true)
  })

  it('says what landed instead when the target is missed', () => {
    const v = gradeTargets('C', [bars[0]], [played('G4', bars[0].atMs)], 3)
    expect(v.bars[0].hit).toBe(false)
    expect(v.bars[0].played).toBe(5)
  })

  it('needs most of the bars, not all of them', () => {
    const notes = [played('E4', bars[0].atMs), played('C4', bars[1].atMs), played('E4', bars[2].atMs)]
    const v = gradeTargets('C', bars, notes, 3)
    expect(v.hits).toBe(3)
    expect(v.correct).toBe(true) // 3/4 clears the 0.75 bar
  })

  it('fails a run with nothing played at all', () => {
    const v = gradeTargets('C', bars, [], 3)
    expect(v.correct).toBe(false)
    expect(v.hits).toBe(0)
  })
})

describe('gradeImprov (P4)', () => {
  const bars = vamp(['I', 'V7', 'I', 'V7'])

  function notesAcross(spec: Array<[string, number]>): PlayedNote[] {
    return spec.map(([name, ms]) => played(name, ms))
  }

  // Guide tones: the 3rd of I is E, the 3rd and 7th of V7 are B and F.
  const eightGuideTones = (): PlayedNote[] =>
    notesAcross([
      ['E4', bars[0].atMs + 100],
      ['E5', bars[0].atMs + 900],
      ['B4', bars[1].atMs + 100],
      ['F4', bars[1].atMs + 900],
      ['E4', bars[2].atMs + 100],
      ['E5', bars[2].atMs + 900],
      ['B4', bars[3].atMs + 100],
      ['F4', bars[3].atMs + 900],
    ])

  it('passes guide-tones-only when every note is a guide tone', () => {
    const v = gradeImprov('C', bars, eightGuideTones(), 'guide')
    expect(v.accuracy).toBe(1)
    expect(v.correct).toBe(true)
  })

  it('fails guide-tones-only on chord tones that are not guide tones', () => {
    const notes = eightGuideTones()
    notes[0] = played('C4', bars[0].atMs + 100) // the root of I
    notes[1] = played('G4', bars[0].atMs + 900) // the 5th of I
    const v = gradeImprov('C', bars, notes, 'guide')
    expect(v.correct).toBe(false)
    expect(v.notes[0].reason).toBe('chord-tone')
  })

  it('attributes each note to the chord it was played over', () => {
    const v = gradeImprov('C', bars, eightGuideTones(), 'guide')
    expect(v.notes.map((n) => n.numeral)).toEqual(['I', 'I', 'V7', 'V7', 'I', 'I', 'V7', 'V7'])
  })

  it('ignores notes played outside the run', () => {
    const notes = [...eightGuideTones(), played('E4', bars[3].atMs + BAR_MS * 3)]
    const v = gradeImprov('C', bars, notes, 'guide')
    expect(v.notes.at(-1)!.reason).toBe('unattributed')
    expect(v.accuracy).toBe(1)
  })

  describe('approach tones', () => {
    // An approach note earns its place by resolving, not by sitting near a
    // guide tone: the same note without the resolution has to fail.
    it('accepts a note that steps into a guide tone', () => {
      const notes = notesAcross([
        ['D#4', bars[0].atMs + 100],
        ['E4', bars[0].atMs + 300],
        ['E5', bars[0].atMs + 900],
        ['A#4', bars[1].atMs + 100],
        ['B4', bars[1].atMs + 300],
        ['F4', bars[1].atMs + 900],
        ['E4', bars[2].atMs + 100],
        ['E5', bars[2].atMs + 900],
        ['B4', bars[3].atMs + 100],
        ['F4', bars[3].atMs + 900],
      ])
      const v = gradeImprov('C', bars, notes, 'approach')
      expect(v.notes[0].reason).toBe('approach')
      expect(v.correct).toBe(true)
    })

    it('rejects the same note when it never resolves', () => {
      const notes = notesAcross([
        ['D#4', bars[0].atMs + 100],
        ['G4', bars[0].atMs + 300],
        ['E5', bars[0].atMs + 900],
        ['B4', bars[1].atMs + 100],
        ['F4', bars[1].atMs + 900],
        ['E4', bars[2].atMs + 100],
        ['E5', bars[2].atMs + 900],
        ['B4', bars[3].atMs + 100],
        ['F4', bars[3].atMs + 900],
      ])
      const v = gradeImprov('C', bars, notes, 'approach')
      expect(v.notes[0].ok).toBe(false)
    })

    it('rejects a leap into a guide tone, which is not an approach', () => {
      const notes = notesAcross([
        ['A3', bars[0].atMs + 100],
        ['E4', bars[0].atMs + 300],
        ['E5', bars[0].atMs + 900],
        ['B4', bars[1].atMs + 100],
        ['F4', bars[1].atMs + 900],
        ['E4', bars[2].atMs + 100],
        ['E5', bars[2].atMs + 900],
        ['B4', bars[3].atMs + 100],
        ['F4', bars[3].atMs + 900],
      ])
      const v = gradeImprov('C', bars, notes, 'approach')
      expect(v.notes[0].ok).toBe(false)
    })
  })

  describe('open', () => {
    it('allows any note, but requires every chord to get a guide tone', () => {
      const notes = notesAcross([
        ['D4', bars[0].atMs + 100],
        ['E4', bars[0].atMs + 300],
        ['F#4', bars[0].atMs + 600],
        ['G4', bars[0].atMs + 900],
        ['A4', bars[1].atMs + 100],
        ['B4', bars[1].atMs + 300],
        ['C5', bars[1].atMs + 600],
        ['D5', bars[1].atMs + 900],
      ])
      const v = gradeImprov('C', bars.slice(0, 2), notes, 'open')
      expect(v.accuracy).toBe(1)
      expect(v.chordsMissed).toEqual([])
      expect(v.correct).toBe(true)
    })

    it('fails when a chord goes by without a guide tone', () => {
      const notes = notesAcross([
        ['D4', bars[0].atMs + 100],
        ['E4', bars[0].atMs + 300],
        ['F#4', bars[0].atMs + 600],
        ['G4', bars[0].atMs + 900],
        ['A4', bars[1].atMs + 100],
        ['C5', bars[1].atMs + 300],
        ['D5', bars[1].atMs + 600],
        ['G5', bars[1].atMs + 900],
      ])
      const v = gradeImprov('C', bars.slice(0, 2), notes, 'open')
      expect(v.chordsMissed).toEqual([1])
      expect(v.correct).toBe(false)
    })
  })

  it('will not pass a run that barely happened', () => {
    const notes = notesAcross([
      ['E4', bars[0].atMs + 100],
      ['B4', bars[1].atMs + 100],
    ])
    const v = gradeImprov('C', bars, notes, 'guide')
    expect(v.accuracy).toBe(1)
    expect(v.correct).toBe(false) // under the minimum note count
  })
})
