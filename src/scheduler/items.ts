import { KEYS } from '../theory/keys'
import { LESSON_CHECKS } from '../curriculum/checks'
import type { ChordQuality, ScaleForm } from '../theory'

// Concrete drill items for the nodes that have content. An item's context
// names the FSRS card it belongs to; its seed rating positions it for Elo
// until real attempts move it.

export type ItemKind = 'recognition' | 'theory-check' | 'production' | 'fretboard'

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

// E4: minor in three forms against parallel major, over all 12 tonics.
// Seed ratings rise with how far the form departs from the parallel major:
// major itself is the easiest; natural minor changes three tones; harmonic
// and melodic minor add the raised leading tone (and, for melodic, the
// raised 6th ascending), which is the harder discrimination (§6 T5).
const E4_FORMS: ScaleForm[] = ['major', 'natural minor', 'harmonic minor', 'melodic minor']
const E4_FORM_SEEDS: Record<ScaleForm, number> = {
  major: 1000,
  'natural minor': 1050,
  'harmonic minor': 1120,
  'melodic minor': 1140,
}

function e4Items(): DrillItem[] {
  const items: DrillItem[] = []
  for (const key of KEYS) {
    for (const form of E4_FORMS) {
      items.push({
        id: `E4|${key.tonic}|${form}`,
        nodeId: 'E4',
        kind: 'recognition',
        context: key.tonic,
        params: { tonic: key.tonic, form },
        seedRating: E4_FORM_SEEDS[form],
      })
    }
  }
  return items
}

// E5: chord quality, two tiers sharing one node — triads and sevenths — each
// generated for all 12 chromatic roots, inversion 0 only for now. Seed
// ratings tier by how easily the ear catches the defining interval: maj/min
// are the anchor pair (as is maj7, the seventh that simply extends a major
// triad); dim/aug are harder because both are symmetric-ish and less
// common; dom7/min7 sit mid; m7b5/dim7 are seeded hardest (§6 T6/T10).
const E5_TRIAD_QUALITIES: ChordQuality[] = ['maj', 'min', 'dim', 'aug']
const E5_SEVENTH_QUALITIES: ChordQuality[] = ['maj7', 'min7', 'dom7', 'm7b5', 'dim7']
const E5_QUALITY_SEEDS: Record<ChordQuality, number> = {
  maj: 1000,
  min: 1020,
  dim: 1080,
  aug: 1100,
  maj7: 1010,
  min7: 1140,
  dom7: 1160,
  m7b5: 1220,
  dim7: 1240,
}

function e5Items(): DrillItem[] {
  const items: DrillItem[] = []
  for (const key of KEYS) {
    for (const quality of E5_TRIAD_QUALITIES) {
      items.push({
        id: `E5|${key.tonic}|triad|${quality}`,
        nodeId: 'E5',
        kind: 'recognition',
        context: key.tonic,
        params: { root: key.tonic, quality, tier: 'triad' },
        seedRating: E5_QUALITY_SEEDS[quality],
      })
    }
    for (const quality of E5_SEVENTH_QUALITIES) {
      items.push({
        id: `E5|${key.tonic}|seventh|${quality}`,
        nodeId: 'E5',
        kind: 'recognition',
        context: key.tonic,
        params: { root: key.tonic, quality, tier: 'seventh' },
        seedRating: E5_QUALITY_SEEDS[quality],
      })
    }
  }
  return items
}

// E6: diatonic function in major, presented after a tonic cadence, over all
// 12 keys. Seed ratings follow how common and how tonally unambiguous each
// numeral is: I/V/IV (the primary triads) are easiest, ii/vi sit mid, and
// iii/vii° — the least common and least distinct scale-degree triads — are
// seeded hardest (§6 T7/T8).
const E6_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
const E6_NUMERAL_SEEDS: Record<string, number> = {
  I: 1000,
  V: 1010,
  IV: 1020,
  ii: 1080,
  vi: 1090,
  iii: 1150,
  'vii°': 1160,
}

function e6Items(): DrillItem[] {
  const items: DrillItem[] = []
  for (const key of KEYS) {
    for (const numeral of E6_NUMERALS) {
      items.push({
        id: `E6|${key.tonic}|${numeral}`,
        nodeId: 'E6',
        kind: 'recognition',
        context: key.tonic,
        params: { tonic: key.tonic, numeral },
        seedRating: E6_NUMERAL_SEEDS[numeral],
      })
    }
  }
  return items
}

