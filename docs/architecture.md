# Oído — Architecture (brief §10–13)

## 10. Scheduling engine

### 10.1 Spaced repetition

Use **`ts-fsrs`** (npm) rather than implementing SM-2. One card per pairing of skill node and key context. Theory check questions are FSRS items too, because theory decays like everything else.

### 10.2 Adaptive difficulty

Per-user, per-skill-node Elo against per-item difficulty ratings. Select items whose difficulty places expected success near 0.85. Start with K around 24 and tune later.

Continuous difficulty parameters:

- stimulus tempo
- number of chords in the progression
- elapsed time since the tonic was established, where longer is harder
- whether the key is stated or must be inferred
- whether inversions are permitted
- distractor similarity in multiple choice
- transposition across all 12 keys

Never drill in C only. Key-specific learning does not transfer.

### 10.3 Interleaving constraint

A hard constraint in the selection loop rejects any candidate that would produce a third consecutive item from the same node. If the due set cannot satisfy it, pull a review item from an adjacent track.

### 10.4 Session modes

Mode is chosen at session start and determines the track mix.

| Mode | Length | Context | Content |
|---|---|---|---|
| Deskside | 3 min | Between meetings | One theory lesson or one drill set |
| Commute | 10 min | Headphones, no instrument | Theory and Track E only |
| Bench | 25 min | Guitar in hand | 3 min tonic warm-up, 15 min mixed T/E/F, 7 min P |
| Deep | 50 min | Weekend | Assignment work, transcription workbench, recording |

The no-instrument modes are what let this survive a travel week.

---

## 11. Data model

```ts
type Track = 'T'|'E'|'F'|'P'|'W';

type SkillNode = {
  id: string;                      // "T8", "E6", "F2.stringset.234"
  track: Track;
  prerequisites: string[];
  unlocks: string[];
  masteryCriteria: {accuracy:number; minItems:number; maxMedianRT?:number};
  corpusDevices: string[];         // harmonic devices this node grants, for Coverage
};

type Item = {
  id: string;
  nodeId: string;
  kind: 'recognition'|'production'|'theory-check'|'fretboard'|'checkpoint';
  params: Record<string, unknown>;
  difficulty: number;              // Elo
};

type Attempt = {
  itemId: string;
  ts: number;
  correct: boolean;
  latencyMs: number;
  inputMode: 'tap'|'sung'|'played';
  hintsUsed?: number;
  detectionConfidence?: number;
  response: unknown;
};

type Assignment = {
  id: string;
  issuedAt: number;
  expiresAt: number;
  items: {description:string; nodeId:string; done:boolean; autoVerifiable:boolean}[];
};

type Recording = {
  id: string;
  ts: number;
  audioBlob: Blob;
  progression: string[];           // Roman numerals
  key: string;
  analysis: {chordIndex:number; degreesPlayed:string[]}[];
};

type Transcription = {
  id: string;
  sourceFileName: string;          // audio never leaves the device
  key: string;
  bars: {index:number; chord:string; roman:string; confirmed:boolean}[];
  hintsUsed: number;
  completedAt?: number;
};
```

Persist to IndexedDB via **Dexie**. Recording blobs will grow, so implement a size budget with oldest-first pruning the user can override. Export and import everything as JSON, since the user owns the data and there is no server.

---

## 12. Audio subsystems

### 12.1 Output

**Tone.js.** All musical timing goes through `Tone.Transport` and never through `setTimeout`. Use sampled piano and clean electric guitar rather than raw oscillators, because timbre affects learnability and sine-wave triads train the wrong thing. Voice chords realistically with inversions, since real music does not use root-position blocks and the user has to learn to hear through voicings.

### 12.2 Input

Scope this as verification against a known expected answer rather than open transcription. The app almost always knows what the user is supposed to play, which turns a research problem into a scoring problem.

**Tier 1, monophonic real time.** A solved problem. Use the McLeod Pitch Method or YIN via `pitchy` or `pitchfinder`, running in an **AudioWorklet** rather than the deprecated `ScriptProcessorNode`. Covers P0 through P2, F0, F1 and F5.

Browser defaults will destroy pitch detection, so the constraints matter:

```js
navigator.mediaDevices.getUserMedia({
  audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}
})
```

Low E at roughly 82 Hz needs an analysis window of at least 4096 samples. Apply a confidence threshold and temporal hysteresis to suppress octave errors and pick transients.

