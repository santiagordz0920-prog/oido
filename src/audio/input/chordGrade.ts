import { chordDegreeSemitones, parseNumeral, type ChordDegree, type ChordQuality, type ChordSpec } from '../../theory'
import { pitchClassOf, tonicPitchClassOf } from './notes'

// Grading a played chord against the one that was asked for
// (docs/architecture.md §12.2, Tier 2).
//
// The app almost always knows what the user was supposed to play, which is
// what turns open transcription into scoring. So this module never asks
// "what chord is this?" — it asks "is this that chord, and if not, what
// specifically is different?" The answer is a diagnosis, because "wrong" is
// not something anyone can practise against, and "you played the 7, this
// chord is a triad" is.
//
// Everything here works in semitones above the expected root, so spelling
// never enters: detection yields pitch classes, and a pitch class has no
// spelling. Answers reach the UI as chord degrees — 1, 3, 5, 7 — never as
// interval names.

export type DetectedNote = {
  midi: number
  startSeconds: number
  durationSeconds: number
  amplitude: number
}

// The quality templates, as semitones above the root. Used to name what was
// played when it was a real chord but not the one asked for.
const QUALITY_TEMPLATES: Array<[ChordQuality, number[]]> = [
  ['maj', [0, 4, 7]],
  ['min', [0, 3, 7]],
  ['dim', [0, 3, 6]],
  ['aug', [0, 4, 8]],
  ['maj7', [0, 4, 7, 11]],
  ['min7', [0, 3, 7, 10]],
  ['dom7', [0, 4, 7, 10]],
  ['m7b5', [0, 3, 6, 10]],
  ['dim7', [0, 3, 6, 9]],
]

export type ChordDiagnosis =
  /** The asked-for chord, with the asked-for note in the bass. */
  | { kind: 'match' }
  /** Right notes, wrong note underneath them. */
  | { kind: 'inversion'; expectedBass: ChordDegree; playedBass: ChordDegree }
  /** A triad was asked for and a 7th came along with it. */
  | { kind: 'seventh-added'; semitones: number }
  /** The 3rd was replaced by the 2nd or the 4th — a suspension. */
  | { kind: 'suspended'; replacedBy: 2 | 4 }
  /** The relative major or minor: two notes shared, one moved. */
  | { kind: 'relative' }
  /** A real chord on the same root, but a different quality. */
  | { kind: 'quality'; played: ChordQuality }
  /** Some of the chord arrived and some did not. */
  | { kind: 'incomplete'; missing: ChordDegree[] }
  /** Notes that do not belong, given as semitones above the expected root. */
  | { kind: 'extra'; semitones: number[] }
  /** Nothing usable was heard at all. */
  | { kind: 'silence' }

export type ChordVerdict = {
  correct: boolean
  /** Pitch classes heard, as semitones above the expected root, ascending. */
  heard: number[]
  missing: ChordDegree[]
  extra: number[]
  bass: { expected: ChordDegree; played: ChordDegree | null } | null
  diagnosis: ChordDiagnosis
}

export type GradeOptions = {
  /**
   * Which chord degree must be lowest. Omit when the drill does not care
   * about the inversion, which is most of them — F2 is the node that does.
   */
  expectedBass?: ChordDegree
  /**
   * Notes quieter than this fraction of the loudest detected note are
   * dropped. A strummed acoustic leaks sympathetic ringing from strings the
   * player never meant to sound, and grading those as wrong notes would fail
   * correct playing.
   */
  amplitudeFloor?: number
  /** Notes shorter than this are transients, not chord tones. */
  minDurationSeconds?: number
}

export const DEFAULT_GRADE_OPTIONS: Required<Omit<GradeOptions, 'expectedBass'>> = {
  amplitudeFloor: 0.35,
  minDurationSeconds: 0.09,
}

export function filterNotes(notes: DetectedNote[], options: GradeOptions = {}): DetectedNote[] {
  const { amplitudeFloor, minDurationSeconds } = { ...DEFAULT_GRADE_OPTIONS, ...options }
  const loudest = notes.reduce((max, n) => Math.max(max, n.amplitude), 0)
  if (loudest <= 0) return []
  return notes.filter((n) => n.amplitude >= loudest * amplitudeFloor && n.durationSeconds >= minDurationSeconds)
}

function semitonesAbove(midi: number, rootPc: number): number {
  return (pitchClassOf(midi) - rootPc + 12) % 12
}

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

function sortedUnique(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b)
}

