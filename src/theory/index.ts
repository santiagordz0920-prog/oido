import { Chord, Key, Note, RomanNumeral, Scale } from 'tonal'

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

// Functional resolutions (Karpinski-style). Stable degrees walk down to the
// tonic; active degrees resolve by tendency: 2→1, 4→3, 6→5, 7→8. The number
// 8 is the tonic an octave up — display it as "1".
const RESOLUTIONS: Record<number, number[]> = {
  1: [1],
  2: [2, 1],
  3: [3, 2, 1],
  4: [4, 3],
  5: [5, 4, 3, 2, 1],
  6: [6, 5],
  7: [7, 8],
  8: [8],
}

export function resolutionDegrees(degree: number): number[] {
  const path = RESOLUTIONS[degree]
  if (!path) throw new Error(`No resolution path for degree ${degree}`)
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

// Voice-lead a sequence of chord symbols: the bass takes the roots, the
// upper voices move as little as possible between chords. Real music does
// not play root-position blocks, and neither do we.
export function voiceLead(symbols: string[]): Voicing[] {
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

// I–IV–V–I in the given major key.
export function cadenceVoicings(tonic: string): Voicing[] {
  const key = Key.majorKey(tonic)
  return voiceLead([key.triads[0], key.triads[3], key.triads[4], key.triads[0]])
}

// ---------------------------------------------------------------------------
// Roman numerals → chords. tonal's Progression.fromRomanNumerals drops chord
// quality (ii → D, not Dm) and cannot parse secondary dominants, so numeral
// parsing lives here; only the interval lookup comes from tonal.
// ---------------------------------------------------------------------------

const QUALITY_TO_TONAL = {
  maj: 'M',
  min: 'm',
  dim: 'dim',
  aug: 'aug',
  dom7: '7',
  maj7: 'maj7',
  min7: 'm7',
  m7b5: 'm7b5',
  dim7: 'dim7',
} as const

export type ChordQuality = keyof typeof QUALITY_TO_TONAL

export type ChordSpec = {
  root: string // pitch class
  quality: ChordQuality
}

const NUMERAL_RE = /^(b{0,2}|#{0,2})([ivIV]+)(°7|ø7|°|\+|maj7|7)?$/

// Parse one Roman numeral relative to a major-key tonic. Case carries the
// third (ii → minor), the suffix carries the rest (°, ø7, +, 7, maj7).
// Secondary dominants are V/x — a dominant chord rooted a perfect fifth
// above x's root.
export function parseNumeral(tonic: string, numeral: string): ChordSpec {
  const slash = numeral.indexOf('/')
  if (slash > 0) {
    const target = parseNumeral(tonic, numeral.slice(slash + 1))
    const head = numeral.slice(0, slash)
    if (head !== 'V' && head !== 'V7') throw new Error(`Unsupported secondary numeral: ${numeral}`)
    return { root: Note.pitchClass(Note.transpose(target.root, '5P')), quality: 'dom7' }
  }
  const m = NUMERAL_RE.exec(numeral)
  if (!m) throw new Error(`Bad Roman numeral: ${numeral}`)
  const [, accidental, core, suffix] = m
  const interval = RomanNumeral.get(accidental + core.toUpperCase()).interval
  if (!interval) throw new Error(`Bad Roman numeral: ${numeral}`)
  const root = Note.pitchClass(Note.transpose(tonic, interval))
  const minor = core === core.toLowerCase()
  let quality: ChordSpec['quality']
  if (suffix === '°') quality = 'dim'
  else if (suffix === '°7') quality = 'dim7'
  else if (suffix === 'ø7') quality = 'm7b5'
  else if (suffix === '+') quality = 'aug'
  else if (suffix === 'maj7') quality = 'maj7'
  else if (suffix === '7') quality = minor ? 'min7' : 'dom7'
  else quality = minor ? 'min' : 'maj'
  return { root, quality }
}

export function chordSymbol(spec: ChordSpec): string {
  return `${spec.root}${QUALITY_TO_TONAL[spec.quality]}`
}

// Voice-led voicings for a Roman-numeral progression in a major key.
// This is the primitive behind E6–E8 drills, checkpoints, and later the
// Play-Along engine: everything renders from the same numeral data.
export function progressionVoicings(tonic: string, numerals: string[]): Voicing[] {
  return voiceLead(numerals.map((n) => chordSymbol(parseNumeral(tonic, n))))
}
