import { describe, expect, it } from 'vitest'
import { KEYS } from '../theory/keys'
import {
  contextsForNode,
  distractorRanks,
  E7_POOL_SIZE,
  E8_POOL_SIZE,
  E9_RANK_COUNT,
  isDiatonicProgression,
  ITEMS,
  NUMERAL_DEGREE,
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
})
