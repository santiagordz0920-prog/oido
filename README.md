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

Phase 3 (ears open, in progress): monophonic pitch input for **an acoustic guitar into the laptop mic** — MPM in an AudioWorklet, an octave-error guard that survives the mic's low-end roll-off, and a calibration screen that measures the room and confirms an open low E. Every mic drill keeps a tap fallback.

Phases are defined in `docs/phases.md`.
