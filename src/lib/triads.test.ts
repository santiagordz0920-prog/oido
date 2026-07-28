import { describe, expect, it } from 'vitest'
import { Note } from 'tonal'
import {
  allTriadShapes,
  F2_STRING_SETS,
  INVERSIONS,
  MAX_FRET,
  stringSetId,
  stringSetLabel,
  parseStringSet,
  triadShape,
  type Inversion,
} from './triads'
import { midiAt } from './fretboardMath'
import { chordPitchClasses, type ChordQuality, type ChordSpec } from '../theory'
import { pitchClassOf, tonicPitchClassOf } from '../audio/input/notes'
import { KEYS } from '../theory/keys'

const TRIAD_QUALITIES: ChordQuality[] = ['maj', 'min', 'dim', 'aug']

function midisOf(shape: NonNullable<ReturnType<typeof triadShape>>): number[] {
  return shape.positions.map((p) => midiAt(p.string, p.fret))
}

describe('triadShape', () => {
  it('places a C major triad in root position on the {3,4,5} set', () => {
    const shape = triadShape({ root: 'C', quality: 'maj' }, [5, 4, 3], 0)!
    expect(shape.positions).toEqual([
      { string: 5, fret: 3, degree: 1 },
      { string: 4, fret: 2, degree: 3 },
      { string: 3, fret: 0, degree: 5 },
    ])
    expect(shape.bassDegree).toBe(1)
  })

  it('rotates the stack for each inversion', () => {
    const spec: ChordSpec = { root: 'C', quality: 'maj' }
    expect(triadShape(spec, [5, 4, 3], 0)!.positions.map((p) => p.degree)).toEqual([1, 3, 5])
    expect(triadShape(spec, [5, 4, 3], 1)!.positions.map((p) => p.degree)).toEqual([3, 5, 1])
    expect(triadShape(spec, [5, 4, 3], 2)!.positions.map((p) => p.degree)).toEqual([5, 1, 3])
  })

  it('names the degree that sits underneath', () => {
    const spec: ChordSpec = { root: 'A', quality: 'min' }
    expect(triadShape(spec, [4, 3, 2], 0)!.bassDegree).toBe(1)
    expect(triadShape(spec, [4, 3, 2], 1)!.bassDegree).toBe(3)
    expect(triadShape(spec, [4, 3, 2], 2)!.bassDegree).toBe(5)
  })
})

describe('every shape the drill can serve', () => {
  const every = () => {
    const out: Array<{
      spec: ChordSpec
      stringSet: [number, number, number]
      inversion: Inversion
      shape: NonNullable<ReturnType<typeof triadShape>>
    }> = []
    for (const key of KEYS) {
      for (const quality of TRIAD_QUALITIES) {
        for (const stringSet of F2_STRING_SETS) {
          for (const inversion of INVERSIONS) {
            const spec: ChordSpec = { root: key.tonic, quality }
            const shape = triadShape(spec, stringSet, inversion)
            if (shape) out.push({ spec, stringSet, inversion, shape })
          }
        }
      }
    }
    return out
  }

  // 12 roots x 4 qualities x 4 string sets x 3 inversions. If any combination
  // had no shape the item pool would silently have holes in it.
  it('exists for all 576 combinations', () => {
    expect(every()).toHaveLength(12 * 4 * 4 * 3)
  })

  it('sounds exactly the chord, and nothing else', () => {
    for (const { spec, shape } of every()) {
      const heard = new Set(midisOf(shape).map(pitchClassOf))
      const expected = new Set(chordPitchClasses(spec).map(tonicPitchClassOf))
      expect([...heard].sort()).toEqual([...expected].sort())
    }
  })

  it('puts the named degree underneath, every time', () => {
    for (const { shape } of every()) {
      const midis = midisOf(shape)
      // Positions are ordered low string to high, which must also be low
      // pitch to high pitch — a close-position voicing does not cross over.
      expect(midis).toEqual([...midis].sort((a, b) => a - b))
      expect(shape.positions[0].degree).toBe(shape.bassDegree)
    }
  })

  it('stays in close position, never spread across octaves', () => {
    for (const { shape } of every()) {
      const midis = midisOf(shape)
      expect(midis[2] - midis[0]).toBeLessThanOrEqual(16)
    }
  })

  // A shape nobody can hold is not a drill item. Four frets is the reach the
  // fingers actually have.
  it('is playable: no shape spans more than four frets', () => {
    for (const { spec, stringSet, inversion, shape } of every()) {
      expect(
        shape.span,
        `${spec.root}${spec.quality} ${stringSetLabel(stringSet)} inv ${inversion}`,
      ).toBeLessThanOrEqual(4)
    }
  })

  it('sits on the neck, at the lowest position that fits', () => {
    for (const { spec, stringSet, inversion, shape } of every()) {
      for (const p of shape.positions) {
        expect(p.fret).toBeGreaterThanOrEqual(0)
        expect(p.fret).toBeLessThanOrEqual(MAX_FRET)
      }
      const all = allTriadShapes(spec, stringSet, inversion)
      expect(shape.lowestFret).toBe(Math.min(...all.map((s) => s.lowestFret)))
    }
  })

  it('uses only the strings it was given', () => {
    for (const { stringSet, shape } of every()) {
      expect(shape.positions.map((p) => p.string)).toEqual(stringSet)
    }
  })
})

