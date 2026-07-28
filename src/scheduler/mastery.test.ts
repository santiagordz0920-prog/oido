import { describe, expect, it } from 'vitest'
import { computeMastery, computePartitionedMastery, type MasteryAttempt } from './mastery'

const acc90 = { accuracy: 0.9, minItems: 4 }
const withRT = { accuracy: 0.9, minItems: 4, maxMedianRT: 3000 }

function attempt(correct: boolean, latencyMs = 1000) {
  return { correct, latencyMs }
}

describe('computeMastery', () => {
  it('is not mastered before the window fills', () => {
    const result = computeMastery([attempt(true), attempt(true)], acc90)
    expect(result.mastered).toBe(false)
    expect(result.windowSize).toBe(2)
  })

  it('masters once accuracy clears the bar with a full window and no RT criterion', () => {
    const result = computeMastery([attempt(true), attempt(true), attempt(true), attempt(true)], acc90)
    expect(result.mastered).toBe(true)
    expect(result.accuracy).toBe(1)
  })

  it('falls short when accuracy misses the bar', () => {
    const result = computeMastery([attempt(true), attempt(true), attempt(true), attempt(false)], acc90)
    expect(result.accuracy).toBe(0.75)
    expect(result.mastered).toBe(false)
  })

  it('withholds mastery when accuracy clears but the median RT criterion fails', () => {
    const window = [attempt(true, 5000), attempt(true, 4000), attempt(true, 3500), attempt(true, 3200)]
    const result = computeMastery(window, withRT)
    expect(result.accuracy).toBe(1)
    expect(result.mastered).toBe(false)
  })

  it('masters when both accuracy and median RT clear their bars', () => {
    const window = [attempt(true, 2000), attempt(true, 2500), attempt(true, 1000), attempt(true, 1500)]
    const result = computeMastery(window, withRT)
    expect(result.mastered).toBe(true)
  })

  it('takes the median as the middle value for an odd window', () => {
    const criteria = { accuracy: 0, minItems: 3, maxMedianRT: 500 }
    const onTarget = computeMastery([attempt(true, 100), attempt(true, 900), attempt(true, 500)], criteria)
    expect(onTarget.mastered).toBe(true) // median 500 <= 500
    const overTarget = computeMastery([attempt(true, 100), attempt(true, 900), attempt(true, 501)], criteria)
    expect(overTarget.mastered).toBe(false) // median 501 > 500
  })

  it('only considers the first minItems attempts of the (most-recent-first) window', () => {
    const recent = [attempt(true, 100), attempt(true, 100), attempt(true, 100), attempt(true, 100), attempt(false, 9999)]
    const result = computeMastery(recent, withRT)
    expect(result.windowSize).toBe(4)
    expect(result.accuracy).toBe(1)
    expect(result.mastered).toBe(true)
  })
})

describe('computePartitionedMastery', () => {
  const sets = ['a', 'b', 'c', 'd']
  const full = (correct: number, total = 4): MasteryAttempt[] =>
    Array.from({ length: total }, (_, i) => attempt(i < correct))

  function byPartition(perSet: Record<string, MasteryAttempt[]>) {
    return new Map(Object.entries(perSet))
  }

  it('masters only when every partition clears the bar on its own', () => {
    const all = byPartition({ a: full(4), b: full(4), c: full(4), d: full(4) })
    expect(computePartitionedMastery(all, sets, acc90).mastered).toBe(true)
  })

  // The reason F2 is partitioned at all: without this, three fluent string
  // sets carry a fourth the player never touches over the line, leaving a
  // quarter of the fretboard unlearned behind a passing grade.
  it('refuses to let strong partitions carry a weak one', () => {
    const uneven = byPartition({ a: full(4), b: full(4), c: full(4), d: full(1) })
    const result = computePartitionedMastery(uneven, sets, acc90)
    expect(result.mastered).toBe(false)
    expect(result.accuracy).toBe(0.25)
  })

  it('refuses when a partition has no attempts at all', () => {
    const missing = byPartition({ a: full(4), b: full(4), c: full(4) })
    const result = computePartitionedMastery(missing, sets, acc90)
    expect(result.mastered).toBe(false)
    expect(result.windowSize).toBe(0)
  })

  it('reports the weakest partition, so progress cannot be bought elsewhere', () => {
    const uneven = byPartition({ a: full(4), b: full(4), c: full(3), d: full(2) })
    const result = computePartitionedMastery(uneven, sets, acc90)
    expect(result.accuracy).toBe(0.5)
    expect(result.windowSize).toBe(4)
  })

  it('is not mastered when there are no partitions to check', () => {
    expect(computePartitionedMastery(new Map(), [], acc90).mastered).toBe(false)
  })
})
