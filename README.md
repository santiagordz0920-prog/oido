# Oído

A functional-ear, theory, and fretboard trainer for guitarists. React PWA, offline-capable, local-first, no backend.

Every pitch is named by its relationship to a tonal center — scale degrees and Roman numerals, never intervals. See `CLAUDE.md` for the hard rules and `docs/` for the full specification.

## Run

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
npm run preview
```

## Test

```sh
npm test
```

## Status

Phase 0 (spine): theme system (OKLCH twelve-hue, light + dark), `tonal` wrapper, Tone.js playback with a bundled sampled piano, the T2 theory lesson and the E1 ear drill end to end with tap input, Spanish and English.

Phase 1 (brain): FSRS scheduling (`ts-fsrs`) with one card per skill node and key context, per-node Elo against per-item difficulty targeting 85% expected success, a hard interleaving constraint in the selection loop, Dexie persistence over IndexedDB, the session runner with all four modes (Deskside, Commute, Bench, Deep), and the zoomable skill constellation.

Phase 2 (curriculum): the McGill Billboard corpus (CC0) ingested into a progression-frequency table and a per-song harmonic vocabulary, Corpus Coverage computed conservatively from them, theory lessons T1–T12, ear drills E0–E9, and the CP1–CP3 stage checkpoints.

Phase 3 (ears open): monophonic pitch input for **an acoustic guitar into the laptop mic** — MPM in an AudioWorklet, an octave-error guard that survives the mic's low-end roll-off, and a calibration screen that measures the room and confirms an open low E. Production drills P0–P2 and fretboard drills F0, F1 and F5, each with a tap fallback that records honestly whether the answer was verified or self-reported.

Phase 4 (chords in): polyphonic capture and grading through Basic Pitch, lazy-loaded so Tracks T and E cost no extra bytes; closed-voicing triads across four string sets and all inversions (F2); target practice (P3) and constrained improvisation over changes (P4); and the Play-Along Engine — bass, drums and comping generated from any Roman-numeral progression, in any key, tempo and feel. The chord grader answers with a diagnosis in scale degrees rather than a pass or a fail.

> **Gate passed for the chord half**, on a real acoustic into a laptop mic: F2 grades correctly-played triads correctly and names deliberate mistakes specifically. What it found was a false claim in the UI rather than a detection error — the feedback diagram ticked a fingering the microphone could not possibly have seen, since audio carries pitch but not string and fret. P3 and P4 remain unplayed, because they sit eighteen minutes into a Bench session; the graded-improvisation path is still unproven.

Phases are defined in `docs/phases.md`.
