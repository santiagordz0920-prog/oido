// The full skill graph from docs/curriculum.md. Gating follows the theory
// table's "Unlocks" column: a node is available once any of its unlockedBy
// theory lessons is complete (nodes with none are available from the start).
// Intra-track order is drawn in the constellation but does not gate, because
// access to ear/fretboard/production stages is earned through theory.

import { DEVICE_GRANTS } from './devices'

export type Track = 'T' | 'E' | 'F' | 'P'

export type MasteryCriteria = {
  accuracy: number // 0..1
  minItems: number
  maxMedianRT?: number // ms
}

export type SkillNode = {
  id: string
  track: Track
  index: number // position within its track
  prerequisites: string[] // theory lessons that unlock this node (any one suffices)
  unlocks: string[]
  masteryCriteria: MasteryCriteria
  corpusDevices: string[] // Phase 2
  hasContent: boolean // built in the current phase set
}

// [id, unlocks, hasContent]
type Row = [string, string[], boolean?]

const T_ROWS: Row[] = [
  ['T1', ['E0']],
  ['T2', ['E1'], true],
  ['T3', ['E2']],
  ['T4', ['E3']],
  ['T5', ['E4']],
  ['T6', ['E5', 'F2']],
  ['T7', ['E6']],
  ['T8', ['E6', 'E7']],
  ['T9', ['E7']],
  ['T10', ['E5', 'F3']],
  ['T11', ['F4', 'F6']],
  ['T12', ['E11', 'F2']],
  ['T13', ['E10']],
  ['T14', ['E10']],
  ['T15', ['E12']],
  ['T16', ['E13']],
  ['T17', []],
  ['T18', []],
  ['T19', []],
]

const E_COUNT = 15 // E0..E14
const F_COUNT = 7 // F0..F6
const P_COUNT = 6 // P0..P5

// Mastery criteria per docs/curriculum.md §6–7. Theory lessons use the
// check-question retention criterion; production stages are graded in
// later phases and carry a placeholder criterion until then.
const CRITERIA: Record<string, MasteryCriteria> = {
  E0: { accuracy: 0.9, minItems: 30 },
  E1: { accuracy: 0.9, minItems: 30 },
  E2: { accuracy: 0.9, minItems: 30 },
  E3: { accuracy: 0.88, minItems: 30, maxMedianRT: 3000 },
  E4: { accuracy: 0.88, minItems: 30 },
  E5: { accuracy: 0.9, minItems: 30 },
  E6: { accuracy: 0.88, minItems: 30 },
  E7: { accuracy: 0.88, minItems: 30 },
  E8: { accuracy: 0.85, minItems: 30 },
  E9: { accuracy: 0.85, minItems: 30 },
  E10: { accuracy: 0.85, minItems: 30 },
  E11: { accuracy: 0.85, minItems: 30 },
  E12: { accuracy: 0.85, minItems: 30 },
  E13: { accuracy: 0.8, minItems: 30 },
  E14: { accuracy: 0.8, minItems: 30 },
  F0: { accuracy: 0.9, minItems: 24, maxMedianRT: 8000 },
  F1: { accuracy: 0.9, minItems: 30 },
  F2: { accuracy: 0.9, minItems: 30 },
  F3: { accuracy: 0.88, minItems: 30 },
  F4: { accuracy: 0.85, minItems: 20 },
  F5: { accuracy: 0.85, minItems: 30 },
  F6: { accuracy: 0.85, minItems: 30 },
}

const THEORY_CRITERIA: MasteryCriteria = { accuracy: 0.9, minItems: 8 }
const PRODUCTION_CRITERIA: MasteryCriteria = { accuracy: 0.85, minItems: 20 }

function buildNodes(): Map<string, SkillNode> {
  const nodes = new Map<string, SkillNode>()

  T_ROWS.forEach(([id, unlocks, hasContent], index) => {
    nodes.set(id, {
      id,
      track: 'T',
      index,
      prerequisites: index === 0 ? [] : [T_ROWS[index - 1][0]],
      unlocks: [...unlocks],
      masteryCriteria: THEORY_CRITERIA,
      corpusDevices: DEVICE_GRANTS[id] ?? [],
      hasContent: hasContent ?? false,
    })
  })

  const addTrack = (track: Track, count: number, hasContent: (id: string) => boolean) => {
    for (let i = 0; i < count; i++) {
      const id = `${track}${i}`
      nodes.set(id, {
        id,
        track,
        index: i,
        prerequisites: [],
        unlocks: [],
        masteryCriteria: CRITERIA[id] ?? (track === 'P' ? PRODUCTION_CRITERIA : THEORY_CRITERIA),
        corpusDevices: DEVICE_GRANTS[id] ?? [],
        hasContent: hasContent(id),
      })
    }
  }

  addTrack('E', E_COUNT, (id) => id === 'E1')
  addTrack('F', F_COUNT, () => false)
  addTrack('P', P_COUNT, () => false)

  // Invert the theory unlock edges into prerequisites.
  for (const tNode of T_ROWS.map(([id]) => nodes.get(id)!)) {
    for (const target of tNode.unlocks) {
      nodes.get(target)?.prerequisites.push(tNode.id)
    }
  }

  return nodes
}

export const NODES: Map<string, SkillNode> = buildNodes()
export const ALL_NODES: SkillNode[] = [...NODES.values()]
export const TRACKS: Track[] = ['T', 'E', 'F', 'P']

export function node(id: string): SkillNode {
  const n = NODES.get(id)
  if (!n) throw new Error(`Unknown skill node: ${id}`)
  return n
}

// A node is available when every gate is open. Theory gates on the previous
// lesson; drill tracks gate on any one of the theory lessons that unlock them.
// Two exceptions keep the graph honest while content is still being built:
// a completed node is always available (its reviews stay live), and a theory
// lesson that has no content yet cannot gate the sequence.
export function isAvailable(id: string, completed: (nodeId: string) => boolean): boolean {
  const n = node(id)
  if (completed(id)) return true
  const gates = n.track === 'T' ? n.prerequisites.filter((p) => node(p).hasContent) : n.prerequisites
  if (gates.length === 0) return true
  return n.track === 'T' ? gates.every(completed) : gates.some(completed)
}
