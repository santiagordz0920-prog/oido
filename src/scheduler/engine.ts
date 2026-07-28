import { db, type AttemptRow, type NodeStatRow } from '../db'
import { ALL_NODES, isAvailable, node, type Track } from '../curriculum/graph'
import { INITIAL_USER_RATING, pickByDifficulty, updateElo } from './elo'
import { cardId, newCardRow, reviewCard, type CardRow } from './cards'
import { contextsForNode, f2StringSetOf, itemsForCard, type DrillItem } from './items'
import { selectNextCard } from './selector'
import { computeMastery, computePartitionedMastery } from './mastery'
import { F2_STRING_SETS, stringSetId } from '../lib/triads'

// The scheduler's imperative shell: everything here reads and writes Dexie,
// while the decisions live in the pure modules (selector, elo, cards).

export type NextItem = {
  card: CardRow
  item: DrillItem
  fromFallback: boolean
}

async function nodeStat(nodeId: string): Promise<NodeStatRow> {
  const existing = await db.nodeStats.get(nodeId)
  if (existing) return existing
  const fresh: NodeStatRow = { nodeId, rating: INITIAL_USER_RATING, attempts: 0, correct: 0 }
  await db.nodeStats.put(fresh)
  return fresh
}

async function isCompleted(nodeId: string): Promise<boolean> {
  const stat = await db.nodeStats.get(nodeId)
  return stat?.completedAt !== undefined
}

// Create the card rows for every context of a node, if missing.
export async function ensureCards(nodeId: string): Promise<void> {
  const contexts = contextsForNode(nodeId)
  const rows: CardRow[] = []
  for (const context of contexts) {
    const existing = await db.cards.get(cardId(nodeId, context))
    if (!existing) rows.push(newCardRow(nodeId, context))
  }
  if (rows.length > 0) await db.cards.bulkAdd(rows)
}

// Mark a theory lesson complete and open what it unlocks.
export async function completeLesson(nodeId: string): Promise<void> {
  const stat = await nodeStat(nodeId)
  if (stat.completedAt === undefined) {
    await db.nodeStats.put({ ...stat, completedAt: Date.now() })
  }
  await ensureCards(nodeId)
  for (const unlocked of node(nodeId).unlocks) {
    if (node(unlocked).hasContent) await ensureCards(unlocked)
  }
}

// Mark a stage checkpoint (CP1/CP2/CP3, src/curriculum/checkpoints.ts) as
// passed. Mirrors completeLesson but without card creation — checkpoints are
// timed corpus challenges, not FSRS items, and are not registered in the
// node graph at all, so there is nothing to unlock cards for. Recording
// completion this way (a db.nodeStats row keyed by the checkpoint id) is
// what lets isAvailable's CHECKPOINT_GATES check and useNodeCompleted work
// unchanged for checkpoint ids.
export async function completeCheckpoint(checkpointId: string): Promise<void> {
  const stat = await nodeStat(checkpointId)
  if (stat.completedAt === undefined) {
    await db.nodeStats.put({ ...stat, completedAt: Date.now() })
  }
}

// Nodes that can serve items right now: content built and gate open.
export async function activeNodeIds(): Promise<string[]> {
  const completed = new Map<string, boolean>()
  for (const n of ALL_NODES) {
    if (n.track === 'T') completed.set(n.id, await isCompleted(n.id))
  }
  return ALL_NODES.filter((n) => n.hasContent && isAvailable(n.id, (id) => completed.get(id) ?? false)).map(
    (n) => n.id,
  )
}

