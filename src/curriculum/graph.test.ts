import { describe, expect, it } from 'vitest'
import { ALL_NODES, isAvailable, node } from './graph'

const nothing = () => false
const only = (...ids: string[]) => (id: string) => ids.includes(id)

describe('skill graph', () => {
  it('covers every node in the curriculum tables', () => {
    expect(ALL_NODES.filter((n) => n.track === 'T')).toHaveLength(19)
    expect(ALL_NODES.filter((n) => n.track === 'E')).toHaveLength(15)
    expect(ALL_NODES.filter((n) => n.track === 'F')).toHaveLength(7)
    expect(ALL_NODES.filter((n) => n.track === 'P')).toHaveLength(6)
  })

  it('inverts the unlock table into prerequisites', () => {
    expect(node('E1').prerequisites).toContain('T2')
    expect(node('F2').prerequisites).toEqual(expect.arrayContaining(['T6', 'T12']))
    expect(node('E6').prerequisites).toEqual(expect.arrayContaining(['T7', 'T8']))
  })

  it('does not let unbuilt theory lessons gate the sequence', () => {
    // T1 has no content, so T2 must be reachable from a fresh install.
    expect(isAvailable('T2', nothing)).toBe(true)
  })

  it('gates drills on the theory that unlocks them', () => {
    expect(isAvailable('E1', nothing)).toBe(false)
    expect(isAvailable('E1', only('T2'))).toBe(true)
    // Any one of the unlocking lessons suffices.
    expect(isAvailable('E5', only('T6'))).toBe(true)
    expect(isAvailable('E5', only('T10'))).toBe(true)
  })

  it('keeps a completed node available regardless of its gates', () => {
    expect(isAvailable('T2', only('T2'))).toBe(true)
  })
})
