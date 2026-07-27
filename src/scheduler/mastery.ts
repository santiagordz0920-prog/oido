import type { MasteryCriteria } from '../curriculum/graph'

// Pure mastery arithmetic, split out of engine.ts's masteryOf so the rules
// are unit-testable without touching Dexie. masteryOf supplies the
// most-recent-first attempt window; this module only does the arithmetic.

export type MasteryAttempt = {
  correct: boolean
  latencyMs: number
}

export type MasteryComputation = {
  accuracy: number // 0..1 over the window
  windowSize: number
  mastered: boolean
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

// `recentAttempts` must already be ordered most-recent-first; only the first
// minItems attempts form the mastery window. A criterion with maxMedianRT
// (E3, F0) adds a response-time gate on top of the accuracy gate — both must
// clear for the node to be mastered.
export function computeMastery(recentAttempts: MasteryAttempt[], criteria: MasteryCriteria): MasteryComputation {
  const window = recentAttempts.slice(0, criteria.minItems)
  const accuracy = window.length > 0 ? window.filter((a) => a.correct).length / window.length : 0
  const windowFull = window.length >= criteria.minItems
  const meetsRT =
    criteria.maxMedianRT === undefined || median(window.map((a) => a.latencyMs)) <= criteria.maxMedianRT
  return {
    accuracy,
    windowSize: window.length,
    mastered: windowFull && accuracy >= criteria.accuracy && meetsRT,
  }
}
