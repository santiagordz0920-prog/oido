# Oído — Curriculum (brief §5–9)

## 5. Track T, theory

**Format:** 2 to 4 minutes each, interactive rather than video, never a wall of text. Every lesson has four parts.

1. **A claim.** One sentence stating what the user will understand by the end.
2. **An audible demonstration** via Tone.js. The user hears the phenomenon before reading about it.
3. **A manipulable widget.** The user changes something and hears the result. Move the 7th down a semitone and hear the dominant collapse into a minor chord. This is where understanding actually happens.
4. **Three to five check questions.** Retrieval rather than recognition. These become FSRS items.

Hard rule: if a concept cannot be made audible and manipulable, it does not get a lesson. Notation-only content is out of scope.

| ID | Lesson | Unlocks |
|---|---|---|
| T1 | Harmonic series, where consonance comes from, why the octave and fifth are stable | E0 |
| T2 | The major scale as the measuring ruler. Degrees, not intervals | E1 |
| T3 | Tendency and resolution, why 7 wants 1 and 4 wants 3 | E2 |
| T4 | Key signatures and the circle of fifths as a map rather than a memorization chore | E3 |
| T5 | Minor in three forms, and why the raised 7 exists | E4 |
| T6 | Triad construction, the four qualities, what makes each sound as it does | E5, F2 |
| T7 | Harmonizing the scale, where the diatonic chords come from | E6 |
| T8 | **Functional harmony: tonic, subdominant, dominant.** The most important lesson in the app | E6, E7 |
| T9 | Cadences and phrase structure | E7 |
| T10 | Seventh chords, the tritone, why the dominant is unstable | E5, F3 |
| T11 | Voice leading and guide tones, how the 3rd and 7th carry the harmony | F4, F6 |
| T12 | Inversions and slash chords, bass independence | E11, F2 |
| T13 | Secondary dominants and temporary tonicization | E10 |
| T14 | Modal interchange and borrowed chords | E10 |
| T15 | Modes as harmonic color, explicitly not as "scales to play over chords" | E12 |
| T16 | Modulation: pivot, direct, chromatic | E13 |
| T17 | The blues and its anomalies, dominant on I, mixture, where theory bends | |
| T18 | Chromatic mediants, Neapolitan, augmented sixths | |
| T19 | Reharmonization and substitution | |

Lessons are consumable with headphones and no instrument. This is the airport, hotel and commute content, and it needs to be genuinely first-class rather than a degraded fallback.

---

## 6. Track E, ear

| ID | Stage | Mastery criteria |
|---|---|---|
| E0 | **Tonic retention.** Cadence, then growing silence, then a note. Is it the tonic? Everything depends on this | 90% at 8s silence |
| E1 | Stable degrees in major: 1, 3, 5. Name it, then sing the resolution | 90% over 30 items |
| E2 | Active degrees by tendency: 7 to 1, 4 to 3, 2 to 1, 6 to 5 | 90% over 30 |
| E3 | Full major scale, interleaved, response under 3s | 88%, median RT under 3s |
| E4 | Minor in three forms, contrasted against parallel major | 88% |
| E5 | Chord quality: maj, min, dim, aug, then maj7, min7, dom7, m7♭5, dim7 | 90% |
| E6 | Diatonic function in major, presented after a tonic cadence | 88% |
| E7 | Two-chord motions, ordered by corpus frequency | 88% |
| E8 | Four-bar progressions, ordered by corpus frequency, top 10 first | 85% |
| E9 | **Bass-line dictation.** Root motion only. The 80/20 of real transcription | 85% over 4 bars |
| E10 | Secondary dominants and borrowed chords (♭VII, iv, ♭VI, ♭III) | 85% |
| E11 | Inversions and slash chords | 85% |
| E12 | Modal color, identifying Dorian, Mixolydian, Aeolian and Lydian vamps | 85% |
| E13 | Modulation: detect it, find the pivot, name the new key relationship | 80% |
| E14 | Real time, calling changes as they pass with no pausing | 80% |

---

## 7. Track F, fretboard

| ID | Stage | Mastery criteria |
|---|---|---|
| F0 | Note names in all positions under time pressure, for example every G on strings 5 and 6 in 8 seconds | All 12 roots under 8s |
| F1 | Intervals from a given root across adjacent and skipped string pairs | 90% |
| F2 | **Triads, closed voicings, all inversions, string sets {1,2,3} {2,3,4} {3,4,5} {4,5,6}, all four qualities.** The highest-leverage block in the app, so budget time accordingly | 90% per string set |
| F3 | Seventh-chord shells (R-3-7, R-7-3) and drop-2 voicings | 88% |
| F4 | Voice-leading a progression across one string set with minimal movement | Movement threshold |
| F5 | Scale degree relative to a moving root, for example the ♭7 of the current chord | 85% |
| F6 | Guide-tone lines through changes, 3rds and 7ths only | 85% |

---

## 8. Track P, production

Requires audio input (§12.2). This is the part that separates the app from existing ear trainers.

