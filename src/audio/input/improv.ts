import { chordDegreeSemitones, parseNumeral, type ChordDegree } from '../../theory'
import { pitchClassOf, tonicPitchClassOf } from './notes'

// Grading improvisation over changes: the shared spine of P3 (target
// practice) and P4 (constrained improvisation), docs/curriculum.md §8.
//
// Both drills work the same way underneath. A backing track supplies a
// timeline of bars, each with a downbeat and a chord; the mic supplies notes
// with times; this module decides which chord each note was played over and
// whether it satisfied the drill's constraint. All of it is pure, so the
// rules can be tested without an audio context — which matters here more
// than usual, because "did that land on beat 1" is the kind of judgement
// that is impossible to check by ear while also playing.

export type BarWindow = {
  barIndex: number
  chordIndex: number
  numeral: string
  /** performance.now() of this bar's downbeat. */
  atMs: number
  barMs: number
}

export type PlayedNote = {
  midi: number
  /** performance.now() of the note's onset, as reported by the detector. */
  atMs: number
}

// Tier 1 reports a note some time after the string was actually struck, and
// the lag is systematic rather than random: the analysis window is 4096
// samples (~85 ms, so on average ~43 ms of it precedes the report), onsets
// are blanked for 45 ms, and three frames at a 1024 hop (~21 ms each) have
// to agree before anything is emitted. That sums to roughly 130 ms of
// built-in lateness. Grading "on the beat" without subtracting it would mark
// good playing late, so the correction is applied once, here, where it can
// be seen and argued with.
export const DETECTION_LATENCY_MS = 130

export type TimingOptions = {
  detectionLatencyMs?: number
  /** How far before the downbeat a note may land, in beats. */
  earlyBeats?: number
  /** How far after the downbeat a note may land, in beats. */
  lateBeats?: number
}

export const DEFAULT_TIMING: Required<TimingOptions> = {
  detectionLatencyMs: DETECTION_LATENCY_MS,
  earlyBeats: 0.5,
  lateBeats: 0.5,
}

const BEATS_PER_BAR = 4

/**
 * Convert detector times to the wall clock the backing track's downbeats are
 * on. The two run on different clocks — the capture context's and
 * performance.now() — but both advance in real time, so a single offset
 * taken at the first note holds for the length of a drill.
 */
export function createClockBridge(now: () => number = () => performance.now()) {
  let offset: number | null = null
  return {
    wallMsFor(tMs: number): number {
      offset ??= now() - tMs
      return offset + tMs
    },
    reset() {
      offset = null
    },
    /** Exposed so a test can assert the offset was taken, not assumed. */
    offsetMs: () => offset,
  }
}

function correctedTime(note: PlayedNote, timing: Required<TimingOptions>): number {
  return note.atMs - timing.detectionLatencyMs
}

/** The chord degree a note sounds against a numeral, or null if it is outside. */
export function degreeInChord(tonic: string, numeral: string, midi: number): ChordDegree | null {
  const spec = parseNumeral(tonic, numeral)
  const rootPc = tonicPitchClassOf(spec.root)
  const semitone = (pitchClassOf(midi) - rootPc + 12) % 12
  return chordDegreeSemitones(spec).get(semitone) ?? null
}

/**
 * The guide tones of a chord: its 3rd and its 7th (docs/curriculum.md T11).
 * A triad has no 7th, so its 3rd carries the quality alone — returning the
 * root as a stand-in would quietly turn a guide-tone drill into a root drill.
 */
export function guideToneDegrees(tonic: string, numeral: string): ChordDegree[] {
  const spec = parseNumeral(tonic, numeral)
  const present = new Set(chordDegreeSemitones(spec).values())
  return ([3, 7] as ChordDegree[]).filter((d) => present.has(d))
}

// ---------------------------------------------------------------------------
// P3: target practice. A vamp plays and the user improvises freely, but a
// named chord tone has to land on beat 1 of each bar.
// ---------------------------------------------------------------------------