**Tier 2, polyphonic capture and grade.** Use **`@spotify/basic-pitch`** (npm), a lightweight polyphonic instrument-agnostic note transcription model that runs in-browser via TensorFlow.js under Apache 2.0, and handles guitar well. Its `evaluateModel` operates on an `AudioBuffer`, so the natural pattern is capturing a 2 to 4 second window and grading it rather than streaming continuously. That fits a drill app. Verify the current API against the repo before coding.

Grade by comparing the detected pitch-class set against the expected template plus a small set of likely confusions (relative major and minor, sus against add9, inversion against root position). Return a diagnostic such as "you played the ♭7, this chord is a triad" rather than a bare pass or fail.

**Tier 3, full-mix analysis** for the workbench assist in §9.2. Decode to an AudioBuffer, compute a chromagram (a bank of Goertzel detectors per semitone from E2 to E6 folded into 12 bins is cheap and precise enough, or use a CQT), estimate beats and downbeats for segmentation, estimate key (Krumhansl-Schmuckler profile correlation as a baseline), match templates per segment, and convert to Roman numerals. Present the top two candidates with confidence and never false certainty. Dense mixes will be wrong sometimes, so say so in the UI.

**A fallback path is mandatory.** Every input-dependent drill needs a tap equivalent. Ship a calibration screen showing input level and noise floor, with a "play an open E" confirmation, before any session that needs the mic.

---

## 13. Tech stack

| Layer | Choice | Note |
|---|---|---|
| Framework | React, TypeScript, Vite | |
| State | Zustand | |
| Theory | `tonal` | §3.1 |
| Audio out | `tone` | Sampled instruments |
| Pitch, mono | `pitchy` or `pitchfinder` | In an AudioWorklet |
| Pitch, poly | `@spotify/basic-pitch` | Verify current API |
| Time-stretch | SoundTouch or a phase vocoder | §9.2, pitch-preserving |
| Scheduling | `ts-fsrs` | |
| Storage | Dexie over IndexedDB | Blob budget for recordings |
| Styling | Tailwind | Tokens per §15 |
| PWA | `vite-plugin-pwa` | Offline-first |
| Notation | Skip for now | VexFlow later only if truly needed |

The Basic Pitch model and the instrument samples are the heavy assets, so lazy-load both. The app must be fully usable for Tracks T and E before the polyphonic model finishes downloading, since that is the airport case and the most common one.

---

## Tier 1 input as built (Phase 3 addendum)

Input is an acoustic guitar into a laptop mic (phases.md open question 5), which decides most of what follows.

**Detection.** MPM (`pitchy`) over 4096-sample frames at a 1024 hop, inside an AudioWorklet. MPM is the right choice here rather than a default one: a laptop mic rolls off below roughly 100–150 Hz, so the open low E's fundamental at 82.4 Hz arrives attenuated or missing, and MPM detects *periodicity* — which a missing fundamental does not change. Measured against a synthetic signal with the fundamental removed entirely, it still reports 82.41 Hz at 0.999 clarity.

**Octave errors.** When detection does slip on this input it slips an octave up, so the worklet also reports the magnitude at 1.5× the candidate frequency (a pair of Goertzel evaluations, cheaper and more precise than an FFT bin). A partial there can only belong to a fundamental an octave below, which makes the test survive the very roll-off that causes the problem — unlike looking for the fundamental itself. `src/audio/input/spectrum.ts`, with the guard tested in both directions.

**Calibration measures two numbers, not one** (`src/features/Calibration.tsx`, `src/state/mic.ts`):

1. *The noise floor.* A short moving average over the frame RMS, then a **low** percentile of the smoothed signal. Both halves matter. Raw frames carry single-frame transients — a chair, a car, a keystroke — so a high percentile of the raw signal reports the room's loudest moment as its floor. Averaging alone does not fix it either, since a loud burst still drags a mean upward. Smoothing removes the spikes and a low percentile answers the question actually being asked: what level does this room sit at when nothing is happening?
2. *The gate margin.* Derived from the separation this room and this guitar actually achieve, not assumed. The gate sits at the midpoint in dB between the measured floor and the level the guitar reached, clamped to 4–12 dB. A fixed margin fails in both directions: too wide and a room with normal background noise blocks the guitar (this was a real reported failure, not a hypothetical), too tight and the room reaches the detector.

