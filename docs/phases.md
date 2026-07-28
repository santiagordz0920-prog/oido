# Oído — Phases and open questions (brief §14, §17; non-goals §16)

## 14. Build phases

Ship something usable at every phase boundary.

**Phase 0, spine.** Vite and TypeScript scaffold, a `tonal` wrapper module, Tone.js playback, one theory lesson (T2) and one drill (E1) working end to end with tap input. Random selection, no scheduler yet. **Both light and dark themes from the start** (§15.2).

**Phase 1, brain.** FSRS, Elo and interleaving. Session runner with all four modes. Dexie persistence. Skill constellation view.

**Phase 2, curriculum.** Theory T1 through T12, ear E0 through E9. Corpus ingest and both JSON artifacts. Corpus Coverage live. Checkpoints. All drills transposed across 12 keys.

**Phase 3, ears open.** Mic input Tier 1. Calibration screen. P0 through P2, plus F0, F1 and F5. Tap fallback everywhere.

> **Gate passed** on a real acoustic guitar into a laptop mic, in a room with normal background noise: calibration confirmed the open low E, and P0 graded a played note correctly. Two bugs surfaced only under real use and neither was visible to the test suite — the noise floor was estimated from the room's loudest moment rather than its resting level, and attacks were judged frame-against-frame across an 85 ms analysis window that smears them, so a corrected note played over a ringing one never registered. Both are fixed and covered by tests written from the reported symptoms.

**Phase 4, chords in.** Basic Pitch and Tier 2 capture-and-grade. Track F triads (F2). P3 and P4. Play-Along Engine.

> **Gate passed for Tier 2** on a real acoustic guitar into a laptop mic: F2 graded correctly-played triads correctly, and named deliberate mistakes — wrong quality, wrong note underneath, an added ♭7 — as the specific thing that was wrong rather than a bare fail. The polyphonic path works on real playing.
>
> The bug it found was not in the grading. An open A major was played where the closed triad on strings {3,4,5} was asked for; the app passed it, correctly, since the pitch classes and the bass degree were right — and then drew the closed shape with ticks on it, as though that were what had just been played. **The diagram was claiming knowledge the microphone cannot have.** String and fret are not recoverable from audio: the same pitch lives in several places on the neck. The feedback diagram is now always drawn as the target and captioned as such, and register — which *is* audible, since an open voicing sits an octave below a closed one — is reported without failing the attempt.
>
> Worth noting for later phases: the bug was a false claim in the UI, not a detection error. Phase 3's pair were both in the signal path, which is where attention naturally goes. This one was in what the screen asserted about the signal.
>
> **Still unplayed: P3 and P4.** They live in the last block of a Bench session, eighteen minutes in, so the improvisation half of the gate has not been attempted. That reachability is itself worth fixing — a drill nobody can get to deliberately is hard to practise and hard to test.

**Phase 5, practice system.** Transcription Workbench, Assignments, Recording Archive with longitudinal comparison, Practice Log. P5 post-hoc analysis.

**Phase 6, depth.** T13 through T19, E10 through E14, F6. Full PWA and offline. Export.


## 17. Open questions

Resolve before the phase noted.

1. **RESOLVED (Phase 2).** McGill Billboard 2.0 is CC0 ("the DDMAL has waived all copyright and related or neighbouring rights"), with a request to cite Burgoyne, Wild & Fujinaga (ISMIR 2011) — both artifacts ship legally and carry the citation in their metadata. Hooktheory rejected (restrictive API terms), Isophonics rejected ("research purposes only").
2. **RESOLVED (Phase 2).** Calibration over the real corpus (890 songs, 5433 sections; see `scripts/calibrate-coverage.mts`): at the first chord-hearing milestone (E5+E6 mastered) coverage is 9.7% of songs / 30.1% of sections — not the feared near-zero — rising to 30.1% / 59.6% at full current grants. Decision: song-level percent stays the headline (the strong honest claim), with the per-section figure displayed beneath it as the early-progress signal. Before E5/E6, 0% is displayed and is simply true: no chord skill exists yet, and the constellation carries progress until then.
3. **RESOLVED (Phase 4).** Measured against `@spotify/basic-pitch@1.0.1` in Chromium.

   | | |
   |---|---|
   | Model files | 0.87 MB (`model.json` 170 KB + one 725 KB shard) |
   | JS added (tfjs + basic-pitch) | 1.03 MB raw, **257 KB gzipped** |
   | TFJS init | 33 ms |
   | Model graph load, warm cache | 51 ms |
   | **Cold start total** | **84 ms** |

   Well under the 3-second threshold, so **no eager preload during Track T and E**. Cold start was never the risk; the ~1.1 MB that has to arrive over the wire is, and that is a download problem rather than a startup one. Keep it behind a dynamic import so Tracks T and E cost zero extra bytes — the airport case — and warm it in the background only once a session that actually includes Track F or P begins.

   Inference measured 4.5 s for a 3-second buffer, but on the **CPU backend**: the test container has no GPU, so TFJS fell back from WebGL. That figure is a pessimistic floor, not a real-world number, and it needs re-measuring on the target machine before any latency decision rests on it.

   **Re-measured during Phase 4, and it changed the design.** Timing the same CPU backend across repeated runs showed the cost is not per-inference at all: the *first* inference took 7–8.5 s and every one after it settled at about 3.2 s, because TensorFlow.js compiles its kernels on first use. Window length barely mattered (2.0 s and 3.0 s of audio cost the same). So warming means loading the graph **and** running one throwaway inference over a silent buffer — about 7.5 s in the background at session start, after which each graded chord is steady. Without it the user's first chord of the session would take twice as long as every other one, which is the worst possible place to put the cost.

   The figures remain a CPU-backend floor. The mic check screen (`src/features/MicCheck.tsx`) now runs one drill per input tier and reports the load and inference times it measured, so the number for the machine that matters comes from that machine rather than from this note.

   Two integration facts verified in the source, not assumed: audio must be **mono at 22050 Hz** or `evaluateModel` throws (`AUDIO_SAMPLE_RATE` in `src/inference.ts`), so the 48 kHz capture path has to resample; and the constructor takes a model path or a `Promise<tf.GraphModel>`, which is the seam for lazy loading.
4. **Before Phase 5.** Recording Archive storage budget. How many minutes of audio before pruning, and what the user sees when the budget is hit.
5. **RESOLVED (Phase 3).** **Acoustic guitar into the laptop mic.** Tune every default for this case; an interface DI path is not a target. Consequences that drive the Tier 1 design:
   - Laptop mics roll off steeply below roughly 100–150 Hz, so the low E fundamental at 82.4 Hz arrives attenuated or effectively absent. MPM is the right choice precisely because it detects *periodicity* rather than a spectral fundamental — a missing fundamental does not change the period — but the octave-error guard is mandatory rather than optional.
   - Low signal-to-noise: room, fan, keyboard. The volume gate is measured per user in calibration (noise floor plus a margin), never a fixed constant.
   - No DI means body resonance, room reflections, and smeared pick transients, so onset blanking and multi-frame agreement carry more weight than they would on a clean electric signal.
   - Calibration confirms with an **open low E**, the worst case, and its failure copy names the physical fix (angle the soundhole toward the mic, move closer) instead of reporting a generic error.
   - **The gate is measured, not assumed.** Calibration derives both the noise floor (smoothed, low percentile — see architecture.md's Phase 3 addendum) and the margin above it, from the separation this room and this guitar actually achieve. A fixed margin was tried first and failed in a room with normal background noise: the floor estimate was inflated by transients and the guitar could never clear it.
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

