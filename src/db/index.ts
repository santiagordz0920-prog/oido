import Dexie, { type EntityTable } from 'dexie'
import type { CardRow } from '../scheduler/cards'

// Local-first persistence over IndexedDB (verified against dexie@4.4.4).
// Everything the scheduler knows lives here; there is no server.

export type AttemptRow = {
  id?: number
  itemId: string
  nodeId: string
  ts: number
  correct: boolean
  latencyMs: number
  inputMode: 'tap' | 'sung' | 'played'
  response: string
}

export type NodeStatRow = {
  nodeId: string
  rating: number // user Elo for this node
  attempts: number
  correct: number
  completedAt?: number // lesson completion for T nodes; unlock gate
}

export type ItemStatRow = {
  itemId: string
  nodeId: string
  rating: number // item difficulty Elo
  attempts: number
}

export type SessionRow = {
  id?: number
  mode: 'deskside' | 'commute' | 'bench' | 'deep'
  startTs: number
  endTs?: number
  items: number
  correct: number
}

export const db = new Dexie('oido') as Dexie & {
  cards: EntityTable<CardRow, 'id'>
  attempts: EntityTable<AttemptRow, 'id'>
  nodeStats: EntityTable<NodeStatRow, 'nodeId'>
  itemStats: EntityTable<ItemStatRow, 'itemId'>
  sessions: EntityTable<SessionRow, 'id'>
}

db.version(1).stores({
  cards: 'id, nodeId, due',
  attempts: '++id, itemId, nodeId, ts',
  nodeStats: 'nodeId',
  itemStats: 'itemId',
  sessions: '++id, startTs',
})

// Phase 0 kept a single completion flag in localStorage via zustand/persist.
// Carry it into Dexie once so nobody loses their T2 unlock.
export async function migratePhase0(markComplete: (nodeId: string) => Promise<void>): Promise<void> {
  try {
    const raw = localStorage.getItem('oido-progress')
    if (!raw) return
    const parsed: unknown = JSON.parse(raw)
    const t2Complete =
      typeof parsed === 'object' && parsed !== null && 'state' in parsed
        ? Boolean((parsed as { state?: { t2Complete?: boolean } }).state?.t2Complete)
        : false
    if (t2Complete) {
      const existing = await db.nodeStats.get('T2')
      if (!existing?.completedAt) await markComplete('T2')
    }
    localStorage.removeItem('oido-progress')
  } catch {
    // A malformed legacy blob is not worth blocking startup over.
  }
}