// E7/E8/E9 read their progressions from the ingested corpus table
// (src/curriculum/progressions.ts), never from a guessed list. That table is
// loaded lazily (a ~400KB JSON) so it must not be imported here — item
// GENERATION stays synchronous. An item's params carry only
// { tonic, mode, rank }: the rank is the index into the corpus-ordered pool
// (topProgressions(data, mode, length, poolSize)), and the item components
// (E7Item/E8Item/E9Item) resolve rank → numerals at render time, after
// awaiting the corpus load, exactly like awaiting audio load.

export const E7_POOL_SIZE: Record<'major' | 'minor', number> = { major: 12, minor: 8 }
export const E8_POOL_SIZE: Record<'major' | 'minor', number> = { major: 10, minor: 6 }

// The seven plain diatonic numerals and the scale degree of each one's root
// — shared by E6/E9 (E6's chip set is the same seven numerals; E9 grades a
// bass line by comparing entered degrees against these roots).
export const NUMERAL_DEGREE: Record<string, number> = {
  I: 1,
  ii: 2,
  iii: 3,
  IV: 4,
  V: 5,
  vi: 6,
  'vii°': 7,
}

export function isDiatonicProgression(numerals: string[]): boolean {
  return numerals.every((n) => n in NUMERAL_DEGREE)
}

// E9's pool is E8's major four-chord list (top 10), filtered to entries
// whose numerals are all plain diatonic — no secondary dominants, borrowed
// chords, or bVII; those arrive with E10. Filtering runs against the live
// corpus at render time (E9Item.tsx, via isDiatonicProgression above), but
// item generation needs to know the pool size synchronously. Verified
// against the current corpus (src/data/progression-frequency.json): of the
// top 10 major four-chord progressions, 9 are plain diatonic — only
// "I bVII IV I" (raw rank 7) carries an accidental. Re-verify this count if
// the corpus is regenerated.
export const E9_RANK_COUNT = 9

// Deterministic "nearest rank" distractor picker for E7/E8's multiple-choice
// chips: no Math.random, so replaying an item shows the same three
// distractors every time. Ties (equal distance above/below) favor the more
// frequent (lower) rank.
export function distractorRanks(rank: number, poolSize: number, count: number): number[] {
  const others: number[] = []
  for (let r = 0; r < poolSize; r++) {
    if (r !== rank) others.push(r)
  }
  others.sort((a, b) => {
    const da = Math.abs(a - rank)
    const db = Math.abs(b - rank)
    return da !== db ? da - db : a - b
  })
  return others.slice(0, count)
}

// E7: two-chord motions, ordered by corpus frequency, over all 12 tonics.
// Seed ratings rise with rank — more frequent means an easier, more familiar
// motion — and minor sits slightly above major at the same rank (§6 T8/T9).
const E7_MAJOR_BASE = 1000
const E7_MINOR_BASE = 1020
const E7_RANK_STEP = 8

function e7Items(): DrillItem[] {
  const items: DrillItem[] = []
  for (const key of KEYS) {
    for (const mode of ['major', 'minor'] as const) {
      const base = mode === 'major' ? E7_MAJOR_BASE : E7_MINOR_BASE
      for (let rank = 0; rank < E7_POOL_SIZE[mode]; rank++) {
        items.push({
          id: `E7|${key.tonic}|${mode}|${rank}`,
          nodeId: 'E7',
          kind: 'recognition',
          context: key.tonic,
          params: { tonic: key.tonic, mode, rank },
          seedRating: base + rank * E7_RANK_STEP,
        })
      }
    }
  }
  return items
}

// E8: four-bar progressions, ordered by corpus frequency, over all 12
// tonics. Same tiering rationale as E7, with a higher base — a four-chord
// progression is a longer memory span than a two-chord motion (§6).
const E8_MAJOR_BASE = 1050
const E8_MINOR_BASE = 1070
const E8_RANK_STEP = 10

function e8Items(): DrillItem[] {
  const items: DrillItem[] = []
  for (const key of KEYS) {
    for (const mode of ['major', 'minor'] as const) {
      const base = mode === 'major' ? E8_MAJOR_BASE : E8_MINOR_BASE
      for (let rank = 0; rank < E8_POOL_SIZE[mode]; rank++) {
        items.push({
          id: `E8|${key.tonic}|${mode}|${rank}`,
          nodeId: 'E8',
          kind: 'recognition',
          context: key.tonic,
          params: { tonic: key.tonic, mode, rank },
          seedRating: base + rank * E8_RANK_STEP,
        })
      }
    }
  }
  return items
}

