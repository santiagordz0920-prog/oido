import { describe, expect, it } from 'vitest'
import { expectedSuccess, K, pickByDifficulty, TARGET_SUCCESS, targetItemRating, updateElo } from './elo'

describe('elo', () => {
  it('expected success is 0.5 at equal ratings and rises with user advantage', () => {
    expect(expectedSuccess(1200, 1200)).toBeCloseTo(0.5)
    expect(expectedSuccess(1500, 1200)).toBeGreaterThan(0.8)
    expect(expectedSuccess(1200, 1500)).toBeLessThan(0.2)
  })

  it('target item rating yields the target success probability', () => {
    const d = targetItemRating(1200)
    expect(expectedSuccess(1200, d)).toBeCloseTo(TARGET_SUCCESS, 5)
    expect(d).toBeLessThan(1200) // easier than the user, by design
  })

  it('updates are zero-sum and bounded by K', () => {
    const { userRating, itemRating } = updateElo(1200, 1100, false)
    expect(userRating).toBeLessThan(1200)
    expect(itemRating).toBeGreaterThan(1100)
    expect(userRating - 1200).toBeCloseTo(-(itemRating - 1100))
    expect(Math.abs(userRating - 1200)).toBeLessThanOrEqual(K)
  })

  it('a win gains little against an easy item, a loss costs a lot', () => {
    const win = updateElo(1400, 1000, true)
    const loss = updateElo(1400, 1000, false)
    expect(win.userRating - 1400).toBeLessThan(3)
    expect(1400 - loss.userRating).toBeGreaterThan(20)
  })

  it('pickByDifficulty prefers the item nearest the target difficulty', () => {
    const items = [
      { id: 'easy', rating: 700 },
      { id: 'target', rating: targetItemRating(1200) },
      { id: 'hard', rating: 1600 },
    ]
    const picked = pickByDifficulty(items, (i) => i.rating, 1200, () => 0)
    expect(picked.id).toBe('target')
  })
})
