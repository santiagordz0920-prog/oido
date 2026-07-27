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

Phase 3 (ears open) built, awaiting its gate: Tier 1 mono pitch (`src/audio/input/`), calibration, P0–P2, F0/F1/F5, tap fallback on every mic drill. Gate: the human passes calibration with a real guitar and P0 grades a played note correctly.

**Input is an acoustic guitar into the laptop mic** (open question 5, resolved). Every detection default is tuned for it: attenuated low-E fundamental, low SNR, and a noise floor AND gate margin both measured per room in calibration — never fixed constants (docs/architecture.md, Phase 3 addendum). Tuning dials: `DEFAULT_CONFIG` in `src/audio/input/stabilize.ts`. A single P0 item is reachable straight from the mic card (`MicCheck`) for setup checks.

Next: Phase 4 (chords in) — resolve open question 3 in docs/phases.md (Basic Pitch cold-start time) before building against it. Update this pointer at every phase boundary.
