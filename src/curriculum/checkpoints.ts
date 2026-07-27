// Stage checkpoints (docs/pedagogy.md §4.1): timed challenges built from real
// corpus progressions, never synthetic single-degree items. Pool selection
// and item drawing live here as pure functions so they are unit-testable
// without React or Dexie — the component (src/features/Checkpoint.tsx) only
// orchestrates audio, the countdown and the pass/fail screen.
//
// Checkpoints are NOT FSRS items and are deliberately kept out of the skill
// graph (src/curriculum/graph.ts only knows their id as a gate value); this
// module owns everything about what a checkpoint attempt actually contains.

import { KEYS, type KeyDef } from '../theory/keys'
import { topProgressions, type ProgressionFrequency } from './progressions'
import { distractorRanks, E7_POOL_SIZE, E8_POOL_SIZE, isDiatonicProgression, NUMERAL_DEGREE } from '../scheduler/items'

export type CheckpointId = 'CP1' | 'CP2' | 'CP3'

export const CHECKPOINT_ITEM_COUNT = 8
export const CHECKPOINT_PASS_THRESHOLD = 7
export const CHECKPOINT_SECONDS = 12

// One drawn checkpoint item: a key, the mode-aware target progression, and
// its rank within whichever pool it came from (CP1/CP2 ranks index the
// filtered major two-chord pool below; CP3 ranks index its own mode's
// four-chord pool and pair with `mode` to look up its distractor chips).
export type CheckpointItem = {
  key: KeyDef
  mode: 'major' | 'minor'
  rank: number
  numerals: string[]
}

export type Rng = () => number

// Deterministic seeded RNG (mulberry32) so the draw functions are testable
// without Math.random: same seed, same 8 items, every time. Production
// callers omit the seed and get genuine per-attempt randomness via
// Math.random.
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// CP1's pool: the corpus major two-chord motions (E7's pool), filtered to
// entries where BOTH chords are plain-diatonic. CP1's answer is two bass
// roots entered as scale-degree chips 1-7, so a chromatic root such as bVII
// has no chip to represent it — either chord being non-diatonic makes the
// item unanswerable.
export function cp1Pool(data: ProgressionFrequency): string[][] {
  return topProgressions(data, 'major', 'two', E7_POOL_SIZE.major)
    .map((e) => e.p)
    .filter((p) => isDiatonicProgression(p))
}

// CP2's pool: the same corpus major two-chord motions, but only the SECOND
// (graded) chord needs to be a plain-diatonic numeral — CP2 asks for that
// one chord's Roman numeral via the seven diatonic chips (I ii iii IV V vi
// vii°), and the first chord is only ever heard, never answered. This is
// narrower than CP1's requirement (both chords diatonic): against the live
// corpus, rank 8 of the top 12 — "I -> bVII" — is excluded here because
// bVII has no answer chip, the same reason it is excluded from CP1's pool.
export function cp2Pool(data: ProgressionFrequency): string[][] {
  return topProgressions(data, 'major', 'two', E7_POOL_SIZE.major)
    .map((e) => e.p)
    .filter((p) => p[1] in NUMERAL_DEGREE)
}

// CP3's pool: corpus four-chord progressions, major and minor combined —
// the checkpoint spans both (major ranks 0-9, minor ranks 0-5) with a
// mode-aware cadence per item. The answer is a whole-progression multiple
// choice (four chips, E8-style), so no diatonic filter is needed here: the
// correct label is always among the options by construction, same as E7/E8.
export type CP3PoolEntry = { mode: 'major' | 'minor'; rank: number; numerals: string[] }
export function cp3Pool(data: ProgressionFrequency): CP3PoolEntry[] {
  const major = topProgressions(data, 'major', 'four', E8_POOL_SIZE.major)
  const minor = topProgressions(data, 'minor', 'four', E8_POOL_SIZE.minor)
  return [
    ...major.map((e, rank): CP3PoolEntry => ({ mode: 'major', rank, numerals: e.p })),
    ...minor.map((e, rank): CP3PoolEntry => ({ mode: 'minor', rank, numerals: e.p })),
  ]
}

// CP3's per-mode pool, for rendering a drawn item's four answer chips
// (correct rank plus distractorRanks within the same mode).
export function cp3ModePool(data: ProgressionFrequency, mode: 'major' | 'minor'): string[][] {
  return topProgressions(data, mode, 'four', E8_POOL_SIZE[mode]).map((e) => e.p)
}

export function cp3DistractorRanks(rank: number, mode: 'major' | 'minor', count = 3): number[] {
  return distractorRanks(rank, E8_POOL_SIZE[mode], count)
}

// `count` distinct indices into a pool of size `poolSize`, in draw order —
// a partial Fisher-Yates shuffle so it stays a pure function of the
// injected Rng (no Math.random hidden inside), which is what makes the
// item-drawing logic unit-testable with a seeded RNG (brief's verification
// requirement).
export function sampleIndices(poolSize: number, count: number, rng: Rng): number[] {
  if (count > poolSize) {
    throw new Error(`Cannot draw ${count} items without replacement from a pool of ${poolSize}`)
  }
  const pool = Array.from({ length: poolSize }, (_, i) => i)
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
    out.push(pool[i])
  }
  return out
}

// `count` random keys, one per item, with no two consecutive items sharing
// a key (brief: "random keys from KEYS, never repeat the previous key").
export function drawKeys(count: number, rng: Rng): KeyDef[] {
  const out: KeyDef[] = []
  for (let i = 0; i < count; i++) {
    let k = KEYS[Math.floor(rng() * KEYS.length)]
    let guard = 0
    while (out.length > 0 && k.tonic === out[out.length - 1].tonic && guard < 100) {
      k = KEYS[Math.floor(rng() * KEYS.length)]
      guard++
    }
    out.push(k)
  }
  return out
}

export function drawCP1Items(data: ProgressionFrequency, rng: Rng = Math.random): CheckpointItem[] {
  const pool = cp1Pool(data)
  const ranks = sampleIndices(pool.length, CHECKPOINT_ITEM_COUNT, rng)
  const keys = drawKeys(CHECKPOINT_ITEM_COUNT, rng)
  return ranks.map((rank, i) => ({ key: keys[i], mode: 'major', rank, numerals: pool[rank] }))
}

export function drawCP2Items(data: ProgressionFrequency, rng: Rng = Math.random): CheckpointItem[] {
  const pool = cp2Pool(data)
  const ranks = sampleIndices(pool.length, CHECKPOINT_ITEM_COUNT, rng)
  const keys = drawKeys(CHECKPOINT_ITEM_COUNT, rng)
  return ranks.map((rank, i) => ({ key: keys[i], mode: 'major', rank, numerals: pool[rank] }))
}

export function drawCP3Items(data: ProgressionFrequency, rng: Rng = Math.random): CheckpointItem[] {
  const pool = cp3Pool(data)
  const indices = sampleIndices(pool.length, CHECKPOINT_ITEM_COUNT, rng)
  const keys = drawKeys(CHECKPOINT_ITEM_COUNT, rng)
  return indices.map((poolIndex, i) => {
    const e = pool[poolIndex]
    return { key: keys[i], mode: e.mode, rank: e.rank, numerals: e.numerals }
  })
}

export function drawCheckpointItems(
  checkpointId: CheckpointId,
  data: ProgressionFrequency,
  rng: Rng = Math.random,
): CheckpointItem[] {
  if (checkpointId === 'CP1') return drawCP1Items(data, rng)
  if (checkpointId === 'CP2') return drawCP2Items(data, rng)
  return drawCP3Items(data, rng)
}
