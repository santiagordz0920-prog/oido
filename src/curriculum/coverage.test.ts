import { describe, expect, it } from 'vitest'
import { computeCoverage, ungrantedDevices, unlockDeltas, type SongVocabulary } from './coverage'
import { grantedMatcher } from './devices'

const vocab: SongVocabulary = {
  source: 'test',
  license: 'test',
  generatedAt: '2026-01-01',
  deviceTaxonomy: ['q:maj', 'q:dom7', 'f:I', 'f:IV', 'f:V', 'f:V/V', 'f:borrowed:bVII', 'f:inversion', 'q:sus'],
  interned: true,
  songs: [
    {
      id: '0001',
      title: 'Diatonic song',
      artist: 'A',
      mode: 'major',
      devices: [0, 2, 3, 4],
      sections: [
        { label: 'verse', devices: [0, 2, 3] },
        { label: 'chorus', devices: [0, 2, 4] },
      ],
    },
    {
      id: '0002',
      title: 'Secondary dominant song',
      artist: 'B',
      mode: 'major',
      devices: [0, 1, 2, 4, 5],
      sections: [
        { label: 'verse', devices: [0, 2, 4] },
        { label: 'bridge', devices: [1, 5] },
      ],
    },
    {
      id: '0003',
      title: 'Sus song',
      artist: 'C',
      mode: 'major',
      devices: ['q:maj', 'f:I', 'q:sus'],
      sections: [{ label: 'verse', devices: ['q:maj', 'f:I', 'q:sus'] }],
    },
  ],
}

describe('grantedMatcher', () => {
  it('matches exact grants and wildcard prefixes', () => {
    const m = grantedMatcher(['E10'])
    expect(m('f:V/V')).toBe(true)
    expect(m('f:V/vi')).toBe(true)
    expect(m('f:borrowed:bVII')).toBe(true)
    expect(m('f:I')).toBe(false)
  })
})

describe('computeCoverage', () => {
  it('is conservative: every device must be granted', () => {
    const c = computeCoverage(vocab, ['E5', 'E6'])
    // Song 1: q:maj + diatonic → covered. Song 2 needs V/V. Song 3 needs q:sus.
    expect(c.coveredSongs).toBe(1)
    expect(c.songCount).toBe(3)
    expect(c.songPercent).toBeCloseTo(100 / 3)
  })

  it('counts sections independently, decoding interned and plain devices', () => {
    const c = computeCoverage(vocab, ['E5', 'E6'])
    // Covered sections: song1 verse+chorus, song2 verse. Not song2 bridge (V/V), not song3 verse (sus).
    expect(c.coveredSections).toBe(3)
    expect(c.sectionCount).toBe(5)
  })

  it('reports zero coverage with nothing mastered', () => {
    const c = computeCoverage(vocab, [])
    expect(c.coveredSongs).toBe(0)
    expect(c.coveredSections).toBe(0)
  })
})

describe('unlockDeltas', () => {
  it('ranks the node that unlocks the most songs first', () => {
    const deltas = unlockDeltas(vocab, ['E5', 'E6'])
    // Mastering E10 covers song 2 (+1); no other single node adds a song.
    expect(deltas[0].nodeId).toBe('E10')
    expect(deltas[0].songDelta).toBe(1)
    expect(deltas.find((d) => d.nodeId === 'E11')?.songDelta).toBe(0)
  })
})

describe('ungrantedDevices', () => {
  it('lists devices no node grants', () => {
    expect(ungrantedDevices(vocab)).toEqual(['q:sus'])
  })
})
