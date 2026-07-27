import * as Tone from 'tone'
import {
  cadenceVoicings,
  chordCloseVoicing,
  degreeNote,
  progressionVoicings,
  resolutionDegrees,
  scaleFormNotes,
  scaleNotes,
  type ChordSpec,
  type ScaleForm,
} from '../theory'

// All musical timing goes through Tone.Transport — never setTimeout.
// The piano is a local Salamander subset in /samples/piano, bundled so the
// app works offline; sine-wave triads train the wrong thing.

const SAMPLE_NOTES = [
  'C2', 'D#2', 'F#2', 'A2',
  'C3', 'D#3', 'F#3', 'A3',
  'C4', 'D#4', 'F#4', 'A4',
  'C5', 'D#5', 'F#5', 'A5',
  'C6',
] as const

let sampler: Tone.Sampler | null = null
let loading: Promise<void> | null = null

export function ensureAudio(): Promise<void> {
  if (loading) return loading
  loading = (async () => {
    await Tone.start()
    sampler = new Tone.Sampler({
      urls: Object.fromEntries(SAMPLE_NOTES.map((n) => [n, `${n.replace('#', 's')}.mp3`])),
      baseUrl: `${import.meta.env.BASE_URL}samples/piano/`,
      release: 1,
    }).toDestination()
    await Tone.loaded()
    const transport = Tone.getTransport()
    transport.bpm.value = 90
  })()
  loading = loading.catch((err) => {
    loading = null
    throw err
  })
  return loading
}

export function audioReady(): boolean {
  return sampler !== null
}

function stopPlayback() {
  const transport = Tone.getTransport()
  transport.stop()
  transport.cancel()
  transport.position = 0
}

type ScheduledNote = {
  time: number // seconds relative to transport start
  notes: string[]
  duration: number // seconds
  velocity?: number
  onStart?: () => void
}

let activeRun = 0

// Schedule a sequence on the Transport; resolves when the last note ends.
// UI callbacks fire through Tone.getDraw() so they land on animation frames.
function play(sequence: ScheduledNote[], onDone?: () => void): Promise<void> {
  const run = ++activeRun
  stopPlayback()
  const transport = Tone.getTransport()
  const draw = Tone.getDraw()
  return new Promise((resolve) => {
    for (const ev of sequence) {
      transport.schedule((time) => {
        sampler?.triggerAttackRelease(ev.notes, ev.duration, time, ev.velocity ?? 0.9)
        if (ev.onStart) draw.schedule(() => { if (run === activeRun) ev.onStart!() }, time)
      }, ev.time)
    }
    const end = Math.max(...sequence.map((ev) => ev.time + ev.duration)) + 0.1
    transport.schedule((time) => {
      draw.schedule(() => {
        if (run === activeRun) {
          onDone?.()
          resolve()
        }
      }, time)
      transport.stop(time + 0.05)
    }, end)
    transport.start()
  })
}

export function stop() {
  activeRun++
  stopPlayback()
}

// The major scale, 1 to 8, with a per-degree UI callback.
export function playScale(tonic: string, onDegree?: (degree: number) => void): Promise<void> {
  const notes = scaleNotes(tonic)
  const step = 0.45
  return play(
    notes.map((note, i) => ({
      time: i * step,
      notes: [note],
      duration: step * 0.95,
      onStart: onDegree ? () => onDegree(i + 1) : undefined,
    })),
    onDegree ? () => onDegree(0) : undefined,
  )
}

// One degree against a low tonic, for the T2 ruler widget.
export function playDegreeAgainstTonic(tonic: string, degree: number): Promise<void> {
  const target = degreeNote(tonic, degree)
  const low = degreeNote(tonic, 1)
  return play([
    { time: 0, notes: [low], duration: 1.6, velocity: 0.55 },
    { time: 0.5, notes: [target], duration: 1.1 },
  ])
}

// I–IV–V–I cadence to establish the key.
export function playCadence(tonic: string): Promise<void> {
  const voicings = cadenceVoicings(tonic)
  const dur = 0.75
  return play(
    voicings.map((v, i) => ({
      time: i * dur,
      notes: [v.bass, ...v.upper],
      duration: i === voicings.length - 1 ? dur * 1.6 : dur * 0.98,
      velocity: 0.8,
    })),
  )
}

export type CadenceThenDegreeOptions = {
  onTarget?: () => void
  // Silence between the cadence's last chord and the target note. E0's
  // difficulty dial: tonic retention is trained by growing this gap (§6).
  gapSeconds?: number
}

// Cadence, silence, then the target degree.
export function playCadenceThenDegree(
  tonic: string,
  degree: number,
  { onTarget, gapSeconds = 0.9 }: CadenceThenDegreeOptions = {},
): Promise<void> {
  const voicings = cadenceVoicings(tonic)
  const dur = 0.75
  const events: ScheduledNote[] = voicings.map((v, i) => ({
    time: i * dur,
    notes: [v.bass, ...v.upper],
    duration: i === voicings.length - 1 ? dur * 1.5 : dur * 0.98,
    velocity: 0.8,
  }))
  const targetTime = voicings.length * dur + gapSeconds
  events.push({
    time: targetTime,
    notes: [degreeNote(tonic, degree)],
    duration: 1.4,
    onStart: onTarget,
  })
  return play(events)
}

export function playDegree(tonic: string, degree: number): Promise<void> {
  return play([{ time: 0, notes: [degreeNote(tonic, degree)], duration: 1.4 }])
}

