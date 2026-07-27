import { KEYS } from '../theory/keys'
import { T2_CHECKS } from '../curriculum/t2Checks'

// Concrete drill items for the nodes that have content. An item's context
// names the FSRS card it belongs to; its seed rating positions it for Elo
// until real attempts move it.

export type ItemKind = 'recognition' | 'theory-check'

export type DrillItem = {
  id: string
  nodeId: string
  kind: ItemKind
  context: string // card context: key tonic for ear items, check id for theory
  params: Record<string, string | number>
  seedRating: number
}

const E1_DEGREE_SEEDS: Record<number, number> = { 1: 1000, 3: 1120, 5: 1180 }

function e1Items(): DrillItem[] {
  const items: DrillItem[] = []
  for (const key of KEYS) {
    for (const degree of [1, 3, 5]) {
      items.push({
        id: `E1|${key.tonic}|${degree}`,
        nodeId: 'E1',
        kind: 'recognition',
        context: key.tonic,
        params: { tonic: key.tonic, degree },
        seedRating: E1_DEGREE_SEEDS[degree],
      })
    }
  }
  return items
}

function t2Items(): DrillItem[] {
  return T2_CHECKS.map((check) => ({
    id: `T2|${check.id}`,
    nodeId: 'T2',
    kind: 'theory-check',
    context: check.id,
    params: { checkId: check.id },
    seedRating: 1000,
  }))
}

export const ITEMS: DrillItem[] = [...t2Items(), ...e1Items()]

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]))

export function item(id: string): DrillItem {
  const it = BY_ID.get(id)
  if (!it) throw new Error(`Unknown item: ${id}`)
  return it
}

export function itemsForCard(nodeId: string, context: string): DrillItem[] {
  return ITEMS.filter((i) => i.nodeId === nodeId && i.context === context)
}

export function contextsForNode(nodeId: string): string[] {
  return [...new Set(ITEMS.filter((i) => i.nodeId === nodeId).map((i) => i.context))]
}
