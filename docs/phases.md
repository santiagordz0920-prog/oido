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

1. **RESOLVED (Phase 2).** McGill Billboard 2.0 is CC0 ("the DDMAL has waived all copyright and related or neighbouring rights"), with a request to cite Burgoyne, Wild & Fujinaga (ISMIR 2011) — both artifacts ship legally and carry the citation in their metadata. Hooktheory rejected (restrictive API terms), Isophonics rejected ("research purposes only").
2. **RESOLVED (Phase 2).** Calibration over the real corpus (890 songs, 5433 sections; see `scripts/calibrate-coverage.mts`): at the first chord-hearing milestone (E5+E6 mastered) coverage is 9.7% of songs / 30.1% of sections — not the feared near-zero — rising to 30.1% / 59.6% at full current grants. Decision: song-level percent stays the headline (the strong honest claim), with the per-section figure displayed beneath it as the early-progress signal. Before E5/E6, 0% is displayed and is simply true: no chord skill exists yet, and the constellation carries progress until then.
3. **Before Phase 4.** Basic Pitch model download size and cold-start time in-browser. If cold start exceeds roughly 3 seconds, preload it during Track T and E work.
4. **Before Phase 5.** Recording Archive storage budget. How many minutes of audio before pruning, and what the user sees when the budget is hit.
5. **RESOLVED (Phase 3).** **Acoustic guitar into the laptop mic.** Tune every default for this case; an interface DI path is not a target. Consequences that drive the Tier 1 design:
   - Laptop mics roll off steeply below roughly 100–150 Hz, so the low E fundamental at 82.4 Hz arrives attenuated or effectively absent. MPM is the right choice precisely because it detects *periodicity* rather than a spectral fundamental — a missing fundamental does not change the period — but the octave-error guard is mandatory rather than optional.
   - Low signal-to-noise: room, fan, keyboard. The volume gate is measured per user in calibration (noise floor plus a margin), never a fixed constant.
   - No DI means body resonance, room reflections, and smeared pick transients, so onset blanking and multi-frame agreement carry more weight than they would on a clean electric signal.
   - Calibration confirms with an **open low E**, the worst case, and its failure copy names the physical fix (angle the soundhole toward the mic, move closer) instead of reporting a generic error.
6. **Before Phase 6 (new, from calibration).** `f:chromatic` blocks 443 of 890 songs and is currently ungrantable. Blues dominants on diatonic roots are already tagged as diatonic functions, so this mass is mostly modal color (Dorian iv/IV, Mixolydian mixtures) and unresolved secondary-dominant shapes — exactly T15/E12 territory. When those nodes are designed, extend the ingest taxonomy (v2) to split modal-characteristic tags out of `f:chromatic`, and decide grants for the ungranted quality colors (`q:sus` blocks 322 songs, `q:ext` 196, `q:6` 159, `q:min6` 35). Re-run `scripts/ingest/billboard.mjs` and recalibrate.

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