describe('allTriadShapes', () => {
  it('finds the same shape at every octave that fits', () => {
    const shapes = allTriadShapes({ root: 'C', quality: 'maj' }, [5, 4, 3], 0)
    expect(shapes.length).toBeGreaterThan(1)
    // The same shape an octave up is the same fret pattern, twelve higher.
    const spans = new Set(shapes.map((s) => s.span))
    expect(spans.size).toBe(1)
    for (let i = 1; i < shapes.length; i++) {
      expect(shapes[i].lowestFret - shapes[i - 1].lowestFret).toBe(12)
    }
  })

  it('is empty when nothing fits within the given reach', () => {
    expect(allTriadShapes({ root: 'C', quality: 'maj' }, [5, 4, 3], 0, 1)).toEqual([])
    expect(triadShape({ root: 'C', quality: 'maj' }, [5, 4, 3], 0, 1)).toBeNull()
  })
})

describe('string set labels', () => {
  it('names a set high string first, the way players write it', () => {
    expect(stringSetLabel([6, 5, 4])).toBe('{4,5,6}')
    expect(stringSetLabel([3, 2, 1])).toBe('{1,2,3}')
  })

  it('round-trips through an item parameter', () => {
    for (const set of F2_STRING_SETS) {
      expect(parseStringSet(stringSetId(set))).toEqual(set)
    }
  })

  it('rejects a malformed set', () => {
    expect(() => parseStringSet('5-4')).toThrow()
    expect(() => parseStringSet('a-b-c')).toThrow()
  })
})

describe('the shapes are real guitar shapes', () => {
  // Spot-check against voicings a player would recognize, so the arithmetic
  // is anchored to something outside itself.
  it('finds the open A minor shape on {2,3,4} in second inversion', () => {
    // A minor with the 5th (E) underneath, on strings 4,3,2: E3 A3 C4.
    const shape = triadShape({ root: 'A', quality: 'min' }, [4, 3, 2], 2)!
    expect(midisOf(shape).map((m) => Note.fromMidi(m))).toEqual(['E3', 'A3', 'C4'])
  })

  it('finds the top three strings of an open E major chord', () => {
    // Strings 3,2,1 at frets 1,0,0: G#3 B3 E4 — E major, 3rd underneath.
    const shape = triadShape({ root: 'E', quality: 'maj' }, [3, 2, 1], 1)!
    expect(shape.positions.map((p) => p.fret)).toEqual([1, 0, 0])
    expect(shape.bassDegree).toBe(3)
  })
})
