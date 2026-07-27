// Adaptive difficulty per docs/architecture.md §10.2: a per-user, per-skill-node
// Elo rating against per-item difficulty ratings. Items are selected so the
// expected success probability sits near TARGET_SUCCESS.

export const K = 24
export const TARGET_SUCCESS = 0.85
export const INITIAL_USER_RATING = 1200

// Probability that the user beats the item.
export function expectedSuccess(userRating: number, itemRating: number): number {
  return 1 / (1 + 10 ** ((itemRating - userRating) / 400))
}

// The item difficulty at which expected success equals TARGET_SUCCESS.
export function targetItemRating(userRating: number, target = TARGET_SUCCESS): number {
  return userRating + 400 * Math.log10(1 / target - 1)
}

export type EloUpdate = {
  userRating: number
  itemRating: number
}

// Zero-sum update: the user gains what the item loses.
export function updateElo(userRating: number, itemRating: number, correct: boolean): EloUpdate {
  const p = expectedSuccess(userRating, itemRating)
  const delta = K * ((correct ? 1 : 0) - p)
  return { userRating: userRating + delta, itemRating: itemRating - delta }
}

// Pick the candidate whose difficulty is closest to the target for this user.
// A small random jitter breaks ties so drills do not fixate on one item.
export function pickByDifficulty<T>(
  candidates: T[],
  ratingOf: (c: T) => number,
  userRating: number,
  random: () => number = Math.random,
): T {
  if (candidates.length === 0) throw new Error('pickByDifficulty: no candidates')
  const target = targetItemRating(userRating)
  let best = candidates[0]
  let bestScore = Infinity
  for (const c of candidates) {
    const score = Math.abs(ratingOf(c) - target) + random() * 40
    if (score < bestScore) {
      bestScore = score
      best = c
    }
  }
  return best
}
