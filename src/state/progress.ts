import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

// Progress now lives in Dexie (Phase 1); these hooks are the React-facing
// read side. Writes go through src/scheduler/engine.ts.

export function useNodeCompleted(nodeId: string): boolean {
  return (
    useLiveQuery(async () => (await db.nodeStats.get(nodeId))?.completedAt !== undefined, [nodeId]) ?? false
  )
}

export function useDueCount(): number {
  return useLiveQuery(async () => db.cards.where('due').belowOrEqual(Date.now()).count(), []) ?? 0
}