// One scale form ascending, for E4 (minor in three forms vs parallel major).
export function playScaleForm(tonic: string, form: ScaleForm, onDegree?: (degree: number) => void): Promise<void> {
  const notes = scaleFormNotes(tonic, form)
  const step = 0.45
  return play(
    notes.map((note, i) => ({
      time: i * step,
      notes: [note],
      duration: step * 0.95,
      onStart: onDegree ? () => onDegree(i + 1) : undefined,
    })),
    onDegree ? () => onDegree(0) : undefined,
  )
}

// A single chord in close position, twice (block, then again), for E5
// quality drills. No cadence — quality identification is context-free.
export function playChordQuality(spec: ChordSpec, inversion = 0): Promise<void> {
  const notes = chordCloseVoicing(spec, inversion)
  return play([
    { time: 0, notes, duration: 1.5, velocity: 0.85 },
    { time: 1.8, notes, duration: 1.8, velocity: 0.8 },
  ])
}

// Cadence, a breath, then one diatonic chord voiced in context, for E6.
export function playCadenceThenNumeral(tonic: string, numeral: string, onTarget?: () => void): Promise<void> {
  const cadence = cadenceVoicings(tonic)
  const target = progressionVoicings(tonic, [numeral])[0]
  const dur = 0.75
  const events: ScheduledNote[] = cadence.map((v, i) => ({
    time: i * dur,
    notes: [v.bass, ...v.upper],
    duration: i === cadence.length - 1 ? dur * 1.5 : dur * 0.98,
    velocity: 0.8,
  }))
  events.push({
    time: cadence.length * dur + 0.9,
    notes: [target.bass, ...target.upper],
    duration: 2,
    onStart: onTarget,
  })
  return play(events)
}

export type ProgressionOptions = {
  chordSeconds?: number // duration of each chord
  onChord?: (index: number) => void // fires as each chord sounds; -1 when done
}

// Establishing cadences by mode: harmonic-minor V in minor, so the key is
// unambiguous before the target progression sounds.
const CADENCE_NUMERALS: Record<'major' | 'minor', string[]> = {
  major: ['I', 'IV', 'V', 'I'],
  minor: ['i', 'iv', 'V', 'i'],
}

// Mode-aware cadence, a breath, then a target progression — the E7/E8
// stimulus. The cadence is slightly softer and quicker than the target so
// the two read as context vs. question.
export function playCadenceThenProgression(
  tonic: string,
  mode: 'major' | 'minor',
  numerals: string[],
  { chordSeconds = 1.0, onChord }: ProgressionOptions = {},
): Promise<void> {
  const cadence = progressionVoicings(tonic, CADENCE_NUMERALS[mode])
  const target = progressionVoicings(tonic, numerals)
  const cDur = 0.7
  const events: ScheduledNote[] = cadence.map((v, i) => ({
    time: i * cDur,
    notes: [v.bass, ...v.upper],
    duration: i === cadence.length - 1 ? cDur * 1.4 : cDur * 0.98,
    velocity: 0.7,
  }))
  const start = cadence.length * cDur + 1.0
  for (const [i, v] of target.entries()) {
    events.push({
      time: start + i * chordSeconds,
      notes: [v.bass, ...v.upper],
      duration: i === target.length - 1 ? chordSeconds * 1.6 : chordSeconds * 0.98,
      velocity: 0.9,
      onStart: onChord ? () => onChord(i) : undefined,
    })
  }
  return play(events, onChord ? () => onChord(-1) : undefined)
}

// Cadence, then the progression's BASS ROOTS only — E9 bass-line dictation.
export function playCadenceThenBassLine(
  tonic: string,
  mode: 'major' | 'minor',
  numerals: string[],
  { chordSeconds = 1.0, onChord }: ProgressionOptions = {},
): Promise<void> {
  const cadence = progressionVoicings(tonic, CADENCE_NUMERALS[mode])
  const target = progressionVoicings(tonic, numerals)
  const cDur = 0.7
  const events: ScheduledNote[] = cadence.map((v, i) => ({
    time: i * cDur,
    notes: [v.bass, ...v.upper],
    duration: i === cadence.length - 1 ? cDur * 1.4 : cDur * 0.98,
    velocity: 0.7,
  }))
  const start = cadence.length * cDur + 1.0
  for (const [i, v] of target.entries()) {
    events.push({
      time: start + i * chordSeconds,
      notes: [v.bass],
      duration: chordSeconds * 0.95,
      velocity: 0.95,
      onStart: onChord ? () => onChord(i) : undefined,
    })
  }
  return play(events, onChord ? () => onChord(-1) : undefined)
}

// A Roman-numeral progression, voice-led, bass plus upper voices — the shared
// renderer for E6–E8 drills, checkpoints, and later the Play-Along engine.
export function playProgression(
  tonic: string,
  numerals: string[],
  { chordSeconds = 1.1, onChord }: ProgressionOptions = {},
): Promise<void> {
  const voicings = progressionVoicings(tonic, numerals)
  return play(
    voicings.map((v, i) => ({
      time: i * chordSeconds,
      notes: [v.bass, ...v.upper],
      duration: i === voicings.length - 1 ? chordSeconds * 1.6 : chordSeconds * 0.98,
      velocity: 0.8,
      onStart: onChord ? () => onChord(i) : undefined,
    })),
    onChord ? () => onChord(-1) : undefined,
  )
}

// Stepwise resolution of a stable degree down to the tonic.
export function playResolution(tonic: string, degree: number, onDegree?: (degree: number) => void): Promise<void> {
  const path = resolutionDegrees(degree)
  const step = 0.55
  return play(
    path.map((d, i) => ({
      time: i * step,
      notes: [degreeNote(tonic, d)],
      duration: i === path.length - 1 ? step * 2 : step * 0.95,
      onStart: onDegree ? () => onDegree(d) : undefined,
    })),
    onDegree ? () => onDegree(0) : undefined,
  )
}
