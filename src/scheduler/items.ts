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

// E0: tonic retention. The probe is degree 1 ("yes") against five distractors
// ("no") at three growing silence tiers (docs/curriculum.md §6). Seed ratings
// rise with the gap — a longer silence is a harder retention test — and with
// how confusable a distractor is with the tonic: the fifth, the tonic's
// closest harmonic relative, is seeded hardest; the second, harmonically
// furthest, is seeded easiest.
const E0_DISTRACTOR_DEGREES = [2, 3, 5, 6, 7]
const E0_GAP_SECONDS = [2, 4, 8]
const E0_GAP_BASE: Record<number, number> = { 2: 1000, 4: 1100, 8: 1200 }
const E0_DISTRACTOR_OFFSET: Record<number, number> = { 2: 0, 7: 20, 6: 40, 3: 60, 5: 80 }

function e0Items(): DrillItem[] {
  const items: DrillItem[] = []
  for (const key of KEYS) {
    for (const gapSeconds of E0_GAP_SECONDS) {
      const base = E0_GAP_BASE[gapSeconds]
      // Degree 1 is the only "yes" answer against five "no" distractors, so
      // it is generated at double weight to keep yes-items near half the
      // pool per key context instead of one-in-six (§6: "~half the pool").
      for (let copy = 0; copy < 2; copy++) {
        items.push({
          id: `E0|${key.tonic}|1|${gapSeconds}|${copy}`,
          nodeId: 'E0',
          kind: 'recognition',
          context: key.tonic,
          params: { tonic: key.tonic, degree: 1, gapSeconds },
          seedRating: base,
        })
      }
      for (const degree of E0_DISTRACTOR_DEGREES) {
        items.push({
          id: `E0|${key.tonic}|${degree}|${gapSeconds}`,
          nodeId: 'E0',
          kind: 'recognition',
          context: key.tonic,
          params: { tonic: key.tonic, degree, gapSeconds },
          seedRating: base + E0_DISTRACTOR_OFFSET[degree],
        })
      }
    }
  }
  return items
}

// E2: active degrees by tendency, default gapSeconds. Seed ratings tier
// gently by how far the resolution reaches: 2→1 and 7→8 are one step,
// 4→3 and 6→5 read the same way, so all four start close together and let
// real attempts (Elo) do the rest.
const E2_DEGREE_SEEDS: Record<number, number> = { 2: 1000, 7: 1020, 4: 1040, 6: 1060 }

function e2Items(): DrillItem[] {
  const items: DrillItem[] = []
  for (const key of KEYS) {
    for (const degree of [2, 4, 6, 7]) {
      items.push({
        id: `E2|${key.tonic}|${degree}`,
        nodeId: 'E2',
        kind: 'recognition',
        context: key.tonic,
        params: { tonic: key.tonic, degree },
        seedRating: E2_DEGREE_SEEDS[degree],
      })
    }
  }
  return items
}

// E3: the full major scale, interleaved. Every degree starts at the same
// seed; the response-time mastery gate (maxMedianRT, §6) is what makes this
// node harder than E1/E2, not per-degree difficulty.
function e3Items(): DrillItem[] {
  const items: DrillItem[] = []
  for (const key of KEYS) {
    for (let degree = 1; degree <= 7; degree++) {
      items.push({
        id: `E3|${key.tonic}|${degree}`,
        nodeId: 'E3',
        kind: 'recognition',
        context: key.tonic,
        params: { tonic: key.tonic, degree },
        seedRating: 1000,
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

export const ITEMS: DrillItem[] = [...t2Items(), ...e0Items(), ...e1Items(), ...e2Items(), ...e3Items()]

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
