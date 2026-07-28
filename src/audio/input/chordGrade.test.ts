import { describe, expect, it } from 'vitest'
import { Note } from 'tonal'
import { filterNotes, gradeChord, gradeNumeral, type DetectedNote } from './chordGrade'
import type { ChordSpec } from '../../theory'

// Build detected notes from note names, the way Basic Pitch would report a
// held chord: all sounding, all about as loud, all long enough to count.
function heard(names: string[], overrides: Partial<DetectedNote> = {}): DetectedNote[] {
  return names.map((name) => ({
    midi: Note.midi(name)!,
    startSeconds: 0.1,
    durationSeconds: 0.9,
    amplitude: 0.8,
    ...overrides,
  }))
}

const C: ChordSpec = { root: 'C', quality: 'maj' }
const Cm: ChordSpec = { root: 'C', quality: 'min' }
const G7: ChordSpec = { root: 'G', quality: 'dom7' }

describe('gradeChord', () => {
  it('passes the chord that was asked for', () => {
    const v = gradeChord(C, heard(['C4', 'E4', 'G4']))
    expect(v.correct).toBe(true)
    expect(v.diagnosis).toEqual({ kind: 'match' })
    expect(v.missing).toEqual([])
    expect(v.extra).toEqual([])
  })

  // Octave doubling is what a guitar does: six strings, three notes.
  it('does not care how many octaves each note arrives in', () => {
    const v = gradeChord(C, heard(['C3', 'G3', 'C4', 'E4', 'G4', 'E5']))
    expect(v.correct).toBe(true)
  })

  it('passes a seventh chord', () => {
    expect(gradeChord(G7, heard(['G3', 'B3', 'D4', 'F4'])).correct).toBe(true)
  })

  it('reports nothing heard rather than guessing', () => {
    const v = gradeChord(C, [])
    expect(v.correct).toBe(false)
    expect(v.diagnosis).toEqual({ kind: 'silence' })
  })
})

describe('inversions', () => {
  it('passes when the named degree is underneath', () => {
    const v = gradeChord(C, heard(['E3', 'G3', 'C4']), { expectedBass: 3 })
    expect(v.correct).toBe(true)
    expect(v.bass).toEqual({ expected: 3, played: 3 })
  })

  // The whole subject of F2: the right notes in the wrong order is a
  // different chord to the ear, and the drill has to say so.
  it('fails the right notes with the wrong note underneath, and names both', () => {
    const v = gradeChord(C, heard(['C3', 'E3', 'G3']), { expectedBass: 5 })
    expect(v.correct).toBe(false)
    expect(v.diagnosis).toEqual({ kind: 'inversion', expectedBass: 5, playedBass: 1 })
  })

  it('ignores the bass entirely when the drill does not name one', () => {
    const v = gradeChord(C, heard(['G3', 'C4', 'E4']))
    expect(v.correct).toBe(true)
    expect(v.bass).toBeNull()
  })
})