// E9: bass-line dictation, root motion only, major only for now (minor and
// chromatic dictation arrive with E10 — §6 E9 note). Seed ratings rise with
// rank, same rationale as E7/E8.
const E9_BASE = 1050
const E9_RANK_STEP = 10

function e9Items(): DrillItem[] {
  const items: DrillItem[] = []
  for (const key of KEYS) {
    for (let rank = 0; rank < E9_RANK_COUNT; rank++) {
      items.push({
        id: `E9|${key.tonic}|${rank}`,
        nodeId: 'E9',
        kind: 'recognition',
        context: key.tonic,
        params: { tonic: key.tonic, mode: 'major', rank },
        seedRating: E9_BASE + rank * E9_RANK_STEP,
      })
    }
  }
  return items
}

// Every registered lesson's check questions become FSRS items.
function theoryItems(): DrillItem[] {
  return Object.entries(LESSON_CHECKS).flatMap(([nodeId, checks]) =>
    checks.map((check) => ({
      id: `${nodeId}|${check.id}`,
      nodeId,
      kind: 'theory-check' as const,
      context: check.id,
      params: { checkId: check.id },
      seedRating: 1000,
    })),
  )
}


// P0: the app names a degree, the user plays it and then sings it. Stable
// degrees are the easier find on the neck and in the voice, so they seed
// lower; the leading tone and the fourth seed highest.
const P0_DEGREE_SEEDS: Record<number, number> = { 1: 1000, 5: 1040, 3: 1060, 2: 1120, 6: 1140, 4: 1180, 7: 1200 }

function p0Items(): DrillItem[] {
  const items: DrillItem[] = []
  for (const key of KEYS) {
    for (let degree = 1; degree <= 7; degree++) {
      items.push({
        id: `P0|${key.tonic}|${degree}`,
        nodeId: 'P0',
        kind: 'production',
        context: key.tonic,
        params: { tonic: key.tonic, degree },
        seedRating: P0_DEGREE_SEEDS[degree],
      })
    }
  }
  return items
}

// P1: the user sings a phrase, transcribes it, then finds it on the guitar
// (§8 P1). One item per key: the difficulty here comes from the drill
// itself (an open-length sung phrase), not from any per-key parameter, so
// the seed rating is uniform.
const P1_SEED = 1000

function p1Items(): DrillItem[] {
  return KEYS.map((key) => ({
    id: `P1|${key.tonic}`,
    nodeId: 'P1',
    kind: 'production' as const,
    context: key.tonic,
    params: { tonic: key.tonic },
    seedRating: P1_SEED,
  }))
}

// P2: a cadence plus a 3-5 note fragment sounds, the user reproduces it
// (§8 P2). The fragment itself is generated at render time from
// {tonic, length, seed} (src/features/items/P2Item.tsx) rather than stored
// here, so a replay and a re-review reconstruct the same fragment
// deterministically. Seed ratings rise with length: a longer fragment is a
// longer memory span, and its pool is wider (brief §P2.5).
export const P2_LENGTHS = [3, 4, 5]
export const P2_SEEDS_PER_LENGTH = 3
const P2_LENGTH_SEED: Record<number, number> = { 3: 1000, 4: 1060, 5: 1140 }

function p2Items(): DrillItem[] {
  const items: DrillItem[] = []
  for (const key of KEYS) {
    for (const length of P2_LENGTHS) {
      for (let seed = 0; seed < P2_SEEDS_PER_LENGTH; seed++) {
        items.push({
          id: `P2|${key.tonic}|${length}|${seed}`,
          nodeId: 'P2',
          kind: 'production',
          context: key.tonic,
          params: { tonic: key.tonic, length, seed },
          seedRating: P2_LENGTH_SEED[length],
        })
      }
    }
  }
  return items
}

// F0: note names in all positions under time pressure, over all 12 pitch
// classes (`pitchClass` reuses the KEYS tonic spelling so the item's context
// carries a hue for free — every pitch class already sits somewhere on the
// twelve-hue wheel) and all 6 strings. Naturals seed lower than the five
// sharp/flat pitch classes: a natural's letter name is its own answer, while
// an accidental adds a step of recall (§7 F0).
const F0_NATURAL_SEED = 1000
const F0_ACCIDENTAL_SEED = 1080
const F0_NATURAL_TONICS = new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B'])

