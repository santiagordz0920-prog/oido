import { describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import { gradeFor, isDue, isNew, newCardRow, reviewCard, toCard, toRow } from './cards'

const NOW = new Date('2026-07-27T12:00:00Z')

describe('fsrs cards', () => {
  it('round-trips between row and card', () => {
    const row = newCardRow('E1', 'C', NOW)
    expect(toRow('E1', 'C', toCard(row))).toEqual(row)
  })

  it('new cards are due immediately', () => {
    const row = newCardRow('E1', 'C', NOW)
    expect(isNew(row)).toBe(true)
    expect(isDue(row, NOW)).toBe(true)
  })

  it('a correct review pushes the due date into the future', () => {
    const row = reviewCard(newCardRow('E1', 'C', NOW), true, NOW)
    expect(row.due).toBeGreaterThan(NOW.getTime())
    expect(row.reps).toBe(1)
    expect(isNew(row)).toBe(false)
  })

  it('an incorrect review schedules sooner than a correct one', () => {
    const good = reviewCard(newCardRow('E1', 'C', NOW), true, NOW)
    const again = reviewCard(newCardRow('E1', 'C', NOW), false, NOW)
    expect(again.due).toBeLessThanOrEqual(good.due)
  })

  it('grades map correctness only', () => {
    expect(gradeFor(true)).toBe(Rating.Good)
    expect(gradeFor(false)).toBe(Rating.Again)
  })
})
