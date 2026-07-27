import { Note } from 'tonal'

// Frequency ↔ pitch conversions for the input path. Everything downstream
// works in MIDI numbers and cents, never raw Hz, so detector jitter is
// expressed in a musically meaningful unit.

export const A4_HZ = 440

export function hzToMidiFloat(hz: number): number {
  return 69 + 12 * Math.log2(hz / A4_HZ)
}

export function midiToHz(midi: number): number {
  return A4_HZ * 2 ** ((midi - 69) / 12)
}

// Cents from a to b, signed. One semitone is 100 cents.
export function centsBetween(aHz: number, bHz: number): number {
  return 1200 * Math.log2(bHz / aHz)
}

export type PitchReading = {
  midi: number // nearest integer MIDI note
  cents: number // deviation from that note, -50..+50
  hz: number
}

export function readingFromHz(hz: number): PitchReading {
  const exact = hzToMidiFloat(hz)
  const midi = Math.round(exact)
  return { midi, cents: (exact - midi) * 100, hz }
}

// Display name, e.g. "E2". Accidentals are printed with real glyphs by
// displayNote in src/theory/keys.ts where they reach the UI.
export function noteNameOf(midi: number): string {
  return Note.fromMidi(midi)
}

export function pitchClassOf(midi: number): number {
  return ((midi % 12) + 12) % 12
}

// Scale degree of a sounding note relative to a tonic pitch class, as a
// 1-based diatonic degree when the note is in the major scale, or null when
// it is chromatic. Answers stay functional: degrees, never intervals.
const MAJOR_SEMITONE_TO_DEGREE: Record<number, number> = {
  0: 1,
  2: 2,
  4: 3,
  5: 4,
  7: 5,
  9: 6,
  11: 7,
}

export function degreeOf(midi: number, tonicPitchClass: number): number | null {
  const semitones = (pitchClassOf(midi) - tonicPitchClass + 12) % 12
  return MAJOR_SEMITONE_TO_DEGREE[semitones] ?? null
}

export function tonicPitchClassOf(tonic: string): number {
  const midi = Note.midi(`${tonic}4`)
  if (midi === null) throw new Error(`Bad tonic: ${tonic}`)
  return pitchClassOf(midi)
}

// Standard tuning, low to high. The acoustic's open low E is the hardest
// case for a laptop mic and is what calibration confirms against.
export const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64] as const
export const LOW_E_HZ = midiToHz(40) // 82.41
