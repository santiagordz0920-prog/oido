import { describe, expect, it } from 'vitest'
import { loadProgressionFrequency } from './progressions'
import {
  CHECKPOINT_ITEM_COUNT,
  cp1Pool,
  cp2Pool,
  cp3Pool,
  drawCP1Items,
  drawCP2Items,
  drawCP3Items,
  drawKeys,
  sampleIndices,
  seededRng,
} from './checkpoints'
import { NUMERAL_DEGREE } from '../scheduler/items'

describe('checkpoint pools', () => {
  it('cp1Pool keeps only entries where both chords are plain-diatonic', async () => {
    const data = await loadProgressionFrequency()
    const pool = cp1Pool(data)
    expect(pool.length).toBeGreaterThanOrEqual(CHECKPOINT_ITEM_COUNT)
    for (const p of pool) {
      expect(p).toHaveLength(2)
      for (const numeral of p) expect(numeral in NUMERAL_DEGREE).toBe(true)
    }
  })

  it("cp2Pool's every entry has a second (graded) chord that maps into the seven-chip answer set", async () => {
    const data = await loadProgressionFrequency()
    const pool = cp2Pool(data)
    expect(pool.length).toBeGreaterThanOrEqual(CHECKPOINT_ITEM_COUNT)
    for (const p of pool) {
      expect(p).toHaveLength(2)
      expect(p[1] in NUMERAL_DEGREE).toBe(true)
    }
  })

  it('cp2Pool is a superset of cp1Pool\'s ranks (only the second chord is required to be diatonic)', async () => {
    const data = await loadProgressionFrequency()
    expect(cp2Pool(data).length).toBeGreaterThanOrEqual(cp1Pool(data).length)
  })

  it('cp2Pool excludes the known chromatic-target entry in the live corpus (rank 8 of the raw top 12: I -> bVII)', async () => {
    const data = await loadProgressionFrequency()
    const pool = cp2Pool(data)
    expect(pool.some((p) => p[0] === 'I' && p[1] === 'bVII')).toBe(false)
  })

  it('cp3Pool combines major (ranks 0-9) and minor (ranks 0-5) four-chord progressions', async () => {
    const data = await loadProgressionFrequency()
    const pool = cp3Pool(data)
    const major = pool.filter((e) => e.mode === 'major')
    const minor = pool.filter((e) => e.mode === 'minor')
    expect(major).toHaveLength(10)
    expect(minor).toHaveLength(6)
    expect(new Set(major.map((e) => e.rank))).toEqual(new Set(Array.from({ length: 10 }, (_, i) => i)))
    expect(new Set(minor.map((e) => e.rank))).toEqual(new Set(Array.from({ length: 6 }, (_, i) => i)))
    for (const e of pool) expect(e.numerals.length).toBe(4)
  })
})

describe('sampleIndices', () => {
  it('draws distinct indices, deterministically for a given seed', () => {
    const a = sampleIndices(12, 8, seededRng(1))
    const b = sampleIndices(12, 8, seededRng(1))
    expect(a).toEqual(b)
    expect(new Set(a).size).toBe(8)
    for (const i of a) expect(i).toBeGreaterThanOrEqual(0)
  })

  it('a different seed draws a different order (overwhelmingly likely)', () => {
    const a = sampleIndices(12, 8, seededRng(1))
    const b = sampleIndices(12, 8, seededRng(2))
    expect(a).not.toEqual(b)
  })

  it('throws when asked to draw more items than the pool holds', () => {
    expect(() => sampleIndices(4, 8, seededRng(1))).toThrow()
  })
})

describe('drawKeys', () => {
  it('never repeats the immediately preceding key', () => {
    const keys = drawKeys(50, seededRng(7))
    for (let i = 1; i < keys.length; i++) expect(keys[i].tonic).not.toBe(keys[i - 1].tonic)
  })

  it('is deterministic for a given seed', () => {
    expect(drawKeys(8, seededRng(3))).toEqual(drawKeys(8, seededRng(3)))
  })
})

describe('checkpoint item draws', () => {
  it('drawCP1Items draws 8 distinct, fully-diatonic two-chord items, deterministically for a seed', async () => {
    const data = await loadProgressionFrequency()
    const items = drawCP1Items(data, seededRng(11))
    expect(items).toHaveLength(CHECKPOINT_ITEM_COUNT)
    expect(items).toEqual(drawCP1Items(data, seededRng(11)))
    const ranks = items.map((i) => i.rank)
    expect(new Set(ranks).size).toBe(items.length)
    for (const item of items) {
      expect(item.mode).toBe('major')
      for (const numeral of item.numerals) expect(numeral in NUMERAL_DEGREE).toBe(true)
    }
  })

  it('drawCP2Items draws 8 items whose graded (second) chord is always answerable with the seven chips', async () => {
    const data = await loadProgressionFrequency()
    const items = drawCP2Items(data, seededRng(11))
    expect(items).toHaveLength(CHECKPOINT_ITEM_COUNT)
    for (const item of items) {
      expect(item.mode).toBe('major')
      expect(item.numerals[1] in NUMERAL_DEGREE).toBe(true)
    }
  })

  it('drawCP3Items draws 8 items spanning both modes, each with a valid rank for its own mode', async () => {
    const data = await loadProgressionFrequency()
    const items = drawCP3Items(data, seededRng(11))
    expect(items).toHaveLength(CHECKPOINT_ITEM_COUNT)
    for (const item of items) {
      expect(['major', 'minor']).toContain(item.mode)
      expect(item.numerals).toHaveLength(4)
      expect(item.rank).toBeGreaterThanOrEqual(0)
      expect(item.rank).toBeLessThan(item.mode === 'major' ? 10 : 6)
    }
  })
})
