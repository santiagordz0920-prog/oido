import { describe, expect, it } from 'vitest'
import { ALL_NODES, CHECKPOINT_GATES, isAvailable, node } from './graph'

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
    // T13 has no content, so T14 must be reachable from a fresh install.
    expect(isAvailable('T14', nothing)).toBe(true)
  })

  it('gates T2 now that T1 is built', () => {
    expect(isAvailable('T2', nothing)).toBe(false)
    expect(isAvailable('T2', only('T1'))).toBe(true)
  })

  it('gates drills on the theory that unlocks them', () => {
    expect(isAvailable('E1', nothing)).toBe(false)
    expect(isAvailable('E1', only('T2'))).toBe(true)
    // E5 is unlocked by either T6 or T10; both now have content, so either
    // one gates it on its own.
    expect(isAvailable('E5', nothing)).toBe(false)
    expect(isAvailable('E5', only('T6'))).toBe(true)
    expect(isAvailable('E5', only('T10'))).toBe(true)
  })

  it('gates E0 now that T1 is built', () => {
    expect(isAvailable('E0', nothing)).toBe(false)
    expect(isAvailable('E0', only('T1'))).toBe(true)
  })

  it('does not let unbuilt theory lessons gate drills that have no built lesson yet', () => {
    // E10's unlocking lessons (T13, T14) have no content yet, so it must be
    // reachable from a fresh install.
    expect(isAvailable('E10', nothing)).toBe(true)
  })

  it('gates E2 and E3 now that their lessons (T3, T4) are built', () => {
    expect(isAvailable('E2', nothing)).toBe(false)
    expect(isAvailable('E2', only('T3'))).toBe(true)
    expect(isAvailable('E3', nothing)).toBe(false)
    expect(isAvailable('E3', only('T4'))).toBe(true)
  })

  it('gates E6 and E7 now that T8 and T9 are built', () => {
    // E6 is unlocked by either T7 or T8.
    expect(isAvailable('E6', nothing)).toBe(false)
    expect(isAvailable('E6', only('T8'))).toBe(true)
    // E7 is unlocked by either T8 or T9.
    expect(isAvailable('E7', nothing)).toBe(false)
    expect(isAvailable('E7', only('T9'))).toBe(true)
  })

  it('keeps a completed node available regardless of its gates', () => {
    expect(isAvailable('T2', only('T2'))).toBe(true)
  })

  it('checkpoint gates: T5 unavailable with T4 complete but CP1 not; available with both', () => {
    expect(CHECKPOINT_GATES.T5).toBe('CP1')
    expect(isAvailable('T5', only('T4'))).toBe(false)
    expect(isAvailable('T5', only('T4', 'CP1'))).toBe(true)
    // The checkpoint alone, without the prerequisite lesson, is not enough.
    expect(isAvailable('T5', only('CP1'))).toBe(false)
  })

  it('checkpoint gates: T8 unavailable with T7 complete but CP2 not; available with both', () => {
    expect(CHECKPOINT_GATES.T8).toBe('CP2')
    expect(isAvailable('T8', only('T7'))).toBe(false)
    expect(isAvailable('T8', only('T7', 'CP2'))).toBe(true)
    expect(isAvailable('T8', only('CP2'))).toBe(false)
  })

  it('a completed gated node stays available even without its checkpoint recorded', () => {
    expect(isAvailable('T5', only('T5'))).toBe(true)
  })
})