| ID | Stage |
|---|---|
| P0 | **Sing what you play.** The app names a degree, the user plays it, then sings it. Verifies audiation of what the hands already do |
| P1 | **Play what you sing.** The user sings a phrase, the app transcribes it, the user then finds it on the guitar. The core improvisation unlock |
| P2 | **Play what you hear.** The app plays a three to five note fragment, the user reproduces it |
| P3 | **Target practice.** A vamp plays, the user improvises freely but must land a named chord tone on beat 1 of each bar |
| P4 | **Constrained improvisation over changes.** Guide tones only, then approach tones, then open |
| P5 | **Free improvisation with post-hoc analysis.** The user records over changes, and the app transcribes and shows which scale degrees they actually played over which chords |

P5 is the differentiating feature. No existing product does this, and it is what makes the app worth building rather than using something off the shelf.

---

## 9. Track W, practice and homework

The bridge between drills and real musicianship. Drills build components, and this track makes the user assemble them under real conditions. Treat it as co-equal with the drill engine.

### 9.1 The Assignment

Generated weekly from skill state as a finite, checkable list of three to five items. Concrete rather than aspirational.

> **This week**
> Transcribe the verse of a song of your choice in a major key, root motion only.
> Play all four inversions of Dm, G and C triads on string set {2,3,4}, ascending.
> Improvise 8 bars over a ii-V-I in three keys, landing the 3rd on beat 1.
> Review: T8 (functional harmony), T13 (secondary dominants).

Items are checked off manually, or verified automatically where the app can. Assignments expire and regenerate, and incomplete items roll forward with visible age. Never more than five items, because the constraint is what makes it get done.

### 9.2 Transcription Workbench

The most important tool in the app. The user loads their own audio file, kept local.

- Waveform with keyboard-driven loop-point selection.
- **Speed control with pitch preservation** using a phase vocoder or SoundTouch. Essential rather than optional.
- Tap tempo producing a bar grid overlay.
- Chord annotation lane, with entries auto-converting to Roman numerals once a key is set.
- **A scaffolded hint ladder.** Hint 1 gives the key, hint 2 the bass note of the bar, hint 3 the chord quality, hint 4 reveals. Each hint used is recorded. This preserves the desirable difficulty from §1.3 instead of destroying it with a single answer button.
- Completed transcriptions become drill items, so the user's own work becomes their curriculum.
- Optional assist: run the §12.2 Tier 3 pipeline and show low-confidence suggestions the user must confirm or correct. Corrections are high-value learning events, so log them.

### 9.3 Play-Along Engine

Generate a backing track from any progression, with bass, drums and comping, in any key, tempo and feel. Tone.js, driven by the same Roman-numeral data as everything else. Loop any section. Overlay practice targets such as chord tones and guide tones on request.

Cheap to build once the audio engine exists, and disproportionately useful, because it always presents whatever the user is currently working on.

### 9.4 Recording Archive

Every Track P recording is saved with the changes it was played over and its scale-degree analysis attached. Browsable and filterable by progression, key and date.

The payoff is longitudinal. Playing a June improvisation over a minor ii-V-i against a December one, back to back, is the most motivating thing the app can offer, and it contains no game mechanics at all. Build the comparison view explicitly rather than leaving the user to assemble it.

### 9.5 Practice Log

Auto-logged from in-app activity, with manual entry for off-app practice such as jamming or playing with others. Records time, content and self-rating. Feeds the consistency band and the heatmap. Exportable.

---

## Stages and checkpoints (Phase 2 addendum)

The curriculum built so far in this phase runs in three stages, each closed by a checkpoint: a timed challenge built from real corpus progressions, never a synthetic single-degree item. A checkpoint is pass/fail, and passing hard-gates the next stage's first theory lesson — a checkpoint the user cannot fail teaches nothing (docs/pedagogy.md §4.1).

| Checkpoint | After stage | Gates | Content |
|---|---|---|---|
| CP1 | Degrees (T1–T4, E0–E3) | T5 | Bass roots of corpus two-chord motions: a cadence, then two bass roots, major mode, plain-diatonic entries only. The answer is both degrees, in order, tapped into two slots from the seven degree chips. 8 items. |
| CP2 | Chords (T5–T7, E4–E6) | T8 | Corpus two-chord motions as full chords, major mode, the top 12 ranks. The answer is the second chord's Roman numeral, tapped from the seven diatonic numeral chips. 8 items. |
| CP3 | Progressions (T8–T12, E7–E9) | none yet (records completion; will gate Phase 3 tracks later) | Corpus four-chord progressions, major ranks 0–9 and minor ranks 0–5 combined, with a mode-aware cadence. The answer is picking the progression from four deterministic nearest-rank options. 8 items. |

Each item shows a visible 12-second countdown starting when the stimulus finishes; answering late fails the item and auto-advances. Passing requires at least 7 of the 8 items — no partial credit, no consolation on a miss. Stimulus replay is not offered during a checkpoint, unlike every other drill in the app: it is a test, not practice.

Checkpoints are timed corpus challenges, not FSRS items, and are kept out of the skill graph (`src/curriculum/graph.ts`) entirely rather than becoming a fourth track value. The graph only records which theory node each checkpoint gates (`CHECKPOINT_GATES`); item generation and pool selection live in `src/curriculum/checkpoints.ts`, and the challenge screen is `src/features/Checkpoint.tsx`, routed from the theory index once a lesson's only remaining gate is its checkpoint.

---
