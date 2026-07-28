import { OPEN_STRING_MIDI, pitchClassOf } from '../audio/input/notes'

// Standard-tuning MIDI note for a given string (1..6, 6 = low E) and fret.
// Split out of components/Fretboard.tsx so that file can stay
// component-only (react-refresh/only-export-components) while F0/F1/F5
// items and the Fretboard component itself share this one calculation.
export function midiAt(stringNumber: number, fret: number): number {
  return OPEN_STRING_MIDI[6 - stringNumber] + fret
}

export const STRING_NUMBERS = [1, 2, 3, 4, 5, 6] as const

export type FretPosition = {
  string: number
  fret: number
  pitchClass: number
}

// Every position within reach that sounds one of the given pitch classes.
// This is what a practice-target overlay is: not one "correct" fingering but
// all the places the note lives, which is the whole point of Track F.
export function positionsFor(pitchClasses: number[], frets = 12): FretPosition[] {
  const wanted = new Set(pitchClasses.map((pc) => ((pc % 12) + 12) % 12))
  const out: FretPosition[] = []
  for (const string of STRING_NUMBERS) {
    for (let fret = 0; fret <= frets; fret++) {
      const pc = pitchClassOf(midiAt(string, fret))
      if (wanted.has(pc)) out.push({ string, fret, pitchClass: pc })
    }
  }
  return out
}
