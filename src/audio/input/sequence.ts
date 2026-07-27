import { pitchClassOf } from './notes'
import type { NoteEvent } from './stabilize'

// Capturing a played or sung phrase, and comparing it to a target.
//
// P1 (play what you sing) and P2 (play what you hear) both need more than a
// single note: they need an ordered phrase, and a comparison that says which
// position went wrong rather than just failing.
//
// Known limit of Tier 1: the stabilizer reports note *changes*, so a note
// re-articulated at the same pitch inside a phrase does not produce a second
// event. Drill fragments are therefore generated without immediate repeats,
// and this module documents that rather than pretending otherwise.

export type CapturedNote = { midi: number; tMs: number }

export type PhraseCaptureOptions = {
  maxNotes: number
  // Silence longer than this ends the phrase.
  endGapMs: number
}

export type PhraseCapture = {
  /** Feed a note event. Returns the finished phrase, or null while it grows. */
  push: (event: NoteEvent) => CapturedNote[] | null
  /** Force the phrase closed, e.g. when the user taps "done". */
  finish: () => CapturedNote[]
  notes: () => CapturedNote[]
  reset: () => void
}

export function createPhraseCapture({ maxNotes, endGapMs }: PhraseCaptureOptions): PhraseCapture {
  let notes: CapturedNote[] = []
  let lastOffAt: number | null = null

  return {
    push(event) {
      if (event.kind === 'off') {
        lastOffAt = event.tMs
        return null
      }
      // A long silence before this note means the previous phrase is over
      // and this note begins a new one.
      if (lastOffAt !== null && notes.length > 0 && event.tMs - lastOffAt >= endGapMs) {
        const finished = notes
        notes = [{ midi: event.midi, tMs: event.tMs }]
        lastOffAt = null
        return finished
      }
      lastOffAt = null
      notes.push({ midi: event.midi, tMs: event.tMs })
      if (notes.length >= maxNotes) {
        const finished = notes
        notes = []
        return finished
      }
      return null
    },
    finish() {
      const finished = notes
      notes = []
      lastOffAt = null
      return finished
    },
    notes: () => [...notes],
    reset() {
      notes = []
      lastOffAt = null
    },
  }
}

export type PositionVerdict = {
  expected: number
  played: number | null
  ok: boolean
}

export type SequenceVerdict = {
  correct: boolean
  positions: PositionVerdict[]
  extra: number // notes played beyond the target's length
}

// Compare in order, by pitch class: an acoustic into a laptop mic cannot be
// trusted on octaves, and a phrase reproduced an octave away is still the
// right phrase. Comparison is positional so feedback can point at the note
// that went wrong instead of failing the whole attempt anonymously.
export function compareSequences(played: number[], target: number[]): SequenceVerdict {
  const positions = target.map((expected, i) => {
    const actual = i < played.length ? played[i] : null
    return {
      expected,
      played: actual,
      ok: actual !== null && pitchClassOf(actual) === pitchClassOf(expected),
    }
  })
  const extra = Math.max(0, played.length - target.length)
  return {
    correct: extra === 0 && positions.every((p) => p.ok),
    positions,
    extra,
  }
}

// The first position that does not match, for one-line feedback.
export function firstMismatch(verdict: SequenceVerdict): number | null {
  const index = verdict.positions.findIndex((p) => !p.ok)
  return index === -1 ? null : index
}

// Fragments for P2: a random walk over the given scale degrees with no
// immediate repeats, so every note in the phrase produces its own event.
export function fragmentDegrees(
  length: number,
  pool: number[],
  random: () => number = Math.random,
): number[] {
  if (pool.length < 2) throw new Error('fragment pool needs at least two degrees')
  const out: number[] = []
  while (out.length < length) {
    const next = pool[Math.floor(random() * pool.length)]
    if (out.length === 0 || next !== out[out.length - 1]) out.push(next)
  }
  return out
}
