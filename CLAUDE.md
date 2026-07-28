# Oído

Functional-ear, theory, and fretboard trainer for guitarists. React PWA, offline, local-first, no backend.

## Who you are talking to

**The owner is a musician, not a programmer.** They know guitar, theory and
ear training deeply — use that vocabulary freely, and trust them completely
on anything musical. They do not read code and do not know the engineering
vocabulary. Write to them accordingly:

- **Say what changed for the player, not what changed in the codebase.** "The
  drill was asking for a note that isn't in the chord" — not "F5's target
  derivation used a fixed offset table."
- **Never make them look up a term.** No CI, lint, typecheck, chunk,
  dependency, refactor, worklet, inference, code-split — not without a plain
  gloss in the same sentence, and prefer not using them at all. File paths
  and function names are noise to them; keep those in commits and PR bodies,
  where other engineers read them.
- **Do not hand them engineering decisions to arbitrate.** Things like how
  the build is configured or how the tests run are yours to decide. Pick the
  best option and say what you picked in one line. Ask them only about
  things they are the expert on: musical choices, pedagogy, what the app
  should do, what it should feel like.
- **Lead with whether it works and what is still unproven.** They care that a
  drill grades their playing correctly, not how it was verified.

This is a difference in vocabulary, not in judgement. Explain the reasoning
behind a decision whenever it affects them — just in their language.

## Hard rules

- Verify current APIs for `tonal`, `tone`, `ts-fsrs`, `pitchy`, and `@spotify/basic-pitch` before writing code against them.
- All musical timing through `Tone.Transport`, never `setTimeout`.
- Both themes from Phase 0. No component ships that only works in light mode.
- No element encoded by hue alone (docs/design-system.md §15.4).
- All user-facing strings in the locale file, Spanish and English, from Phase 0.
- All drills transposed across 12 keys. Nothing hardcoded to C.
- Interval names appear nowhere in the UI. Answers are scale degrees and Roman numerals.

## Stack

| Layer | Choice |
|---|---|
| Framework | React, TypeScript, Vite |
| State | Zustand |
| Theory | `tonal` |
| Audio out | `tone` (sampled instruments, realistic voicings) |
| Pitch, mono | `pitchy` or `pitchfinder`, in an AudioWorklet |
| Pitch, poly | `@spotify/basic-pitch` |
| Time-stretch | SoundTouch or phase vocoder |
| Scheduling | `ts-fsrs` |
| Storage | Dexie over IndexedDB |
| Styling | Tailwind, tokens per docs/design-system.md |
| PWA | `vite-plugin-pwa` |

## Docs

- docs/phases.md — build phases, open questions, non-goals. Read every session.
- docs/architecture.md — scheduling, data model, audio subsystems, stack (Phases 1, 3, 4).
- docs/curriculum.md — tracks T/E/F/P/W (Phases 2, 5, 6).
- docs/design-system.md — OKLCH twelve-hue system, tokens, type, components (any UI work).
- docs/pedagogy.md — background; rarely needed per session.

## Current phase

Phase 4 (chords in) built; **Tier 2 gate passed on a real guitar**, P3/P4 half still unplayed. Tier 2 polyphonic capture and grading (`src/audio/input/poly.ts`, `chordGrade.ts`), F2 triads, P3 and P4, and the Play-Along Engine (`src/audio/playalong.ts`).

**Basic Pitch is lazy and must stay lazy.** It reaches the browser only through a dynamic import, so Tracks T and E cost zero extra bytes — the airport case. `warmPoly()` runs at session start for blocks that include Track F or P, and warms the kernels with a throwaway inference as well as loading the graph, because the first inference costs twice what every later one does (docs/phases.md open question 3). The model lives in `public/models/basic-pitch/`, not in the bundle.

**F2 works on real playing**: correct triads pass, and deliberate mistakes are named specifically. The bug the gate found was not in the grading but in the UI — the feedback diagram ticked the shape as though the mic had seen the fingering. It cannot: string and fret are not recoverable from audio, only pitch. Do not reintroduce any UI that implies otherwise; register (an octave difference) is the one positional thing that IS audible, and it is reported rather than failed.

**P3 and P4 have still never been played into a microphone**, because they sit eighteen minutes into a Bench session. Treat the graded-improvisation path as unproven. Tuning dials: `DEFAULT_GRADE_OPTIONS` in `chordGrade.ts`, the thresholds at the top of `poly.ts`, and `DETECTION_LATENCY_MS` in `improv.ts`.

Next: Phase 5 (practice system) — resolve open question 4 in docs/phases.md (Recording Archive storage budget) before building against it. Update this pointer at every phase boundary.