function f0Items(): DrillItem[] {
  const items: DrillItem[] = []
  for (const key of KEYS) {
    const seedRating = F0_NATURAL_TONICS.has(key.tonic) ? F0_NATURAL_SEED : F0_ACCIDENTAL_SEED
    for (let stringIndex = 1; stringIndex <= 6; stringIndex++) {
      items.push({
        id: `F0|${key.tonic}|${stringIndex}`,
        nodeId: 'F0',
        kind: 'fretboard',
        context: key.tonic,
        params: { pitchClass: key.tonic, stringIndex },
        seedRating,
      })
    }
  }
  return items
}

// F1: degrees from a given root across string pairs (§7 F1). `stringSet` is
// stored as "a-b" (DrillItem.params only carries string|number) and parsed
// back to a pair at render time. The five adjacent pairs (6-5 .. 2-1) and
// four skip-one pairs (6-4 .. 3-1) cover the fretboard symmetrically; skip
// pairs seed harder, since the shape under the fingers is less familiar than
// a same-fret adjacent pair. Degree 1 is excluded — it is the root itself,
// already shown as the target marker.
export const F1_STRING_SETS: Array<[number, number]> = [
  [6, 5],
  [5, 4],
  [4, 3],
  [3, 2],
  [2, 1],
  [6, 4],
  [5, 3],
  [4, 2],
  [3, 1],
]
const F1_ADJACENT_SEED = 1000
const F1_SKIP_SEED = 1040
const F1_DEGREE_OFFSET: Record<number, number> = { 2: 0, 6: 0, 3: 10, 5: 10, 4: 30, 7: 30 }

function f1Items(): DrillItem[] {
  const items: DrillItem[] = []
  for (const key of KEYS) {
    for (const degree of [2, 3, 4, 5, 6, 7]) {
      for (const [a, b] of F1_STRING_SETS) {
        const adjacent = Math.abs(a - b) === 1
        const base = adjacent ? F1_ADJACENT_SEED : F1_SKIP_SEED
        items.push({
          id: `F1|${key.tonic}|${degree}|${a}-${b}`,
          nodeId: 'F1',
          kind: 'fretboard',
          context: key.tonic,
          params: { rootPitchClass: key.tonic, degree, stringSet: `${a}-${b}` },
          seedRating: base + F1_DEGREE_OFFSET[degree],
        })
      }
    }
  }
  return items
}

// F5: scale degree relative to a moving root (§7 F5). The progression is
// fixed and deliberately simple — I-IV-V-vi, drawn from the four numerals
// the brief allows — so item generation never touches the corpus tables
// (that is E-track work). `degree` is a string so '♭7' can be written 'b7'
// without a separate type; F5Item transposes chordRootPc + the offset below
// and grades the result by pitch class, same as every other fretboard item.
export const F5_NUMERALS = ['I', 'IV', 'V', 'vi']
export const F5_DEGREES = ['1', '3', '5', 'b7'] as const
export const F5_DEGREE_OFFSET: Record<string, number> = { '1': 0, '3': 4, '5': 7, b7: 10 }
const F5_DEGREE_SEED: Record<string, number> = { '1': 1000, '5': 1020, '3': 1040, b7: 1080 }

function f5Items(): DrillItem[] {
  const items: DrillItem[] = []
  for (const key of KEYS) {
    for (let numeralIndex = 0; numeralIndex < F5_NUMERALS.length; numeralIndex++) {
      for (const degree of F5_DEGREES) {
        items.push({
          id: `F5|${key.tonic}|${numeralIndex}|${degree}`,
          nodeId: 'F5',
          kind: 'fretboard',
          context: key.tonic,
          params: { tonic: key.tonic, numeralIndex, degree },
          seedRating: F5_DEGREE_SEED[degree],
        })
      }
    }
  }
  return items
}

export const ITEMS: DrillItem[] = [
  ...theoryItems(),
  ...p0Items(),
  ...p1Items(),
  ...p2Items(),
  ...e0Items(),
  ...e1Items(),
  ...e2Items(),
  ...e3Items(),
  ...e4Items(),
  ...e5Items(),
  ...e6Items(),
  ...e7Items(),
  ...e8Items(),
  ...e9Items(),
  ...f0Items(),
  ...f1Items(),
  ...f5Items(),
]

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
