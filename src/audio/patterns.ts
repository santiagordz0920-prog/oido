// Backing-track patterns for the Play-Along Engine (docs/curriculum.md §9.3).
//
// Everything here is pure: a feel maps to a list of hits expressed in beats
// from the top of a 4/4 bar, and the engine turns those into Transport
// events. Keeping it separate is what makes the feels testable without an
// AudioContext — a swung eighth landing at 2/3 of a beat is arithmetic, not
// something to verify by ear alone.

export type Feel = 'straight' | 'swing' | 'ballad'

export const FEELS: Feel[] = ['straight', 'swing', 'ballad']
export const BEATS_PER_BAR = 4

// Swing pushes the second eighth of each beat into a 2:1 triplet ratio, so
// the "and" lands at 2/3 rather than 1/2. Quarters and downbeats never move,
// and a straight or ballad feel leaves everything where it is.
export function swingBeat(beat: number, feel: Feel): number {
  if (feel !== 'swing') return beat
  const whole = Math.floor(beat)
  const frac = beat - whole
  return Math.abs(frac - 0.5) < 1e-9 ? whole + 2 / 3 : beat
}

export type Hit = {
  beat: number // 0..BEATS_PER_BAR, before swing is applied
  velocity: number
}

// Which chord tone the bass takes. 'approach' is the semitone below the NEXT
// bar's root — the one note in the backing track that looks ahead, and the
// reason a walking line pulls toward the change instead of sitting still.
export type BassTone = 'root' | 'third' | 'fifth' | 'octave' | 'approach'

export type BassHit = Hit & { tone: BassTone }

export type DrumPiece = 'kick' | 'snare' | 'hat'

export type DrumHit = Hit & { piece: DrumPiece }

// Root and fifth on the strong beats for straight time; a walking quarter
// line for swing, which is what makes changes audible without the comp; a
// single held root for a ballad, where the point is space.
const BASS: Record<Feel, BassHit[]> = {
  straight: [
    { beat: 0, velocity: 0.9, tone: 'root' },
    { beat: 2, velocity: 0.75, tone: 'fifth' },
  ],
  swing: [
    { beat: 0, velocity: 0.9, tone: 'root' },
    { beat: 1, velocity: 0.7, tone: 'third' },
    { beat: 2, velocity: 0.78, tone: 'fifth' },
    { beat: 3, velocity: 0.72, tone: 'approach' },
  ],
  ballad: [{ beat: 0, velocity: 0.85, tone: 'root' }],
}

// The comp deliberately avoids beat 1 in the straight feel after the first
// stab: a chord landing squarely on every downbeat buries the bass and makes
// the harmonic rhythm harder to hear, not easier.
const COMP: Record<Feel, Hit[]> = {
  straight: [
    { beat: 0, velocity: 0.55 },
    { beat: 1.5, velocity: 0.45 },
    { beat: 2.5, velocity: 0.5 },
  ],
  // The Charleston: downbeat and the "and" of 2, swung.
  swing: [
    { beat: 0, velocity: 0.5 },
    { beat: 1.5, velocity: 0.45 },
  ],
  ballad: [{ beat: 0, velocity: 0.45 }],
}

const DRUMS: Record<Feel, DrumHit[]> = {
  straight: [
    { beat: 0, velocity: 0.9, piece: 'kick' },
    { beat: 1, velocity: 0.8, piece: 'snare' },
    { beat: 2, velocity: 0.7, piece: 'kick' },
    { beat: 2.5, velocity: 0.5, piece: 'kick' },
    { beat: 3, velocity: 0.8, piece: 'snare' },
    ...[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((beat) => ({
      beat,
      velocity: beat % 1 === 0 ? 0.35 : 0.22,
      piece: 'hat' as const,
    })),
  ],
  swing: [
    { beat: 0, velocity: 0.6, piece: 'kick' },
    { beat: 1, velocity: 0.6, piece: 'snare' },
    { beat: 3, velocity: 0.6, piece: 'snare' },
    // Ride pattern: quarters with the swung "and" of 2 and 4.
    ...[0, 1, 1.5, 2, 3, 3.5].map((beat) => ({
      beat,
      velocity: beat % 1 === 0 ? 0.38 : 0.24,
      piece: 'hat' as const,
    })),
  ],
  ballad: [
    { beat: 0, velocity: 0.7, piece: 'kick' },
    { beat: 2, velocity: 0.6, piece: 'snare' },
    ...[0, 1, 2, 3].map((beat) => ({ beat, velocity: 0.2, piece: 'hat' as const })),
  ],
}

export function bassPattern(feel: Feel): BassHit[] {
  return BASS[feel]
}

export function compPattern(feel: Feel): Hit[] {
  return COMP[feel]
}

export function drumPattern(feel: Feel): DrumHit[] {
  return DRUMS[feel]
}

export type PlanBar = {
  barIndex: number // absolute position in the loop
  chordIndex: number // index into the numerals array
  numeral: string
  nextNumeral: string // wraps at the end of the loop, because it loops
}

// One bar per chord by default; barsPerChord stretches each chord over
// several bars, which is what a vamp needs (docs/curriculum.md §8 P3).
// The plan wraps, so the last bar's "next" is the first chord: a looping
// progression really does resolve back to its own opening.
export function barPlan(numerals: string[], barsPerChord = 1): PlanBar[] {
  if (numerals.length === 0) throw new Error('barPlan needs at least one numeral')
  if (barsPerChord < 1) throw new Error('barsPerChord must be at least 1')
  const bars: PlanBar[] = []
  for (const [chordIndex, numeral] of numerals.entries()) {
    for (let b = 0; b < barsPerChord; b++) {
      bars.push({
        barIndex: bars.length,
        chordIndex,
        numeral,
        nextNumeral: numerals[(chordIndex + 1) % numerals.length],
      })
    }
  }
  return bars
}

export function secondsPerBeat(bpm: number): number {
  return 60 / bpm
}

export function barSeconds(bpm: number): number {
  return secondsPerBeat(bpm) * BEATS_PER_BAR
}