// Which chord degree a semitone offset is, for the expected chord.
function degreeAt(expected: Map<number, ChordDegree>, semitone: number): ChordDegree | null {
  return expected.get(semitone) ?? null
}

function diagnose(
  expectedSemitones: Map<number, ChordDegree>,
  heard: number[],
  missing: ChordDegree[],
  extra: number[],
  bass: { expected: ChordDegree; played: ChordDegree | null } | null,
): ChordDiagnosis {
  if (heard.length === 0) return { kind: 'silence' }

  const expectedSet = sortedUnique([...expectedSemitones.keys()])
  const setMatches = sameSet(heard, expectedSet)

  if (setMatches) {
    // Every note is right, so the only thing left to be wrong is which one
    // is underneath — the whole subject of F2 and T12.
    if (bass && bass.played !== null && bass.played !== bass.expected) {
      return { kind: 'inversion', expectedBass: bass.expected, playedBass: bass.played }
    }
    return { kind: 'match' }
  }

  const isTriad = expectedSet.length === 3

  // A triad plus one seventh. The example diagnosis from the brief.
  if (isTriad && missing.length === 0 && extra.length === 1 && (extra[0] === 10 || extra[0] === 11)) {
    return { kind: 'seventh-added', semitones: extra[0] }
  }

  // The 3rd swapped for its neighbour: sus2 or sus4 against a triad.
  const thirdSemitone = [...expectedSemitones.entries()].find(([, d]) => d === 3)?.[0]
  if (thirdSemitone !== undefined && missing.length === 1 && missing[0] === 3 && extra.length === 1) {
    if (extra[0] === 2) return { kind: 'suspended', replacedBy: 2 }
    if (extra[0] === 5) return { kind: 'suspended', replacedBy: 4 }
  }

  // The relative major or minor: build the other chord from its own root,
  // then express it above the expected root. A major triad's relative minor
  // is a MINOR triad rooted nine semitones up, which lands on 9, 0 and 4; a
  // minor triad's relative major is a MAJOR triad rooted three up, at 3, 7
  // and 10. Transposing the expected chord's own template instead would
  // produce neither.
  const isMinorish = expectedSemitones.has(3)
  const relative = isMinorish
    ? [0, 4, 7].map((s) => (s + 3) % 12)
    : [0, 3, 7].map((s) => (s + 9) % 12)
  if (sameSet(heard, sortedUnique(relative))) return { kind: 'relative' }

  // A different quality on the same root — a real chord, just not this one.
  for (const [quality, template] of QUALITY_TEMPLATES) {
    if (sameSet(heard, sortedUnique(template))) return { kind: 'quality', played: quality }
  }

  if (missing.length > 0) return { kind: 'incomplete', missing }
  return { kind: 'extra', semitones: extra }
}

// Grade a set of detected notes against an expected chord.
export function gradeChord(
  spec: ChordSpec,
  notes: DetectedNote[],
  options: GradeOptions = {},
): ChordVerdict {
  const expectedSemitones = chordDegreeSemitones(spec)
  const rootPc = tonicPitchClassOf(spec.root)
  const kept = filterNotes(notes, options)
  const heard = sortedUnique(kept.map((n) => semitonesAbove(n.midi, rootPc)))

  const missing: ChordDegree[] = []
  for (const [semitone, degree] of expectedSemitones) {
    if (!heard.includes(semitone)) missing.push(degree)
  }
  missing.sort((a, b) => a - b)
  const extra = heard.filter((s) => !expectedSemitones.has(s))

  let bass: ChordVerdict['bass'] = null
  if (options.expectedBass !== undefined) {
    const lowest = kept.reduce<DetectedNote | null>((low, n) => (low === null || n.midi < low.midi ? n : low), null)
    const playedBass = lowest === null ? null : degreeAt(expectedSemitones, semitonesAbove(lowest.midi, rootPc))
    bass = { expected: options.expectedBass, played: playedBass }
  }

  const diagnosis = diagnose(expectedSemitones, heard, missing, extra, bass)
  return {
    correct: diagnosis.kind === 'match',
    heard,
    missing,
    extra,
    bass,
    diagnosis,
  }
}

// Grade against a Roman numeral instead of a spec, which is how Track P and
// the Play-Along Engine name chords.
export function gradeNumeral(
  tonic: string,
  numeral: string,
  notes: DetectedNote[],
  options: GradeOptions = {},
): ChordVerdict {
  return gradeChord(parseNumeral(tonic, numeral), notes, options)
}
