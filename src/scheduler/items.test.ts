import { describe, expect, it } from 'vitest'
import { KEYS } from '../theory/keys'
import { chordPitchClasses, parseNumeral } from '../theory'
import { tonicPitchClassOf } from '../audio/input/notes'
import { generateFragment, P2_POOL_BY_LENGTH } from '../features/items/P2Item'
import {
  contextsForNode,
  distractorRanks,
  E7_POOL_SIZE,
  E8_POOL_SIZE,
  E9_RANK_COUNT,
  F1_STRING_SETS,
  F5_DEGREES,
  f5TargetPitchClass,
  F5_NUMERALS,
  isDiatonicProgression,
  ITEMS,
  NUMERAL_DEGREE,
  P2_LENGTHS,
  P2_SEEDS_PER_LENGTH,
} from './items'

describe('drill items', () => {
  it('has no id collisions across the whole item bank', () => {
    const ids = ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  for (const nodeId of ['E0', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9']) {
    it(`${nodeId} covers all 12 key contexts`, () => {
      const contexts = contextsForNode(nodeId)
      expect(new Set(contexts).size).toBe(12)
      for (const key of KEYS) expect(contexts).toContain(key.tonic)
    })
  }

  it('E0 params are well-formed: tonic, degree in the probe set, gapSeconds in the tier set', () => {
    const e0 = ITEMS.filter((i) => i.nodeId === 'E0')
    expect(e0.length).toBeGreaterThan(0)
    for (const item of e0) {
      expect(item.context).toBe(item.params.tonic)
      expect(typeof item.params.tonic).toBe('string')
      expect([1, 2, 3, 5, 6, 7]).toContain(item.params.degree)
      expect([2, 4, 8]).toContain(item.params.gapSeconds)
    }
  })

  it('E0 seeds a degree-1 ("yes") item at double weight per key and gap tier', () => {
    for (const key of KEYS) {
      for (const gapSeconds of [2, 4, 8]) {
        const yesItems = ITEMS.filter(
          (i) => i.nodeId === 'E0' && i.params.tonic === key.tonic && i.params.gapSeconds === gapSeconds && i.params.degree === 1,
        )
        expect(yesItems).toHaveLength(2)
      }
    }
  })

  it('E0 seeds the fifth distractor harder than the second (more confusable with the tonic)', () => {
    const fifth = ITEMS.find((i) => i.nodeId === 'E0' && i.params.tonic === 'C' && i.params.degree === 5 && i.params.gapSeconds === 2)
    const second = ITEMS.find((i) => i.nodeId === 'E0' && i.params.tonic === 'C' && i.params.degree === 2 && i.params.gapSeconds === 2)
    expect(fifth).toBeDefined()
    expect(second).toBeDefined()
    expect(fifth!.seedRating).toBeGreaterThan(second!.seedRating)
  })

  it('E2 params are well-formed: tonic, degree in the active-degree set {2,4,6,7}', () => {
    const e2 = ITEMS.filter((i) => i.nodeId === 'E2')
    expect(e2.length).toBeGreaterThan(0)
    for (const item of e2) {
      expect(item.context).toBe(item.params.tonic)
      expect(typeof item.params.tonic).toBe('string')
      expect([2, 4, 6, 7]).toContain(item.params.degree)
      expect(item.params.gapSeconds).toBeUndefined()
    }
  })

  it('E3 params are well-formed: tonic, degree spans the full scale 1-7', () => {
    const e3 = ITEMS.filter((i) => i.nodeId === 'E3')
    expect(e3.length).toBeGreaterThan(0)
    for (const item of e3) {
      expect(item.context).toBe(item.params.tonic)
      expect(typeof item.params.tonic).toBe('string')
      expect(item.params.degree).toBeGreaterThanOrEqual(1)
      expect(item.params.degree).toBeLessThanOrEqual(7)
    }
    for (const key of KEYS) {
      const degrees = e3.filter((i) => i.params.tonic === key.tonic).map((i) => i.params.degree)
      expect(new Set(degrees)).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]))
    }
  })

  const E4_FORMS = ['major', 'natural minor', 'harmonic minor', 'melodic minor']

  it('E4 params are well-formed: tonic, form in the four-form set, all 12 tonics covered', () => {
    const e4 = ITEMS.filter((i) => i.nodeId === 'E4')
    expect(e4.length).toBeGreaterThan(0)
    for (const item of e4) {
      expect(item.context).toBe(item.params.tonic)
      expect(typeof item.params.tonic).toBe('string')
      expect(E4_FORMS).toContain(item.params.form)
    }
    for (const key of KEYS) {
      const forms = e4.filter((i) => i.params.tonic === key.tonic).map((i) => i.params.form)
      expect(new Set(forms)).toEqual(new Set(E4_FORMS))
    }
  })

  const E5_TRIAD_QUALITIES = ['maj', 'min', 'dim', 'aug']
  const E5_SEVENTH_QUALITIES = ['maj7', 'min7', 'dom7', 'm7b5', 'dim7']

  it('E5 params are well-formed: root, tier is triad or seventh, quality matches its tier', () => {
    const e5 = ITEMS.filter((i) => i.nodeId === 'E5')
    expect(e5.length).toBeGreaterThan(0)
    for (const item of e5) {
      expect(item.context).toBe(item.params.root)
      expect(typeof item.params.root).toBe('string')
      expect(['triad', 'seventh']).toContain(item.params.tier)
      if (item.params.tier === 'triad') expect(E5_TRIAD_QUALITIES).toContain(item.params.quality)
      else expect(E5_SEVENTH_QUALITIES).toContain(item.params.quality)
    }
    for (const key of KEYS) {
      const rootItems = e5.filter((i) => i.params.root === key.tonic)
      expect(rootItems).toHaveLength(E5_TRIAD_QUALITIES.length + E5_SEVENTH_QUALITIES.length)
      const triadQualities = rootItems.filter((i) => i.params.tier === 'triad').map((i) => i.params.quality)
      expect(new Set(triadQualities)).toEqual(new Set(E5_TRIAD_QUALITIES))
      const seventhQualities = rootItems.filter((i) => i.params.tier === 'seventh').map((i) => i.params.quality)
      expect(new Set(seventhQualities)).toEqual(new Set(E5_SEVENTH_QUALITIES))
    }
  })

  const E6_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']

  it('E6 params are well-formed: tonic, numeral in the seven diatonic numerals, all 12 tonics covered', () => {
    const e6 = ITEMS.filter((i) => i.nodeId === 'E6')
    expect(e6.length).toBeGreaterThan(0)
    for (const item of e6) {
      expect(item.context).toBe(item.params.tonic)
      expect(typeof item.params.tonic).toBe('string')
      expect(E6_NUMERALS).toContain(item.params.numeral)
    }
    for (const key of KEYS) {
      const numerals = e6.filter((i) => i.params.tonic === key.tonic).map((i) => i.params.numeral)
      expect(new Set(numerals)).toEqual(new Set(E6_NUMERALS))
    }
  })

  it('E7 params are well-formed: tonic, mode major|minor, rank within each mode\'s pool size, all 12 tonics covered', () => {
    const e7 = ITEMS.filter((i) => i.nodeId === 'E7')
    expect(e7.length).toBeGreaterThan(0)
    for (const item of e7) {
      expect(item.context).toBe(item.params.tonic)
      expect(typeof item.params.tonic).toBe('string')
      expect(['major', 'minor']).toContain(item.params.mode)
      const mode = item.params.mode as 'major' | 'minor'
      expect(item.params.rank).toBeGreaterThanOrEqual(0)
      expect(item.params.rank).toBeLessThan(E7_POOL_SIZE[mode])
    }
    for (const key of KEYS) {
      const ranks = (mode: 'major' | 'minor') =>
        e7.filter((i) => i.params.tonic === key.tonic && i.params.mode === mode).map((i) => i.params.rank)
      expect(new Set(ranks('major'))).toEqual(new Set(Array.from({ length: E7_POOL_SIZE.major }, (_, i) => i)))
      expect(new Set(ranks('minor'))).toEqual(new Set(Array.from({ length: E7_POOL_SIZE.minor }, (_, i) => i)))
    }
  })

  it('E7 seeds rise with rank, and minor sits above major at the same rank', () => {
    const e7 = ITEMS.filter((i) => i.nodeId === 'E7' && i.params.tonic === 'C')
    const major = (r: number) => e7.find((i) => i.params.mode === 'major' && i.params.rank === r)!
    const minor = (r: number) => e7.find((i) => i.params.mode === 'minor' && i.params.rank === r)!
    expect(major(1).seedRating).toBeGreaterThan(major(0).seedRating)
    expect(minor(0).seedRating).toBeGreaterThan(major(0).seedRating)
  })

  it('E8 params are well-formed: tonic, mode major|minor, rank within each mode\'s pool size, all 12 tonics covered', () => {
    const e8 = ITEMS.filter((i) => i.nodeId === 'E8')
    expect(e8.length).toBeGreaterThan(0)
    for (const item of e8) {
      expect(item.context).toBe(item.params.tonic)
      expect(typeof item.params.tonic).toBe('string')
      expect(['major', 'minor']).toContain(item.params.mode)
      const mode = item.params.mode as 'major' | 'minor'
      expect(item.params.rank).toBeGreaterThanOrEqual(0)
      expect(item.params.rank).toBeLessThan(E8_POOL_SIZE[mode])
    }
    for (const key of KEYS) {
      const ranks = (mode: 'major' | 'minor') =>
        e8.filter((i) => i.params.tonic === key.tonic && i.params.mode === mode).map((i) => i.params.rank)
      expect(new Set(ranks('major'))).toEqual(new Set(Array.from({ length: E8_POOL_SIZE.major }, (_, i) => i)))
      expect(new Set(ranks('minor'))).toEqual(new Set(Array.from({ length: E8_POOL_SIZE.minor }, (_, i) => i)))
    }
  })

  it('E9 params are well-formed: tonic, mode always major, rank within the diatonic pool size, all 12 tonics covered', () => {
    const e9 = ITEMS.filter((i) => i.nodeId === 'E9')
    expect(e9.length).toBeGreaterThan(0)
    for (const item of e9) {
      expect(item.context).toBe(item.params.tonic)
      expect(typeof item.params.tonic).toBe('string')
      expect(item.params.mode).toBe('major')
      expect(item.params.rank).toBeGreaterThanOrEqual(0)
      expect(item.params.rank).toBeLessThan(E9_RANK_COUNT)
    }
    for (const key of KEYS) {
      const ranks = e9.filter((i) => i.params.tonic === key.tonic).map((i) => i.params.rank)
      expect(new Set(ranks)).toEqual(new Set(Array.from({ length: E9_RANK_COUNT }, (_, i) => i)))
    }
  })

  it('E9\'s rank count matches the corpus filtered to plain-diatonic entries in the top-10 major four-chord list', async () => {
    const { loadProgressionFrequency, topProgressions } = await import('../curriculum/progressions')
    const data = await loadProgressionFrequency()
    const pool = topProgressions(data, 'major', 'four', 10).filter((e) => isDiatonicProgression(e.p))
    expect(pool).toHaveLength(E9_RANK_COUNT)
  })

  it('NUMERAL_DEGREE maps the seven plain diatonic numerals to their scale degree', () => {
    expect(NUMERAL_DEGREE).toEqual({ I: 1, ii: 2, iii: 3, IV: 4, V: 5, vi: 6, 'vii°': 7 })
    expect(isDiatonicProgression(['I', 'IV', 'V', 'I'])).toBe(true)
    expect(isDiatonicProgression(['I', 'bVII', 'IV', 'I'])).toBe(false)
  })

  it('distractorRanks is deterministic and picks the nearest other ranks, ties favoring the lower (more frequent) rank', () => {
    expect(distractorRanks(0, 12, 3)).toEqual([1, 2, 3])
    expect(distractorRanks(11, 12, 3)).toEqual([10, 9, 8])
    // rank 5 of 0..11: distance-1 neighbors are 4 and 6 (tie), then distance-2 is 3 and 7 (tie) — lower rank wins each tie.
    expect(distractorRanks(5, 12, 3)).toEqual([4, 6, 3])
    expect(distractorRanks(5, 12, 3)).toEqual(distractorRanks(5, 12, 3))
  })

  for (const nodeId of ['F0', 'F1', 'F5']) {
    it(`${nodeId} covers all 12 key contexts`, () => {
      const contexts = contextsForNode(nodeId)
      expect(new Set(contexts).size).toBe(12)
      for (const key of KEYS) expect(contexts).toContain(key.tonic)
    })
  }

  it('F0 params are well-formed: pitchClass one of the 12 tonics, stringIndex 1-6, all 6 strings covered per pitch class', () => {
    const f0 = ITEMS.filter((i) => i.nodeId === 'F0')
    expect(f0.length).toBeGreaterThan(0)
    for (const item of f0) {
      expect(item.context).toBe(item.params.pitchClass)
      expect(typeof item.params.pitchClass).toBe('string')
      expect(KEYS.map((k) => k.tonic)).toContain(item.params.pitchClass)
      expect(item.params.stringIndex).toBeGreaterThanOrEqual(1)
      expect(item.params.stringIndex).toBeLessThanOrEqual(6)
    }
    for (const key of KEYS) {
      const strings = f0.filter((i) => i.params.pitchClass === key.tonic).map((i) => i.params.stringIndex)
      expect(new Set(strings)).toEqual(new Set([1, 2, 3, 4, 5, 6]))
    }
  })

  it('F0 seeds naturals lower than sharps/flats', () => {
    const natural = ITEMS.find((i) => i.nodeId === 'F0' && i.params.pitchClass === 'C' && i.params.stringIndex === 6)!
    const accidental = ITEMS.find((i) => i.nodeId === 'F0' && i.params.pitchClass === 'F#' && i.params.stringIndex === 6)!
    expect(natural.seedRating).toBeLessThan(accidental.seedRating)
  })

  it('F1 params are well-formed: rootPitchClass, degree in 2-7, stringSet one of the nine pairs, no root (degree 1)', () => {
    const f1 = ITEMS.filter((i) => i.nodeId === 'F1')
    expect(f1.length).toBeGreaterThan(0)
    const stringSetStrings = new Set(F1_STRING_SETS.map(([a, b]) => `${a}-${b}`))
    for (const item of f1) {
      expect(item.context).toBe(item.params.rootPitchClass)
      expect(typeof item.params.rootPitchClass).toBe('string')
      expect(item.params.degree).toBeGreaterThanOrEqual(2)
      expect(item.params.degree).toBeLessThanOrEqual(7)
      expect(stringSetStrings).toContain(item.params.stringSet)
    }
    for (const key of KEYS) {
      const forKey = f1.filter((i) => i.params.rootPitchClass === key.tonic)
      expect(forKey).toHaveLength(6 * F1_STRING_SETS.length)
      const degrees = new Set(forKey.map((i) => i.params.degree))
      expect(degrees).toEqual(new Set([2, 3, 4, 5, 6, 7]))
      const sets = new Set(forKey.map((i) => i.params.stringSet))
      expect(sets).toEqual(stringSetStrings)
    }
  })

  it('F1 has 9 string sets: 5 adjacent, 4 skip-one, none repeated', () => {
    expect(F1_STRING_SETS).toHaveLength(9)
    const keys = F1_STRING_SETS.map(([a, b]) => `${a}-${b}`)
    expect(new Set(keys).size).toBe(9)
    const adjacent = F1_STRING_SETS.filter(([a, b]) => Math.abs(a - b) === 1)
    const skip = F1_STRING_SETS.filter(([a, b]) => Math.abs(a - b) === 2)
    expect(adjacent).toHaveLength(5)
    expect(skip).toHaveLength(4)
  })

  it('F5 params are well-formed: tonic, numeralIndex within the fixed progression, degree in the four-degree set', () => {
    const f5 = ITEMS.filter((i) => i.nodeId === 'F5')
    expect(f5.length).toBeGreaterThan(0)
    for (const item of f5) {
      expect(item.context).toBe(item.params.tonic)
      expect(typeof item.params.tonic).toBe('string')
      expect(item.params.numeralIndex).toBeGreaterThanOrEqual(0)
      expect(item.params.numeralIndex).toBeLessThan(F5_NUMERALS.length)
      expect(F5_DEGREES).toContain(item.params.degree)
    }
    for (const key of KEYS) {
      const forKey = f5.filter((i) => i.params.tonic === key.tonic)
      expect(forKey).toHaveLength(F5_NUMERALS.length * F5_DEGREES.length)
      const indices = new Set(forKey.map((i) => i.params.numeralIndex))
      expect(indices).toEqual(new Set(F5_NUMERALS.map((_, i) => i)))
    }
  })

  describe('f5TargetPitchClass', () => {
    const pc = (name: string) => tonicPitchClassOf(name)

    it('reads 1, 3 and 5 off a major chord', () => {
      expect(f5TargetPitchClass('C', 'I', '1')).toBe(pc('C'))
      expect(f5TargetPitchClass('C', 'I', '3')).toBe(pc('E'))
      expect(f5TargetPitchClass('C', 'I', '5')).toBe(pc('G'))
      expect(f5TargetPitchClass('C', 'IV', '3')).toBe(pc('A'))
    })

    // The bug this replaced: a fixed major-third offset asked for C♯ over A
    // minor — a note in neither the chord nor the key. F5's progression ends
    // on vi, so this was one item in four.
    it('takes the 3rd from a minor chord, not from a fixed offset', () => {
      expect(f5TargetPitchClass('C', 'vi', '3')).toBe(pc('C'))
      expect(f5TargetPitchClass('C', 'vi', '3')).not.toBe(pc('C#'))
      expect(f5TargetPitchClass('G', 'vi', '3')).toBe(pc('G'))
      expect(f5TargetPitchClass('Eb', 'vi', '3')).toBe(pc('Eb'))
    })

    it('keeps the root and fifth the same on major and minor', () => {
      expect(f5TargetPitchClass('C', 'vi', '1')).toBe(pc('A'))
      expect(f5TargetPitchClass('C', 'vi', '5')).toBe(pc('E'))
    })

    // ♭7 is the one degree not read from the chord: a triad has no 7th, and
    // ten semitones above the root is the same note either way.
    it('puts ♭7 ten semitones above the root, whatever the quality', () => {
      expect(f5TargetPitchClass('C', 'I', 'b7')).toBe(pc('Bb'))
      expect(f5TargetPitchClass('C', 'V', 'b7')).toBe(pc('F'))
      expect(f5TargetPitchClass('C', 'vi', 'b7')).toBe(pc('G'))
    })

    it('lands inside the sounding chord for 1, 3 and 5, in every key', () => {
      for (const key of KEYS) {
        for (const numeral of F5_NUMERALS) {
          const chordPcs = chordPitchClasses(parseNumeral(key.tonic, numeral)).map(tonicPitchClassOf)
          for (const degree of ['1', '3', '5']) {
            expect(chordPcs).toContain(f5TargetPitchClass(key.tonic, numeral, degree))
          }
        }
      }
    })
  })

  it('P1 params are well-formed: one item per key, tonic only, uniform seed rating', () => {
    const p1 = ITEMS.filter((i) => i.nodeId === 'P1')
    expect(p1).toHaveLength(12)
    const seeds = new Set(p1.map((i) => i.seedRating))
    expect(seeds.size).toBe(1)
    for (const key of KEYS) {
      const found = p1.find((i) => i.params.tonic === key.tonic)
      expect(found).toBeDefined()
      expect(found!.context).toBe(key.tonic)
      expect(found!.kind).toBe('production')
    }
  })

  it('P2 params are well-formed: tonic, length in {3,4,5}, seed within the per-length count, all 12 keys covered', () => {
    const p2 = ITEMS.filter((i) => i.nodeId === 'P2')
    expect(p2.length).toBeGreaterThan(0)
    for (const item of p2) {
      expect(item.context).toBe(item.params.tonic)
      expect(typeof item.params.tonic).toBe('string')
      expect(P2_LENGTHS).toContain(item.params.length)
      expect(item.params.seed).toBeGreaterThanOrEqual(0)
      expect(item.params.seed).toBeLessThan(P2_SEEDS_PER_LENGTH)
      expect(item.kind).toBe('production')
    }
    for (const key of KEYS) {
      const forKey = p2.filter((i) => i.params.tonic === key.tonic)
      expect(forKey).toHaveLength(P2_LENGTHS.length * P2_SEEDS_PER_LENGTH)
      for (const length of P2_LENGTHS) {
        const seeds = forKey.filter((i) => i.params.length === length).map((i) => i.params.seed)
        expect(new Set(seeds)).toEqual(new Set(Array.from({ length: P2_SEEDS_PER_LENGTH }, (_, i) => i)))
      }
    }
  })

  it('P2 seeds rise with fragment length', () => {
    const seedFor = (length: number) => ITEMS.find((i) => i.nodeId === 'P2' && i.params.tonic === 'C' && i.params.length === length)!.seedRating
    expect(seedFor(4)).toBeGreaterThan(seedFor(3))
    expect(seedFor(5)).toBeGreaterThan(seedFor(4))
  })

  it('every generated P2 fragment has no immediate repeat, and reproduces identically for the same params', () => {
    const p2 = ITEMS.filter((i) => i.nodeId === 'P2')
    for (const item of p2) {
      const tonic = String(item.params.tonic)
      const length = Number(item.params.length)
      const seed = Number(item.params.seed)
      const fragment = generateFragment(tonic, length, seed)
      expect(fragment).toHaveLength(length)
      for (const degree of fragment) expect(P2_POOL_BY_LENGTH[length]).toContain(degree)
      for (let i = 1; i < fragment.length; i++) expect(fragment[i]).not.toBe(fragment[i - 1])
      // Determinism: the same {tonic, length, seed} must reproduce the same fragment.
      expect(generateFragment(tonic, length, seed)).toEqual(fragment)
    }
  })
})
