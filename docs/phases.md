# Oído — Phases and open questions (brief §14, §17; non-goals §16)

## 14. Build phases

Ship something usable at every phase boundary.

**Phase 0, spine.** Vite and TypeScript scaffold, a `tonal` wrapper module, Tone.js playback, one theory lesson (T2) and one drill (E1) working end to end with tap input. Random selection, no scheduler yet. **Both light and dark themes from the start** (§15.2).

**Phase 1, brain.** FSRS, Elo and interleaving. Session runner with all four modes. Dexie persistence. Skill constellation view.

**Phase 2, curriculum.** Theory T1 through T12, ear E0 through E9. Corpus ingest and both JSON artifacts. Corpus Coverage live. Checkpoints. All drills transposed across 12 keys.

**Phase 3, ears open.** Mic input Tier 1. Calibration screen. P0 through P2, plus F0, F1 and F5. Tap fallback everywhere.

**Phase 4, chords in.** Basic Pitch and Tier 2 capture-and-grade. Track F triads (F2). P3 and P4. Play-Along Engine.

**Phase 5, practice system.** Transcription Workbench, Assignments, Recording Archive with longitudinal comparison, Practice Log. P5 post-hoc analysis.

**Phase 6, depth.** T13 through T19, E10 through E14, F6. Full PWA and offline. Export.


## 17. Open questions

Resolve before the phase noted.

1. **Before Phase 2.** Which corpus in §3.2 has licensing terms compatible with shipping both a derived frequency table and a per-song vocabulary table.
2. **Before Phase 2.** Corpus Coverage calibration. If the conservative definition leaves coverage near 0% for weeks, it demotivates instead of motivating, and the fix is probably scoring per section rather than per song. Needs real data to decide.
3. **Before Phase 4.** Basic Pitch model download size and cold-start time in-browser. If cold start exceeds roughly 3 seconds, preload it during Track T and E work.
4. **Before Phase 5.** Recording Archive storage budget. How many minutes of audio before pruning, and what the user sees when the budget is hit.
5. **Before Phase 3.** Whether input is electric through an interface or acoustic into a laptop mic. This materially changes detection tuning, so ask and set defaults for the real case.

## 16. Non-goals

Do not build these, and do not build abstractions in anticipation of them.

- Accounts, sync, social features, leaderboards
- Streaming service integration
- Notation engraving
- MIDI hardware input
- Rhythm and timing training, since the user has 16 years of drumming
- Video lessons
- Native mobile wrappers
- Any invented reward currency (§4.3)
- Marketing site, logo lockup variants, favicon sets, app store assets, onboarding tours

The design system is enough to make the product coherent and enough to launch from later. Everything past it waits for a reason.