export type BarTarget = {
  barIndex: number
  /** The chord degree that had to land on this downbeat. */
  target: ChordDegree
  hit: boolean
  /** What actually landed in the window, if anything, as a chord degree. */
  played: ChordDegree | null
  /** Signed ms from the downbeat, negative for early. Null when nothing landed. */
  offsetMs: number | null
}

export type TargetVerdict = {
  bars: BarTarget[]
  hits: number
  total: number
  correct: boolean
}

export type TargetOptions = TimingOptions & {
  /** Fraction of bars that must be hit. */
  passFraction?: number
}

export const DEFAULT_TARGET_PASS = 0.75

/**
 * Grade a run of target practice. A bar is hit when a note sounding the
 * named chord degree starts inside the window around its downbeat. Notes
 * outside the window are not wrong — the user is improvising, and this drill
 * grades the landing, not everything in between.
 */
export function gradeTargets(
  tonic: string,
  bars: BarWindow[],
  notes: PlayedNote[],
  target: ChordDegree,
  options: TargetOptions = {},
): TargetVerdict {
  const timing = { ...DEFAULT_TIMING, ...options }
  const passFraction = options.passFraction ?? DEFAULT_TARGET_PASS
  const corrected = notes.map((n) => ({ midi: n.midi, atMs: correctedTime(n, timing) }))

  const graded: BarTarget[] = bars.map((bar) => {
    const beatMs = bar.barMs / BEATS_PER_BAR
    const from = bar.atMs - timing.earlyBeats * beatMs
    const to = bar.atMs + timing.lateBeats * beatMs
    const inWindow = corrected.filter((n) => n.atMs >= from && n.atMs <= to)

    let played: ChordDegree | null = null
    let offsetMs: number | null = null
    let hit = false
    for (const note of inWindow) {
      const degree = degreeInChord(tonic, bar.numeral, note.midi)
      // The closest note to the downbeat is the one being judged, but a
      // correct one anywhere in the window wins: a player who lands the
      // target and then keeps moving has done the exercise.
      if (degree === target) {
        hit = true
        played = degree
        offsetMs = note.atMs - bar.atMs
        break
      }
      if (played === null || Math.abs(note.atMs - bar.atMs) < Math.abs((offsetMs ?? Infinity))) {
        played = degree
        offsetMs = note.atMs - bar.atMs
      }
    }
    if (inWindow.length === 0) {
      played = null
      offsetMs = null
    }
    return { barIndex: bar.barIndex, target, hit, played, offsetMs }
  })

  const hits = graded.filter((b) => b.hit).length
  return {
    bars: graded,
    hits,
    total: graded.length,
    correct: graded.length > 0 && hits / graded.length >= passFraction,
  }
}

// ---------------------------------------------------------------------------
// P4: constrained improvisation over changes. Guide tones only, then
// approach tones, then open.
// ---------------------------------------------------------------------------

export type Constraint = 'guide' | 'approach' | 'open'

export const CONSTRAINTS: Constraint[] = ['guide', 'approach', 'open']

export type NoteJudgement = {
  midi: number
  atMs: number
  barIndex: number
  numeral: string
  degree: ChordDegree | null
  ok: boolean
  reason: 'guide' | 'approach' | 'chord-tone' | 'outside' | 'unattributed'
}

export type ImprovVerdict = {
  notes: NoteJudgement[]
  /** Fraction of attributed notes that satisfied the constraint. */
  accuracy: number
  /** Chords that never received a guide tone. Only graded when 'open'. */
  chordsMissed: number[]
  correct: boolean
}

export type ImprovOptions = TimingOptions & {
  passFraction?: number
  minNotes?: number
  /** How far an approach note may sit from the guide tone it resolves to. */
  approachSemitones?: number
}

export const DEFAULT_IMPROV_PASS = 0.8
export const DEFAULT_MIN_NOTES = 8
export const DEFAULT_APPROACH_SEMITONES = 2