describe('the likely confusions', () => {
  // The example diagnosis from docs/architecture.md §12.2.
  it('names an added seventh on a triad', () => {
    const v = gradeChord(C, heard(['C4', 'E4', 'G4', 'Bb4']))
    expect(v.correct).toBe(false)
    expect(v.diagnosis).toEqual({ kind: 'seventh-added', semitones: 10 })
    expect(v.extra).toEqual([10])
  })

  it('names a major seventh added to a triad too', () => {
    expect(gradeChord(C, heard(['C4', 'E4', 'G4', 'B4'])).diagnosis).toEqual({
      kind: 'seventh-added',
      semitones: 11,
    })
  })

  it('names a suspension when the 3rd is replaced', () => {
    expect(gradeChord(C, heard(['C4', 'D4', 'G4'])).diagnosis).toEqual({ kind: 'suspended', replacedBy: 2 })
    expect(gradeChord(C, heard(['C4', 'F4', 'G4'])).diagnosis).toEqual({ kind: 'suspended', replacedBy: 4 })
  })

  // sus against add9: an add9 keeps its 3rd, so it is an extra note rather
  // than a substitution, and must not be reported as a suspension.
  it('tells add9 apart from sus2', () => {
    const v = gradeChord(C, heard(['C4', 'D4', 'E4', 'G4']))
    expect(v.diagnosis.kind).not.toBe('suspended')
    expect(v.diagnosis).toEqual({ kind: 'extra', semitones: [2] })
  })

  it('names the relative minor', () => {
    expect(gradeChord(C, heard(['A3', 'C4', 'E4'])).diagnosis).toEqual({ kind: 'relative' })
  })

  it('names the relative major', () => {
    expect(gradeChord(Cm, heard(['Eb4', 'G4', 'Bb4'])).diagnosis).toEqual({ kind: 'relative' })
  })

  it('names a different quality on the same root', () => {
    expect(gradeChord(C, heard(['C4', 'Eb4', 'G4'])).diagnosis).toEqual({ kind: 'quality', played: 'min' })
    expect(gradeChord(Cm, heard(['C4', 'E4', 'G4'])).diagnosis).toEqual({ kind: 'quality', played: 'maj' })
    expect(gradeChord(C, heard(['C4', 'E4', 'G#4'])).diagnosis).toEqual({ kind: 'quality', played: 'aug' })
  })

  it('says which degree never arrived', () => {
    const v = gradeChord(C, heard(['C4', 'G4']))
    expect(v.diagnosis).toEqual({ kind: 'incomplete', missing: [3] })
    expect(v.missing).toEqual([3])
  })

  it('reports a stray note as an extra degree above the root', () => {
    const v = gradeChord(C, heard(['C4', 'E4', 'G4', 'F#4']))
    expect(v.diagnosis).toEqual({ kind: 'extra', semitones: [6] })
  })
})

describe('filtering what a strummed acoustic actually sends', () => {
  // The failure this guards: a string ringing sympathetically at a fraction
  // of the strum's level would otherwise be graded as a wrong note and fail
  // correct playing.
  it('drops notes far quieter than the chord', () => {
    const notes = [...heard(['C4', 'E4', 'G4']), ...heard(['F#4'], { amplitude: 0.1 })]
    expect(gradeChord(C, notes).correct).toBe(true)
  })

  it('drops transients too short to be chord tones', () => {
    const notes = [...heard(['C4', 'E4', 'G4']), ...heard(['F#4'], { durationSeconds: 0.02 })]
    expect(gradeChord(C, notes).correct).toBe(true)
  })

  it('keeps a genuinely sounding wrong note', () => {
    const notes = [...heard(['C4', 'E4', 'G4']), ...heard(['F#4'], { amplitude: 0.7 })]
    expect(gradeChord(C, notes).correct).toBe(false)
  })

  it('returns nothing when everything is silent', () => {
    expect(filterNotes(heard(['C4'], { amplitude: 0 }))).toEqual([])
  })

  // The filter is relative to the loudest note, so a chord played quietly
  // grades exactly like the same chord played hard.
  it('grades a quiet chord the same as a loud one', () => {
    expect(gradeChord(C, heard(['C4', 'E4', 'G4'], { amplitude: 0.05 })).correct).toBe(true)
  })
})

describe('gradeNumeral', () => {
  it('grades against a Roman numeral in a key', () => {
    expect(gradeNumeral('C', 'V', heard(['G3', 'B3', 'D4'])).correct).toBe(true)
    expect(gradeNumeral('C', 'ii', heard(['D4', 'F4', 'A4'])).correct).toBe(true)
    expect(gradeNumeral('Eb', 'IV', heard(['Ab3', 'C4', 'Eb4'])).correct).toBe(true)
  })

  // Spelling must never reach the comparison: the mic reports pitch, and
  // A♭ and G♯ are the same pitch.
  it('does not care how the played notes are spelled', () => {
    expect(gradeNumeral('Eb', 'IV', heard(['G#3', 'C4', 'D#4'])).correct).toBe(true)
  })
})
