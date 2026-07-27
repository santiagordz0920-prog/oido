import { DEVICE_GRANTS, GRANTING_NODES, grantedMatcher } from './devices'

// Corpus Coverage (§4.2): the percentage of corpus songs whose ENTIRE
// harmonic vocabulary is granted by mastered nodes. Conservative by design.
// The per-section figure exists for calibration (open question 2): early on,
// whole-song coverage can sit near zero while many verses and choruses are
// already fully hearable, and the section figure says so honestly.

export type SongVocabulary = {
  source: string
  license: string
  generatedAt: string
  deviceTaxonomy: string[]
  interned?: boolean
  songs: SongEntry[]
}

export type SongEntry = {
  id: string
  title: string
  artist: string
  mode: 'major' | 'minor'
  devices: Array<string | number>
  sections: { label: string; devices: Array<string | number> }[]
}

export type Coverage = {
  songCount: number
  coveredSongs: number
  songPercent: number // 0..100
  sectionCount: number
  coveredSections: number
  sectionPercent: number // 0..100
}

export type UnlockDelta = {
  nodeId: string
  songDelta: number // additional songs covered if this node were mastered
  songPercentDelta: number
  sectionPercentDelta: number
}

function decode(devices: Array<string | number>, taxonomy: string[]): string[] {
  return devices.map((d) => (typeof d === 'number' ? taxonomy[d] : d))
}

export function songDevices(song: SongEntry, vocab: SongVocabulary): string[] {
  return decode(song.devices, vocab.deviceTaxonomy)
}

export function computeCoverage(vocab: SongVocabulary, masteredNodeIds: Iterable<string>): Coverage {
  const granted = grantedMatcher(masteredNodeIds)
  let coveredSongs = 0
  let sectionCount = 0
  let coveredSections = 0
  for (const song of vocab.songs) {
    if (songDevices(song, vocab).every(granted)) coveredSongs++
    for (const section of song.sections) {
      sectionCount++
      if (decode(section.devices, vocab.deviceTaxonomy).every(granted)) coveredSections++
    }
  }
  const songCount = vocab.songs.length
  return {
    songCount,
    coveredSongs,
    songPercent: songCount === 0 ? 0 : (100 * coveredSongs) / songCount,
    sectionCount,
    coveredSections,
    sectionPercent: sectionCount === 0 ? 0 : (100 * coveredSections) / sectionCount,
  }
}

// "Next unlock: secondary dominants, +9%" — for every granting node not yet
// mastered, the coverage gained by mastering it on top of the current set.
export function unlockDeltas(vocab: SongVocabulary, masteredNodeIds: string[]): UnlockDelta[] {
  const base = computeCoverage(vocab, masteredNodeIds)
  const mastered = new Set(masteredNodeIds)
  const deltas: UnlockDelta[] = []
  for (const nodeId of GRANTING_NODES) {
    if (mastered.has(nodeId)) continue
    const withNode = computeCoverage(vocab, [...masteredNodeIds, nodeId])
    deltas.push({
      nodeId,
      songDelta: withNode.coveredSongs - base.coveredSongs,
      songPercentDelta: withNode.songPercent - base.songPercent,
      sectionPercentDelta: withNode.sectionPercent - base.sectionPercent,
    })
  }
  return deltas.sort((a, b) => b.songPercentDelta - a.songPercentDelta)
}

// Devices used by the corpus that no node grants at all — the honest gap
// list, surfaced by the methodology view and the calibration report.
export function ungrantedDevices(vocab: SongVocabulary): string[] {
  const granted = grantedMatcher(Object.keys(DEVICE_GRANTS))
  return vocab.deviceTaxonomy.filter((d) => !granted(d))
}

// The artifact is ~1 MB; load it once, on demand, off the critical path.
let cached: Promise<SongVocabulary> | null = null
export function loadVocabulary(): Promise<SongVocabulary> {
  cached ??= import('../data/song-vocabulary.json').then((m) => m.default as unknown as SongVocabulary)
  return cached
}