Biasing the floor low is safe because volume is not the only gate. Clarity, the pitch range, and multi-frame agreement all have to agree before a note is reported, and room noise satisfies none of them.

The summary screen shows all three figures — room, guitar, gate — so a misfiring setup is diagnosable rather than mysterious.

**Reaching the drills.** `MicCheck` (`src/features/MicCheck.tsx`) runs a single P0 item straight from the microphone card. P0 otherwise lives in a session's production block fifteen minutes in, which is right for practice and wrong for answering "is my mic working?". The attempt is recorded like any other, so a setup check is never wasted practice.

**Dials.** `DEFAULT_CONFIG` in `src/audio/input/stabilize.ts` holds every threshold — clarity, gate margin, onset blanking, agreement window, release.

---

## Tier 2 input and the Play-Along Engine as built (Phase 4 addendum)

**Lazy by construction, not by intention.** Basic Pitch and TensorFlow.js are ~1.03 MB raw / 257 KB gzipped, and the model another 0.87 MB. Everything reaches them through a dynamic `import()` in `src/audio/input/poly.ts`, so the production build emits them as a separate chunk that the entry bundle only references inside `import()` — verified in `dist/`, with no `modulepreload` for it. Tracks T and E cost nothing extra, which is the airport case. A session whose blocks include Track F or P calls `warmPoly()` at session start.

**Warming is two things.** Loading the graph is fast; compiling the kernels is not. The first inference costs 7–8.5 s against ~3.2 s for every one after it (phases.md open question 3), so `warmPoly()` also runs one throwaway inference over a short silent buffer. Skipping that would put the entire one-time cost on the user's first graded chord.

**The model is a public asset, not an import.** `public/models/basic-pitch/`. Its `model.json` names its weight shard by a relative path, so bundling the JSON alone emits a manifest pointing at a file nobody copied; and a public asset is fetched only when requested, which is the property the dynamic import exists to protect. Same arrangement as the piano samples.

**Capture.** `src/audio/input/captureWorklet.ts` does no analysis at all — Tier 2 grades a window rather than streaming, so it only accumulates raw blocks and posts them in chunks. The capture `AudioContext` is opened at 22050 Hz directly, which makes the browser resample with its own polyphase filter; when a platform will not honour that, `resampleLinear` covers it. That fallback averages each output sample's whole input span, which gives roughly −12 dB near the new Nyquist rather than silence — it is a fallback, and the test pins the attenuation actually measured.

**Grading is scoring, not transcription** (§12.2). `gradeChord` never asks what chord this is; it asks whether this is *that* chord and, if not, what specifically differs. It works in semitones above the expected root, so spelling never enters, and it names the confusions the brief calls for: added seventh, suspension, relative major/minor, another quality on the same root, a missing degree, and the right notes with the wrong one underneath. It also drops notes far quieter or shorter than the chord, because a strummed acoustic leaks sympathetic ringing and grading that as a wrong note would fail correct playing. Dials: `DEFAULT_GRADE_OPTIONS` in `src/audio/input/chordGrade.ts` and the thresholds at the top of `poly.ts`.

**One grader, two input paths.** F2's tap answers are turned into the notes those frets would sound and handed to the same `gradeChord`. The tap fallback is a different way in, not a different standard.

**The Play-Along Engine** (`src/audio/playalong.ts`, patterns in `src/audio/patterns.ts`) loops a Roman-numeral progression on `Tone.Transport` with bass, drums and comping. A count-in sits before `loopStart` so it sounds once rather than every pass. Looping a section is playing a slice of the progression — the engine loops whatever it is handed. The kit is synthesized rather than sampled: the sampled-instruments rule (§12.1) exists because sine-wave triads train the wrong thing about *pitch*, and a kit is unpitched.

**Timing for graded improvisation.** The bar callback reports an audio-accurate `performance.now()` for each downbeat, computed inside the Transport callback from the event's audio time — a repaint cannot promise the tolerance P3 needs. Detector times are bridged to the same clock by a single offset taken at the first note (`createClockBridge`), and then corrected by `DETECTION_LATENCY_MS`: Tier 1 is systematically late by roughly 130 ms (a 4096-sample window, 45 ms of onset blanking, three frames of agreement at a 1024 hop), and grading "on the beat" without subtracting it marks good playing late. The correction lives in one place, in `src/audio/input/improv.ts`, where it can be argued with.
