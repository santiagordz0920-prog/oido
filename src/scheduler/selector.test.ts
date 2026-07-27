import { describe, expect, it } from 'vitest'
import { State } from 'ts-fsrs'
import { newCardRow, type CardRow } from './cards'
import { selectNextCard } from './selector'

const NOW = new Date('2026-07-27T12:00:00Z')

function card(nodeId: string, context: string, opts: Partial<CardRow> = {}): CardRow {
  return { ...newCardRow(nodeId, context, NOW), ...opts }
}

function dueCard(nodeId: string, context: string, minutesAgo: number): CardRow {
  return card(nodeId, context, { state: 2, due: NOW.getTime() - minutesAgo * 60_000 })
}

describe('selectNextCard', () => {
  it('serves the earliest-due review first', () => {
    const eligible = [dueCard('E1', 'C', 5), dueCard('E1', 'G', 60), card('E1', 'D')]
    const s = selectNextCard(eligible, [], [], NOW)
    expect(s?.card.context).toBe('G')
  })

  it('introduces new cards when nothing is due', () => {
    const eligible = [card('E1', 'C'), card('E1', 'G', { state: 2, due: NOW.getTime() + 86_400_000 })]
    const s = selectNextCard(eligible, [], [], NOW, () => 0)
    expect(s?.card.context).toBe('C')
  })

  it('never serves a third consecutive item from the same node', () => {
    const eligible = [dueCard('E1', 'C', 10), dueCard('E1', 'G', 60)]
    const fallback = [dueCard('T2', 'q1', 1)]
    const s = selectNextCard(eligible, fallback, ['E1', 'E1'], NOW)
    expect(s?.card.nodeId).toBe('T2')
    expect(s?.fromFallback).toBe(true)
  })

  it('stays within the eligible set while the constraint holds', () => {
    const eligible = [dueCard('E1', 'C', 10)]
    const fallback = [dueCard('T2', 'q1', 1)]
    const s = selectNextCard(eligible, fallback, ['T2', 'E1'], NOW)
    expect(s?.card.nodeId).toBe('E1')
    expect(s?.fromFallback).toBe(false)
  })

  it('degrades to a repeat rather than stalling when only one node exists', () => {
    const eligible = [dueCard('E1', 'C', 10)]
    const s = selectNextCard(eligible, [], ['E1', 'E1'], NOW)
    expect(s?.card.nodeId).toBe('E1')
  })

  it('returns null when there are no cards at all', () => {
    expect(selectNextCard([], [], [], NOW)).toBeNull()
  })
})

describe('new material is introduced across nodes, not in creation order', () => {
  it('does not treat never-reviewed cards as overdue reviews', () => {
    // Fresh cards are created already due. If they counted as reviews, the
    // earliest-created card would always win and a new install would serve
    // one node's cards for a whole session.
    const now = new Date('2026-01-01T12:00:00Z')
    const fresh = ['T1', 'T2', 'E0', 'E5', 'F0', 'P0'].map((nodeId, i) => ({
      ...newCardRow(nodeId, 'C', new Date(now.getTime() - (10 - i) * 1000)),
    }))
    const seen = new Set<string>()
    for (let i = 0; i < 60; i++) {
      const pick = selectNextCard(fresh, [], [], now)
      if (pick) seen.add(pick.card.nodeId)
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  it('still prefers a genuinely overdue review over new material', () => {
    const now = new Date('2026-01-01T12:00:00Z')
    const overdue = {
      ...newCardRow('E1', 'C', now),
      due: now.getTime() - 86_400_000,
      state: State.Review,
    }
    const fresh = newCardRow('F0', 'C', now)
    for (let i = 0; i < 10; i++) {
      expect(selectNextCard([overdue, fresh], [], [], now)?.card.nodeId).toBe('E1')
    }
  })
})
