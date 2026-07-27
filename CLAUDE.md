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

Phase 2 (curriculum) in progress. Done: open questions 1 and 2 resolved (docs/phases.md §17), corpus ingest, Corpus Coverage live, progression engine, ear track E0–E9 in sessions, theory track complete T1–T12 with the theory index and sequential gating. Remaining: checkpoints (stage-end timed challenges on corpus progressions), then the phase gate. Update this pointer at every phase boundary.
