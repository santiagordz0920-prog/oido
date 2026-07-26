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
