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

// The three minor forms plus parallel major, for E4/T5. tonal names natural
// minor plainly "minor".
export type ScaleForm = 'major' | 'natural minor' | 'harmonic minor' | 'melodic minor'

const TONAL_SCALE_NAME: Record<ScaleForm, string> = {
  major: 'major',
  'natural minor': 'minor',
  'harmonic minor': 'harmonic minor',
  'melodic minor': 'melodic minor',
}

export function scaleFormNotes(tonic: string, form: ScaleForm): string[] {
  const oct = tonicOctave(tonic)
  const degrees = Scale.degrees(`${tonic}${oct} ${TONAL_SCALE_NAME[form]}`)
  return [1, 2, 3, 4, 5, 6, 7, 8].map((d) => degrees(d))
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

// The bass register, E2..E3: low enough to sit under any voicing, high
// enough that a laptop speaker still reproduces it. Exported because the
// Play-Along Engine's bass part needs the same register the drill voicings
// use, so a vamp and a drill stimulus sound like the same instrument.
export function bassNote(root: string): string {
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

// The same chord written the way a chart writes it: a bare letter for major,
// and the conventional glyphs for the rest. chordSymbol's spelling is what
// tonal parses, which is not what a player reads — "CM" is not a chord
// anyone writes.
const QUALITY_DISPLAY: Record<ChordQuality, string> = {
  maj: '',
  min: 'm',
  dim: '°',
  aug: '+',
  dom7: '7',
  maj7: 'maj7',
  min7: 'm7',
  m7b5: 'ø7',
  dim7: '°7',
}

export function chordDisplaySymbol(spec: ChordSpec): string {
  return `${spec.root}${QUALITY_DISPLAY[spec.quality]}`
}

// Voice-led voicings for a Roman-numeral progression in a major key.
// This is the primitive behind E6–E8 drills, checkpoints, and later the
// Play-Along engine: everything renders from the same numeral data.
export function progressionVoicings(tonic: string, numerals: string[]): Voicing[] {
  return voiceLead(numerals.map((n) => chordSymbol(parseNumeral(tonic, n))))
}

// ---------------------------------------------------------------------------
// Chord tones by chord degree. A chord's own 1, 3, 5 and 7 — not scale
// degrees of the key — which is what Track F shapes and Track P targets are
// named by ("land the 3rd of the chord on beat 1"). Interval names still
// never cross this boundary: the answer is a number.
// ---------------------------------------------------------------------------

export type ChordDegree = 1 | 3 | 5 | 7

export const CHORD_DEGREES: ChordDegree[] = [1, 3, 5, 7]

// Guide tones are the 3rd and the 7th: the two notes that carry a chord's
// quality and its motion (docs/curriculum.md T11, F6). On a triad, which has
// no 7th, the 3rd carries it alone.
export const GUIDE_TONE_DEGREES: ChordDegree[] = [3, 7]

export function chordPitchClasses(spec: ChordSpec): string[] {
  const notes = Chord.get(chordSymbol(spec)).notes
  if (notes.length < 3) throw new Error(`Unvoiceable chord: ${chordSymbol(spec)}`)
  return notes
}

// The pitch class of one chord degree, or null when the chord does not have
// that degree — asking a triad for its 7th is a question with no answer, and
// returning the root instead would be a lie the drills would grade against.
export function chordDegreePitchClass(spec: ChordSpec, degree: ChordDegree): string | null {
  const notes = chordPitchClasses(spec)
  const index = degree === 1 ? 0 : degree === 3 ? 1 : degree === 5 ? 2 : 3
  return notes[index] ?? null
}

// Semitones above the chord root for each of its degrees, which is how the
// input path compares what was heard against what was asked for: detection
// yields pitch classes, and pitch classes have no spelling.
export function chordDegreeSemitones(spec: ChordSpec): Map<number, ChordDegree> {
  const root = Note.midi(`${spec.root}4`)
  if (root === null) throw new Error(`Bad chord root: ${spec.root}`)
  const map = new Map<number, ChordDegree>()
  for (const degree of CHORD_DEGREES) {
    const pc = chordDegreePitchClass(spec, degree)
    if (pc === null) continue
    const midi = Note.midi(`${pc}4`)
    if (midi === null) continue
    map.set(((midi - root) % 12 + 12) % 12, degree)
  }
  return map
}

// A single chord in close position for quality drills (E5). The requested
// inversion rotates the stack; no separate bass note, because a doubled root
// in the bass would give the inversion away.
export function chordCloseVoicing(spec: ChordSpec, inversion = 0): string[] {
  const pcs = Chord.get(chordSymbol(spec)).notes
  if (pcs.length < 3) throw new Error(`Unvoiceable chord: ${chordSymbol(spec)}`)
  const rot = inversion % pcs.length
  const rotated = [...pcs.slice(rot), ...pcs.slice(0, rot)]
  const notes: string[] = []
  let oct = 4
  let prevMidi = -Infinity
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
  return notes
}