/** The bar a note was played over, or null if it fell outside the run. */
function barAt(bars: BarWindow[], atMs: number): BarWindow | null {
  for (const bar of bars) {
    if (atMs >= bar.atMs && atMs < bar.atMs + bar.barMs) return bar
  }
  return null
}

export function gradeImprov(
  tonic: string,
  bars: BarWindow[],
  notes: PlayedNote[],
  constraint: Constraint,
  options: ImprovOptions = {},
): ImprovVerdict {
  const timing = { ...DEFAULT_TIMING, ...options }
  const passFraction = options.passFraction ?? DEFAULT_IMPROV_PASS
  const minNotes = options.minNotes ?? DEFAULT_MIN_NOTES
  const approachSemitones = options.approachSemitones ?? DEFAULT_APPROACH_SEMITONES

  const corrected = notes
    .map((n) => ({ midi: n.midi, atMs: correctedTime(n, timing) }))
    .sort((a, b) => a.atMs - b.atMs)

  const judged: NoteJudgement[] = corrected.map((note, i) => {
    const bar = barAt(bars, note.atMs)
    if (!bar) {
      return {
        midi: note.midi,
        atMs: note.atMs,
        barIndex: -1,
        numeral: '',
        degree: null,
        ok: false,
        reason: 'unattributed',
      }
    }
    const degree = degreeInChord(tonic, bar.numeral, note.midi)
    const guides = guideToneDegrees(tonic, bar.numeral)
    const isGuide = degree !== null && guides.includes(degree)

    let ok: boolean
    let reason: NoteJudgement['reason']
    if (isGuide) {
      ok = true
      reason = 'guide'
    } else if (constraint === 'guide') {
      ok = false
      reason = degree === null ? 'outside' : 'chord-tone'
    } else if (constraint === 'approach') {
      // An approach note earns its place by where it goes, not by what it
      // is: it must sit within reach of a guide tone AND the very next note
      // must actually be that guide tone. Without the resolution it is just
      // a wrong note played near a right one.
      const next = corrected[i + 1]
      const nextBar = next ? barAt(bars, next.atMs) : null
      const nextDegree = next && nextBar ? degreeInChord(tonic, nextBar.numeral, next.midi) : null
      const nextIsGuide =
        next !== undefined &&
        nextBar !== null &&
        nextDegree !== null &&
        guideToneDegrees(tonic, nextBar.numeral).includes(nextDegree)
      const withinReach = next !== undefined && Math.abs(next.midi - note.midi) <= approachSemitones
      ok = nextIsGuide && withinReach
      reason = ok ? 'approach' : degree === null ? 'outside' : 'chord-tone'
    } else {
      // Open: any note is allowed. What is graded is whether the changes
      // were acknowledged at all, which is checked per chord below.
      ok = true
      reason = degree === null ? 'outside' : isGuide ? 'guide' : 'chord-tone'
    }

    return { midi: note.midi, atMs: note.atMs, barIndex: bar.barIndex, numeral: bar.numeral, degree, ok, reason }
  })

  const attributed = judged.filter((j) => j.reason !== 'unattributed')
  const accuracy = attributed.length > 0 ? attributed.filter((j) => j.ok).length / attributed.length : 0

  // Which chords never received a guide tone. This is what 'open' grades:
  // the constraint on individual notes is gone, but the changes still have
  // to be played over rather than through.
  const guidedChords = new Set(
    judged.filter((j) => j.reason === 'guide').map((j) => bars.find((b) => b.barIndex === j.barIndex)?.chordIndex),
  )
  const allChords = [...new Set(bars.map((b) => b.chordIndex))]
  const chordsMissed = allChords.filter((c) => !guidedChords.has(c))

  const enough = attributed.length >= minNotes
  const correct =
    constraint === 'open'
      ? enough && chordsMissed.length === 0
      : enough && accuracy >= passFraction

  return { notes: judged, accuracy, chordsMissed, correct }
}
