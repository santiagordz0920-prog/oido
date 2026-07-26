import { Chord, Key, Note, Scale } from 'tonal'

// Thin wrapper over tonal (verified against tonal@6.4.3). Everything the app
// says about pitch is in scale degrees relative to a tonic — interval names
// never cross this module's boundary.

export type Voicing = {
  bass: string
  upper: string[]
}

// Tonic register: keep every scale between F3 and E5 so drills sit in a
// comfortable, consistent band across all 12 keys.
export function tonicOctave(tonic: string): number {
  const midi4 = Note.midi(`${tonic}4`)
  if (midi4 === null) throw new Error(`Bad tonic: ${tonic}`)
  return midi4 <= 64 ? 4 : 3
}

// Pitched note for a 1-based degree of the major scale (8 = tonic an octave up).
export function degreeNote(tonic: string, degree: number): string {
  const oct = tonicOctave(tonic)
  return Scale.degrees(`${tonic}${oct} major`)(degree)
}

export function scaleNotes(tonic: string): string[] {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((d) => degreeNote(tonic, d))
}

// Stable degrees resolve stepwise down to the tonic (Karpinski-style):
// 1 is already home, 3 walks 3–2–1, 5 walks 5–4–3–2–1.
export function resolutionDegrees(degree: number): number[] {
  if (degree <= 1) return [1]
  const path: number[] = []
  for (let d = degree; d >= 1; d--) path.push(d)
  return path
}

function triadNotes(symbol: string): string[] {
  const notes = Chord.get(symbol).notes
  if (notes.length < 3) throw new Error(`Bad chord symbol: ${symbol}`)
  return notes
}

// Close-position voicing candidates for a set of pitch classes, as midi-sorted
// note groups within G3..A5. Used to voice-lead the cadence.
function candidates(pcs: string[]): string[][] {
  const out: string[][] = []
  for (let rotation = 0; rotation < pcs.length; rotation++) {
    const rotated = [...pcs.slice(rotation), ...pcs.slice(0, rotation)]
    for (let baseOct = 3; baseOct <= 5; baseOct++) {
      const notes: string[] = []
      let prevMidi = -Infinity
      let oct = baseOct
      for (const pc of rotated) {
        let note = `${pc}${oct}`
        let midi = Note.midi(note)!
        while (midi <= prevMidi) {
          oct++
          note = `${pc}${oct}`
          midi = Note.midi(note)!
        }
        notes.push(note)
        prevMidi = midi
      }
      const midis = notes.map((n) => Note.midi(n)!)
      if (midis[0] >= 55 && midis[midis.length - 1] <= 81) out.push(notes)
    }
  }
  return out
}

function movement(from: string[], to: string[]): number {
  const a = from.map((n) => Note.midi(n)!)
  const b = to.map((n) => Note.midi(n)!)
  return a.reduce((sum, m, i) => sum + Math.abs(m - (b[i] ?? m)), 0)
}

function bassNote(root: string): string {
  for (let oct = 2; oct <= 3; oct++) {
    const midi = Note.midi(`${root}${oct}`)!
    if (midi >= 40 && midi <= 52) return `${root}${oct}`
  }
  return `${root}2`
}

// I–IV–V–I in the given major key, voice-led: the bass takes the roots, the
// upper three voices move as little as possible between chords. Real music
// does not play root-position blocks, and neither do we.
export function cadenceVoicings(tonic: string): Voicing[] {
  const key = Key.majorKey(tonic)
  const symbols = [key.triads[0], key.triads[3], key.triads[4], key.triads[0]]
  const voicings: Voicing[] = []
  let prev: string[] | null = null
  for (const symbol of symbols) {
    const pcs = triadNotes(symbol)
    const options = candidates(pcs)
    let best = options[0]
    if (prev) {
      let bestScore = Infinity
      for (const option of options) {
        const score = movement(prev, option)
        if (score < bestScore) {
          bestScore = score
          best = option
        }
      }
    } else {
      // First chord: prefer a voicing centered near C4–C5.
      let bestScore = Infinity
      for (const option of options) {
        const mid = option.map((n) => Note.midi(n)!).reduce((a, b) => a + b, 0) / option.length
        const score = Math.abs(mid - 65)
        if (score < bestScore) {
          bestScore = score
          best = option
        }
      }
    }
    prev = best
    const root = Chord.get(symbol).tonic ?? pcs[0]
    voicings.push({ bass: bassNote(root), upper: best })
  }
  return voicings
}
