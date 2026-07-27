import { isDue, isNew, type CardRow } from './cards'

// Selection loop per docs/architecture.md §10.3. Pure: the engine hands in
// candidate cards and the recent node history, this decides which card is next.
//
// The interleaving rule is a hard constraint: never a third consecutive item
// from the same node. If the eligible set cannot satisfy it, pull a review
// card from an adjacent track (the fallback set) instead.

export type Selection = {
  card: CardRow
  fromFallback: boolean
}

function bannedNode(recentNodeIds: string[]): string | null {
  const n = recentNodeIds.length
  return n >= 2 && recentNodeIds[n - 1] === recentNodeIds[n - 2] ? recentNodeIds[n - 1] : null
}

// Priority within a pool: due reviews first (earliest due — weakest first),
// then unseen cards (introduce new material), then the earliest-due card as
// an extra review so a session never runs dry.
//
// A never-reviewed card is created already due, so it has to be excluded
// from the review pool explicitly. Without that, every fresh card counts as
// an overdue review and the earliest-created one always wins, which on a new
// install serves one node's cards in creation order — theory checks for a
// whole session — instead of mixing tracks the way new material should be
// introduced.
function best(pool: CardRow[], now: Date, random: () => number): CardRow | null {
  if (pool.length === 0) return null
  const due = pool.filter((c) => !isNew(c) && isDue(c, now))
  if (due.length > 0) return due.reduce((a, b) => (a.due <= b.due ? a : b))
  const fresh = pool.filter(isNew)
  if (fresh.length > 0) return fresh[Math.floor(random() * fresh.length)]
  return pool.reduce((a, b) => (a.due <= b.due ? a : b))
}

export function selectNextCard(
  eligible: CardRow[],
  fallback: CardRow[],
  recentNodeIds: string[],
  now: Date = new Date(),
  random: () => number = Math.random,
): Selection | null {
  const banned = bannedNode(recentNodeIds)

  const allowedEligible = banned ? eligible.filter((c) => c.nodeId !== banned) : eligible
  const fromEligible = best(allowedEligible, now, random)
  if (fromEligible) return { card: fromEligible, fromFallback: false }

  const allowedFallback = banned ? fallback.filter((c) => c.nodeId !== banned) : fallback
  const fromFallback = best(allowedFallback, now, random)
  if (fromFallback) return { card: fromFallback, fromFallback: true }

  // Nothing satisfies the constraint anywhere: keep the session moving rather
  // than stalling, which can only happen while a single node has content.
  const anything = best(eligible, now, random) ?? best(fallback, now, random)
  return anything ? { card: anything, fromFallback: false } : null
}
