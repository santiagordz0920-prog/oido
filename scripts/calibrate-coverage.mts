// Corpus Coverage calibration (docs/phases.md open question 2).
// Runs the real coverage engine over the real ingested corpus at milestone
// mastery states, so the song-vs-section display decision rests on data.
// Usage: node --experimental-strip-types scripts/calibrate-coverage.mts
import { readFileSync } from 'node:fs'
import { computeCoverage, ungrantedDevices, unlockDeltas, type SongVocabulary } from '../src/curriculum/coverage.ts'
import { grantedMatcher } from '../src/curriculum/devices.ts'

const vocab = JSON.parse(
  readFileSync(new URL('../src/data/song-vocabulary.json', import.meta.url), 'utf8'),
) as SongVocabulary

const milestones: [string, string[]][] = [
  ['Nothing mastered', []],
  ['E5 (chord quality)', ['E5']],
  ['E5+E6 (quality + major diatonic)', ['E5', 'E6']],
  ['+E8 (minor diatonic)', ['E5', 'E6', 'E8']],
  ['+E11 (inversions)', ['E5', 'E6', 'E8', 'E11']],
  ['+E10 (secondary doms + borrowed)', ['E5', 'E6', 'E8', 'E11', 'E10']],
  ['+E13 (modulation) — all grants', ['E5', 'E6', 'E8', 'E11', 'E10', 'E13']],
]

const pct = (x: number) => `${x.toFixed(1)}%`
console.log(`corpus: ${vocab.songs.length} songs, ${vocab.songs.reduce((n, s) => n + s.sections.length, 0)} sections\n`)
console.log('milestone'.padEnd(38), 'songs'.padStart(12), 'sections'.padStart(12))
for (const [label, nodes] of milestones) {
  const c = computeCoverage(vocab, nodes)
  console.log(
    label.padEnd(38),
    `${c.coveredSongs} (${pct(c.songPercent)})`.padStart(12),
    `${c.coveredSections} (${pct(c.sectionPercent)})`.padStart(12),
  )
}

console.log('\nnext-unlock deltas from E5+E6:')
for (const d of unlockDeltas(vocab, ['E5', 'E6'])) {
  console.log(`  ${d.nodeId.padEnd(5)} +${d.songDelta} songs (+${pct(d.songPercentDelta)} song, +${pct(d.sectionPercentDelta)} section)`)
}

// How much do devices that NO node grants cost? For each ungranted device,
// count songs blocked ONLY by ungranted devices (all granted-taxonomy devices
// already grantable at full mastery).
const allGrants = grantedMatcher(['E5', 'E6', 'E8', 'E10', 'E11', 'E13'])
const ungranted = ungrantedDevices(vocab)
console.log(`\nungranted devices: ${ungranted.join(' ') || '(none)'}`)
const blockedBy = new Map<string, number>()
let blockedOnly = 0
for (const song of vocab.songs) {
  const devices = song.devices.map((d) => (typeof d === 'number' ? vocab.deviceTaxonomy[d] : d))
  const missing = devices.filter((d) => !allGrants(d))
  if (missing.length > 0) {
    blockedOnly++
    for (const d of new Set(missing)) blockedBy.set(d, (blockedBy.get(d) ?? 0) + 1)
  }
}
console.log(`songs uncoverable at full current grants: ${blockedOnly} (${pct((100 * blockedOnly) / vocab.songs.length)})`)
for (const [d, n] of [...blockedBy.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${d.padEnd(16)} blocks ${n} songs`)
}
