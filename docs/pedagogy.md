# Oído — Pedagogy (brief §1–4)

## 1. Pedagogical foundation

### 1.1 Functional (tonic-referenced) hearing

The dominant failure mode of ear-training software is interval drilling, where the app plays two notes and asks for the distance between them. This produces learners who can identify a minor third in isolation and still cannot hear that a note is the ♭3 of the key they are in. Real harmonic hearing is relational. Every pitch carries an identity relative to a tonal center, and that identity is what lets you name a chord in a song.

Consequence: every pitch drill establishes a tonal center first with a short cadence, then presents the target. The answer space is scale degrees and Roman numerals. Interval naming appears nowhere in the UI.

Primary source: Gary Karpinski, *Aural Skills Acquisition* (Oxford University Press), which is the standard scholarly treatment of how aural skill is acquired, including the distinction between hearing, listening, identifying, and notating.

### 1.2 Audiation

Edwin Gordon's Music Learning Theory names the target skill as audiation, meaning the ability to hear and comprehend music that is not physically present. Improvisation is audiation plus execution. An app that only tests recognition trains half the circuit.

### 1.3 Desirable difficulties

Robert Bjork's work on learning conditions that feel harder and retain better. Four apply directly.

| Principle | Implementation |
|---|---|
| Spacing | FSRS scheduling per item (§10.1) |
| Interleaving | Never more than two consecutive items from one skill node |
| Generation | The user produces the answer before seeing options wherever possible |
| Retrieval practice | Drills are tests, not exposures. No passive study mode |

Blocked practice feels productive and transfers poorly. The scheduler must actively prevent it.

### 1.4 The 85% rule

Wilson et al. (2019) found that learning rate for tasks of this type is maximized near an 85% success rate. Per-skill-node Elo targets that band (§10.2). Difficulty is a continuous dial the app turns, not three buttons the user picks.

### 1.5 Root motion is the harmonic skeleton

In most popular music, bass root motion determines the analysis, and chord quality is an easier second question once the root is known. Teaching root motion early is the highest-leverage sequencing decision in the curriculum.

### 1.6 Intervallic over shape-based, for guitar

CAGED and three-notes-per-string are navigation systems rather than hearing systems, and they produce players who move shapes around without knowing what note they are on. The organizing unit here is the triad across a string set, and the organizing concept is voice leading, following Mick Goodrick's approach in *The Advancing Guitarist*.

### 1.7 Theory and practice interleave

Theory taught in isolation does not transfer, and drills without theory produce pattern-matching without understanding. Each theory lesson unlocks and explains the ear drill that immediately follows it, and each drill's feedback uses that lesson's vocabulary.

---

## 2. What the five tracks are

| Track | Name | Requires instrument |
|---|---|---|
| **T** | Theory, off-instrument micro-lessons | No |
| **E** | Ear, functional recognition | No |
| **F** | Fretboard fluency | Yes |
| **P** | Production, audiation to execution | Yes, plus mic |
| **W** | Practice and homework system | Mixed |

T gates E. E and F feed P. W integrates all of them against real music.

---

## 3. Source material and data

### 3.1 Theory engine

Use **`tonal`** (npm) for all note math, chord parsing, scale degrees, key detection, and Roman numeral conversion. Reimplementing enharmonic spelling and chord parsing is a multi-week tar pit.

### 3.2 Corpus data

Two purposes: ordering the curriculum, and computing the progress metric.

- **McGill Billboard dataset** (Burgoyne, Wild and Fujinaga), a large sample of Billboard-charting songs with hand-annotated chord transcriptions, released publicly for research. The best available source for empirical progression frequency in popular music.
- **Isophonics annotations** (Queen Mary, University of London), hand-annotated chords, keys and beats for the Beatles catalogue and others.
- **Hooktheory Trends**, a large user-contributed corpus surfaced as progression-frequency statistics. Check current API and licensing terms before ingesting anything programmatically.

Ingest offline and produce two static artifacts:

1. `/src/data/progression-frequency.json`, a frequency ranking of two-chord and four-chord Roman-numeral progressions in major and minor. The curriculum reads its ordering from this file. Do not hardcode a guessed ordering.
2. `/src/data/song-vocabulary.json`, listing per song the complete set of harmonic devices it uses (chord qualities, Roman numerals, secondary dominants, borrowed chords, modulations). This powers Corpus Coverage (§4.2).

### 3.3 Synthesize audio, do not ship recordings

This is a legal constraint, not a preference.

All drill and lesson audio is synthesized at runtime via Tone.js from Roman-numeral data. Chord progressions are not copyrightable. Specific recordings and melodies are.

Transcription work runs on user-supplied audio processed entirely on-device. Nothing uploads. Say so in the UI, since it is both a legal position and a real privacy feature.

No Spotify or Apple Music integration.

---

## 4. Progression system

The design problem is to make progress motivating without making it dishonest. Every number the user sees must be a true statement about their ability.

### 4.1 What to build

**The skill constellation.** A visible map of all nodes across all five tracks, with prerequisites drawn as edges. Not a linear path, because the user should be able to see the shape of the whole domain and locate themselves in it. Node states run locked, available, learning, familiar, mastered, maintained. Mastery decays visibly when FSRS review lapses, which is honest and also serves as the retention mechanic.

**Checkpoints.** At the end of each stage, a timed challenge using real corpus progressions rather than synthetic drills. Passing unlocks the next node. A checkpoint the user cannot fail teaches nothing, so these should feel like real tests.

**A consistency band instead of streaks.** Track sessions per rolling 14 days against a target band of roughly 6 to 12. Display it as a band the user is inside or drifting from, never as a chain that breaks. This user works weeks where practice is impossible, and the system has to absorb that without inducing guilt or abandonment. A missed week narrows the band's fill and resets nothing to zero.

**Session history heatmap.** Calendar view of practice minutes, purely informational.

### 4.2 Corpus Coverage, the headline metric

This replaces XP and is the most important motivational element in the app.

Using `song-vocabulary.json`, compute the percentage of songs in the corpus whose entire harmonic vocabulary consists of devices the user has mastered. Display it large and live on the home screen.

> **Corpus Coverage: 34%**
> You can hear the full harmony of roughly a third of this corpus.
> Next unlock: secondary dominants, +9%

The metric works because it is true. It rises because the user got better, it predicts which unlock is worth the most effort, and it converts abstract theory into a concrete capability claim.

Compute it conservatively. A song counts only if every device in it is mastered, not familiar, not partial. Under-claim rather than over-claim. Show the methodology on tap, since an unexplained percentage becomes a vanity number and an explained one becomes a map.

### 4.3 What to leave out, deliberately

These are decisions rather than oversights.

- **Fragile daily streaks.** Wrong mechanic for an unpredictable professional schedule, and the loss framing causes abandonment after the first inevitable break.
- **Gems, coins, shops, cosmetics.** Extrinsic reward currency risks undermining intrinsic motivation for a skill the user already wants to learn (Deci and Ryan, overjustification effect).
- **Leaderboards and social comparison.** This is a single-player tool, and competitive metrics distort practice toward whatever is gameable.
- **Confetti, mascots, celebratory sound effects.** The app gets used at night with headphones on and a guitar in hand.

---
