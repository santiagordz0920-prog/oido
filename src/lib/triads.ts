import { chordDegreeSemitones, type ChordDegree, type ChordSpec } from '../theory'
import { tonicPitchClassOf } from '../audio/input/notes'
import { midiAt } from './fretboardMath'

// Closed-voicing triad shapes for F2 (docs/curriculum.md §7): all four
// qualities, all three inversions, on the four adjacent three-string sets.
// The highest-leverage block in the app, so the shapes are computed rather
// than tabulated — twelve roots times four qualities times three inversions
// times four string sets is 576 shapes, and a table that size is a table
// with mistakes in it.
//
// "Closed" means close position: the three chord tones stacked as tightly as
// they go, which on a three-string set is the only way they fit. Open
// strings are allowed; what is excluded is spreading the voicing across
// octaves.

/** String sets, written low-pitched string first, as the shapes are read. */
export const F2_STRING_SETS: Array<[number, number, number]> = [
  [6, 5, 4],
  [5, 4, 3],
  [4, 3, 2],
  [3, 2, 1],
]

/** 0 = root position, 1 = the 3rd underneath, 2 = the 5th underneath. */
export type Inversion = 0 | 1 | 2

export const INVERSIONS: Inversion[] = [0, 1, 2]

export const MAX_FRET = 15

export type ShapePosition = {
  string: number
  fret: number
  degree: ChordDegree
}

export type TriadShape = {
  /** Low string to high, which is also low pitch to high pitch. */
  positions: ShapePosition[]
  bassDegree: ChordDegree
  lowestFret: number
  /** Frets from the lowest to the highest fretted note. */
  span: number
}

// The chord degree that sits underneath, per inversion.
const BASS_DEGREE: Record<Inversion, ChordDegree> = { 0: 1, 1: 3, 2: 5 }

// The stack, as semitones above the root, for each inversion. Rotating a
// close-position triad lifts the notes below the new bass by an octave,
// which is what makes the three inversions three different shapes rather
// than one shape moved.
function stackFor(spec: ChordSpec, inversion: Inversion): number[] {
  const bySemitone = chordDegreeSemitones(spec)
  const triad = [...bySemitone.entries()]
    .filter(([, degree]) => degree !== 7)
    .sort((a, b) => a[0] - b[0])
    .map(([semitone]) => semitone)
  if (triad.length !== 3) throw new Error(`Not a triad: ${spec.root} ${spec.quality}`)
  const rotated = [...triad.slice(inversion), ...triad.slice(0, inversion)]
  const out: number[] = []
  let previous = -Infinity
  for (const semitone of rotated) {
    let value = semitone
    while (value <= previous) value += 12
    out.push(value)
    previous = value
  }
  return out
}

/**
 * The shape for one chord, string set and inversion, at the lowest position
 * on the neck where it fits. Null when it does not fit at all, which the
 * caller must handle rather than assume away.
 */
export function triadShape(
  spec: ChordSpec,
  stringSet: [number, number, number],
  inversion: Inversion,
  maxFret = MAX_FRET,
): TriadShape | null {
  // allTriadShapes searches the root's octave upward, so its first result is
  // already the lowest position on the neck.
  return allTriadShapes(spec, stringSet, inversion, maxFret)[0] ?? null
}

function degreesOfStack(spec: ChordSpec, stack: number[]): ChordDegree[] {
  const bySemitone = chordDegreeSemitones(spec)
  return stack.map((value) => {
    const degree = bySemitone.get(((value % 12) + 12) % 12)
    if (degree === undefined) throw new Error(`Stack note ${value} is not a chord tone`)
    return degree
  })
}

/** Every position of the shape, at every place on the neck it fits. */
export function allTriadShapes(
  spec: ChordSpec,
  stringSet: [number, number, number],
  inversion: Inversion,
  maxFret = MAX_FRET,
): TriadShape[] {
  const rootPc = tonicPitchClassOf(spec.root)
  const stack = stackFor(spec, inversion)
  const degrees = degreesOfStack(spec, stack)
  const shapes: TriadShape[] = []
  for (let rootMidi = rootPc; rootMidi <= 108; rootMidi += 12) {
    const midis = stack.map((semitone) => rootMidi + semitone)
    const positions: ShapePosition[] = []
    let fits = true
    for (const [i, string] of stringSet.entries()) {
      const fret = midis[i] - midiAt(string, 0)
      if (fret < 0 || fret > maxFret) {
        fits = false
        break
      }
      positions.push({ string, fret, degree: degrees[i] })
    }
    if (!fits) continue
    const frets = positions.map((p) => p.fret)
    shapes.push({
      positions,
      bassDegree: BASS_DEGREE[inversion],
      lowestFret: Math.min(...frets),
      span: Math.max(...frets) - Math.min(...frets),
    })
  }
  return shapes
}

export function stringSetLabel(stringSet: [number, number, number]): string {
  // Written high string first, the way string sets are usually named:
  // {1,2,3} rather than {3,2,1}.
  return `{${[...stringSet].sort((a, b) => a - b).join(',')}}`
}

export function parseStringSet(label: string): [number, number, number] {
  const parts = label.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) throw new Error(`Bad string set: ${label}`)
  return [parts[0], parts[1], parts[2]]
}

export function stringSetId(stringSet: [number, number, number]): string {
  return stringSet.join('-')
}
