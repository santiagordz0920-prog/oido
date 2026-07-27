import { describe, expect, it } from 'vitest'
import { chordSymbol, parseNumeral, progressionVoicings, resolutionDegrees } from './index'

describe('parseNumeral', () => {
  it('carries quality in the case, unlike tonal Progression', () => {
    expect(parseNumeral('C', 'ii')).toEqual({ root: 'D', quality: 'min' })
    expect(parseNumeral('C', 'vi')).toEqual({ root: 'A', quality: 'min' })
    expect(parseNumeral('C', 'IV')).toEqual({ root: 'F', quality: 'maj' })
  })

  it('handles accidentals and suffixes', () => {
    expect(parseNumeral('C', 'bVII')).toEqual({ root: 'Bb', quality: 'maj' })
    expect(parseNumeral('Eb', 'iv')).toEqual({ root: 'Ab', quality: 'min' })
    expect(parseNumeral('C', 'V7')).toEqual({ root: 'G', quality: 'dom7' })
    expect(parseNumeral('C', 'ii7')).toEqual({ root: 'D', quality: 'min7' })
    expect(parseNumeral('C', 'vii°')).toEqual({ root: 'B', quality: 'dim' })
    expect(parseNumeral('C', 'viiø7')).toEqual({ root: 'B', quality: 'm7b5' })
    expect(parseNumeral('C', 'Imaj7')).toEqual({ root: 'C', quality: 'maj7' })
  })

  it('parses secondary dominants as a fifth above the target root', () => {
    expect(parseNumeral('C', 'V/V')).toEqual({ root: 'D', quality: 'dom7' })
    expect(parseNumeral('C', 'V/vi')).toEqual({ root: 'E', quality: 'dom7' })
    expect(parseNumeral('A', 'V/ii')).toEqual({ root: 'F#', quality: 'dom7' })
  })

  it('rejects garbage', () => {
    expect(() => parseNumeral('C', 'H')).toThrow()
    expect(() => parseNumeral('C', 'ii/V')).toThrow()
  })
})

describe('progressionVoicings', () => {
  it('voices every chord with a bass and upper voices in range, all 12 keys', () => {
    for (const tonic of ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F']) {
      const voicings = progressionVoicings(tonic, ['I', 'V', 'vi', 'IV'])
      expect(voicings).toHaveLength(4)
      for (const v of voicings) {
        expect(v.upper.length).toBeGreaterThanOrEqual(3)
        expect(v.bass).toMatch(/[2-3]$/)
      }
    }
  })

  it('renders symbols the chord engine accepts', () => {
    expect(chordSymbol(parseNumeral('C', 'ii'))).toBe('Dm')
    expect(chordSymbol(parseNumeral('C', 'V7'))).toBe('G7')
  })
})

describe('resolutionDegrees', () => {
  it('resolves active degrees by tendency', () => {
    expect(resolutionDegrees(7)).toEqual([7, 8])
    expect(resolutionDegrees(4)).toEqual([4, 3])
    expect(resolutionDegrees(6)).toEqual([6, 5])
    expect(resolutionDegrees(2)).toEqual([2, 1])
  })
})

describe('chordCloseVoicing and scale forms', () => {
  it('voices all four triad qualities and inversions in ascending order', async () => {
    const { chordCloseVoicing, scaleFormNotes } = await import('./index')
    for (const quality of ['maj', 'min', 'dim', 'aug', 'dom7', 'maj7', 'min7', 'm7b5', 'dim7'] as const) {
      for (const inversion of [0, 1, 2]) {
        const notes = chordCloseVoicing({ root: 'Eb', quality }, inversion)
        expect(notes.length).toBeGreaterThanOrEqual(3)
      }
    }
    expect(scaleFormNotes('A', 'harmonic minor')[6]).toBe('G#4')
    expect(scaleFormNotes('A', 'natural minor')[6]).toBe('G4')
  })
})
