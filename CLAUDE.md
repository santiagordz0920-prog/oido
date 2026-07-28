# Oído

Functional-ear, theory, and fretboard trainer for guitarists. React PWA, offline, local-first, no backend.

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

Phase 4 (chords in) **built, gate not yet attempted**. Tier 2 polyphonic capture and grading (`src/audio/input/poly.ts`, `chordGrade.ts`), F2 triads, P3 and P4, and the Play-Along Engine (`src/audio/playalong.ts`).

**Basic Pitch is lazy and must stay lazy.** It reaches the browser only through a dynamic import, so Tracks T and E cost zero extra bytes — the airport case. `warmPoly()` runs at session start for blocks that include Track F or P, and warms the kernels with a throwaway inference as well as loading the graph, because the first inference costs twice what every later one does (docs/phases.md open question 3). The model lives in `public/models/basic-pitch/`, not in the bundle.

**Nothing in Phase 4 has been played into a real microphone.** Phase 3's gate found two bugs that the whole test suite had missed, both only visible under real use. The Phase 4 gate is in docs/phases.md; treat the Tier 2 path as unproven until it passes. Tuning dials: `DEFAULT_GRADE_OPTIONS` in `chordGrade.ts`, the thresholds at the top of `poly.ts`, and `DETECTION_LATENCY_MS` in `improv.ts`.

Next: Phase 5 (practice system) — resolve open question 4 in docs/phases.md (Recording Archive storage budget) before building against it. Update this pointer at every phase boundary.
