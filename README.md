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

## Status

Phase 0 (spine): theme system (OKLCH twelve-hue, light + dark), `tonal` wrapper, Tone.js playback with a bundled sampled piano, the T2 theory lesson and the E1 ear drill end to end with tap input, Spanish and English. Phases are defined in `docs/phases.md`.
