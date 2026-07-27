import { describe, expect, it } from 'vitest'
import { KEYS } from '../theory/keys'
import { contextsForNode, ITEMS } from './items'

describe('drill items', () => {
  it('has no id collisions across the whole item bank', () => {
    const ids = ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  for (const nodeId of ['E0', 'E2', 'E3']) {
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
})