// Select the next card and item for a session block restricted to `tracks`.
// Other active tracks serve as the interleaving fallback (§10.3).
export async function nextItem(tracks: Track[], recentNodeIds: string[]): Promise<NextItem | null> {
  const active = await activeNodeIds()
  for (const id of active) await ensureCards(id)

  const eligibleIds = active.filter((id) => tracks.includes(node(id).track))
  const fallbackIds = active.filter((id) => !tracks.includes(node(id).track))
  const eligible = await db.cards.where('nodeId').anyOf(eligibleIds).toArray()
  const fallback = await db.cards.where('nodeId').anyOf(fallbackIds).toArray()

  const selection = selectNextCard(eligible, fallback, recentNodeIds)
  if (!selection) return null

  const { card } = selection
  const candidates = itemsForCard(card.nodeId, card.context)
  if (candidates.length === 0) return null

  const stat = await nodeStat(card.nodeId)
  const ratings = new Map<string, number>()
  for (const c of candidates) {
    const itemStat = await db.itemStats.get(c.id)
    ratings.set(c.id, itemStat?.rating ?? c.seedRating)
  }
  const item = pickByDifficulty(candidates, (c) => ratings.get(c.id)!, stat.rating)
  return { card, item, fromFallback: selection.fromFallback }
}

export type AttemptInput = {
  item: DrillItem
  correct: boolean
  latencyMs: number
  inputMode: AttemptRow['inputMode']
  response: string
}

// One attempt updates all three systems: the attempt log (mastery criteria),
// the FSRS card (when to see this context again), and Elo (which item within
// the context to serve).
export async function recordAttempt({ item, correct, latencyMs, inputMode, response }: AttemptInput): Promise<void> {
  const now = Date.now()
  await db.attempts.add({ itemId: item.id, nodeId: item.nodeId, ts: now, correct, latencyMs, inputMode, response })

  const row = (await db.cards.get(cardId(item.nodeId, item.context))) ?? newCardRow(item.nodeId, item.context)
  await db.cards.put(reviewCard(row, correct))

  const stat = await nodeStat(item.nodeId)
  const itemStat = (await db.itemStats.get(item.id)) ?? {
    itemId: item.id,
    nodeId: item.nodeId,
    rating: item.seedRating,
    attempts: 0,
  }
  const { userRating, itemRating } = updateElo(stat.rating, itemStat.rating, correct)
  await db.nodeStats.put({
    ...stat,
    rating: userRating,
    attempts: stat.attempts + 1,
    correct: stat.correct + (correct ? 1 : 0),
  })
  await db.itemStats.put({ ...itemStat, rating: itemRating, attempts: itemStat.attempts + 1 })
}

// F2 is the one node whose criterion is per string set rather than overall
// (docs/curriculum.md §7). Attempts carry the string set in their item id,
// so the partition is read back from there rather than stored twice.
function f2Mastery(recent: AttemptRow[]) {
  const byStringSet = new Map<string, AttemptRow[]>()
  for (const attempt of recent) {
    const set = f2StringSetOf(attempt.itemId)
    if (set === null) continue
    const list = byStringSet.get(set)
    if (list) list.push(attempt)
    else byStringSet.set(set, [attempt])
  }
  return computePartitionedMastery(byStringSet, F2_STRING_SETS.map(stringSetId), node('F2').masteryCriteria)
}

export type Mastery = {
  progress: number // 0..1, sizes the constellation node
  mastered: boolean
  accuracy: number // over the criterion window
  windowSize: number
}

// Mastery against the node's criterion: accuracy (and, where the criterion
// sets maxMedianRT, median response time) over the last minItems attempts,
// only meaningful once the window is full. The arithmetic lives in
// computeMastery (mastery.ts) so it is unit-testable without Dexie.
export async function masteryOf(nodeId: string): Promise<Mastery> {
  const { masteryCriteria: c, track } = node(nodeId)
  const recent = await db.attempts.where('nodeId').equals(nodeId).reverse().sortBy('ts')
  const { accuracy, windowSize, mastered: retained } =
    nodeId === 'F2' ? f2Mastery(recent) : computeMastery(recent, c)
  if (track === 'T') {
    const completed = await isCompleted(nodeId)
    return {
      progress: completed ? (retained ? 1 : 0.6) : 0,
      mastered: completed && retained,
      accuracy,
      windowSize,
    }
  }
  const fill = windowSize / c.minItems
  return { progress: Math.min(1, fill) * accuracy, mastered: retained, accuracy, windowSize }
}

export async function dueCount(now: Date = new Date()): Promise<number> {
  return db.cards.where('due').belowOrEqual(now.getTime()).count()
}
