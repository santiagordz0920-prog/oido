import { OPEN_STRING_MIDI } from '../audio/input/notes'

// Standard-tuning MIDI note for a given string (1..6, 6 = low E) and fret.
// Split out of components/Fretboard.tsx so that file can stay
// component-only (react-refresh/only-export-components) while F0/F1/F5
// items and the Fretboard component itself share this one calculation.
export function midiAt(stringNumber: number, fret: number): number {
  return OPEN_STRING_MIDI[6 - stringNumber] + fret
}
