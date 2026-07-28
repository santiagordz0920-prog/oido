import * as Tone from 'tone'
import { bassNote, chordDegreePitchClass, parseNumeral, progressionVoicings } from '../theory'
import { Note } from 'tonal'
import { ensureAudio, pianoSampler, stop as stopEngine } from './engine'
import {
  barPlan,
  barSeconds,
  bassPattern,
  compPattern,
  drumPattern,
  secondsPerBeat,
  swingBeat,
  type BassTone,
  type Feel,
  type PlanBar,
} from './patterns'

// The Play-Along Engine (docs/curriculum.md §9.3): a looping backing track
// generated from a Roman-numeral progression, in any key, tempo and feel.
// Bass, drums and comping, driven by the same numeral data as every drill,
// so whatever the user is currently working on is what they can play over.
//
// This is also the stimulus P3 and P4 improvise against, which is why the
// bar callback reports an audio-accurate wall-clock time rather than only
// firing an animation frame: grading "did you land the 3rd on beat 1"
// needs to know when beat 1 actually was, to a tighter tolerance than a
// repaint can promise.

// Instrument balance. The comp sits under the bass, and the kit under both:
// the backing track exists to be played over, so anything that competes with
// the user's own guitar is turned down rather than mixed forward. The piano
// parts are trimmed by velocity because the sampler is already routed to the
// destination — a second output path would double every note.
const COMP_VELOCITY = 0.62
const BASS_VELOCITY = 0.95
const KIT_DB = -14

// MetalSynth is pitched (it is a bank of inharmonic FM oscillators over a
// highpass), so the hat needs a base frequency even though nothing about it
// should read as a note. 320 Hz sits high enough to stay out of the way of
// the bass and the user's guitar.
const HAT_HZ = 320

export type BarEvent = {
  barIndex: number // position in the loop
  chordIndex: number // index into the numerals array
  numeral: string
  /** performance.now() estimate of this bar's downbeat. */
  atMs: number
  /** Bar length in ms, so a consumer can size its own grading window. */
  barMs: number
  /** How many times the loop has come round, starting at 0. */
  pass: number
}

export type PlayAlongParts = {
  bass?: boolean
  drums?: boolean
  comp?: boolean
}

export type PlayAlongOptions = {
  tonic: string
  numerals: string[]
  bpm?: number
  feel?: Feel
  barsPerChord?: number
  /** Bars of clicks before the loop starts. They play once, not every pass. */
  countInBars?: number
  parts?: PlayAlongParts
  /** Fires from the Transport callback, ahead of the sound, with atMs set. */
  onBar?: (bar: BarEvent) => void
  /** Fires on the animation frame the bar is heard on. For UI only. */
  onBarDraw?: (bar: BarEvent) => void
  /** Count-in clicks, on the animation frame, counting down to 1. */
  onCountIn?: (beatsLeft: number) => void
}

export type PlayAlong = {
  stop: () => void
  bars: PlanBar[]
  barSeconds: number
  bpm: number
}

export const DEFAULT_BPM = 90
export const MIN_BPM = 50
export const MAX_BPM = 200

// Resolve a bass hit to a sounding note. 'approach' is the semitone below
// the next chord's root: the walking line's pull into the change.
function bassNoteFor(tone: BassTone, tonic: string, numeral: string, nextNumeral: string): string | null {
  const spec = parseNumeral(tonic, numeral)
  if (tone === 'approach') {
    const nextRoot = parseNumeral(tonic, nextNumeral).root
    const midi = Note.midi(bassNote(nextRoot))
    if (midi === null) return null
    return Note.fromMidi(midi - 1)
  }
  if (tone === 'octave') {
    const midi = Note.midi(bassNote(spec.root))
    return midi === null ? null : Note.fromMidi(midi + 12)
  }
  const pc = chordDegreePitchClass(spec, tone === 'root' ? 1 : tone === 'third' ? 3 : 5)
  return pc === null ? null : bassNote(pc)
}

// performance.now() for an event scheduled at `time` on the audio clock.
// Both measure the same future instant; the difference is only which epoch
// they count from, so one subtraction converts between them.
function wallMsFor(time: number): number {
  return performance.now() + (time - Tone.getContext().currentTime) * 1000
}

type Kit = {
  kick: Tone.MembraneSynth
  snare: Tone.NoiseSynth
  hat: Tone.MetalSynth
  dispose: () => void
}

// Drums are synthesized rather than sampled, which is the one place the
// "sampled instruments only" rule (docs/architecture.md §12.1) does not
// apply: that rule exists because sine-wave triads train the wrong thing
// about *pitch*, and a kit is unpitched. Nothing here has to be recognized
// by ear, only felt.
function createKit(): Kit {
  const out = new Tone.Gain(Tone.dbToGain(KIT_DB)).toDestination()
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.03,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
  }).connect(out)
  const snare = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.16, sustain: 0 },
  }).connect(out)
  const hat = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.06, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 6000,
    octaves: 1.5,
  }).connect(out)
  hat.volume.value = -12
  return {
    kick,
    snare,
    hat,
    dispose: () => {
      kick.dispose()
      snare.dispose()
      hat.dispose()
      out.dispose()
    },
  }
}

let active: PlayAlong | null = null

/** The running backing track, if any. */
export function currentPlayAlong(): PlayAlong | null {
  return active
}

export async function startPlayAlong({
  tonic,
  numerals,
  bpm = DEFAULT_BPM,
  feel = 'straight',
  barsPerChord = 1,
  countInBars = 1,
  parts = {},
  onBar,
  onBarDraw,
  onCountIn,
}: PlayAlongOptions): Promise<PlayAlong> {
  const { bass = true, drums = true, comp = true } = parts
  await ensureAudio()

  // Clear whatever the drills left on the Transport before taking it over.
  stopEngine()
  active?.stop()

  const piano = pianoSampler()
  const transport = Tone.getTransport()
  const draw = Tone.getDraw()
  transport.bpm.value = bpm

  const plan = barPlan(numerals, barsPerChord)
  const beat = secondsPerBeat(bpm)
  const bar = barSeconds(bpm)
  const voicings = progressionVoicings(tonic, numerals)
  const kit = drums ? createKit() : null

  const loopStart = countInBars * bar
  const loopEnd = loopStart + plan.length * bar

  // Count-in clicks, before loopStart, so they sound once rather than on
  // every pass round the loop.
  for (let b = 0; b < countInBars; b++) {
    for (let i = 0; i < 4; i++) {
      const at = b * bar + i * beat
      const beatsLeft = (countInBars - b) * 4 - i
      transport.schedule((time) => {
        kit?.hat.triggerAttackRelease(HAT_HZ, '32n', time, i === 0 ? 0.5 : 0.3)
        if (onCountIn) draw.schedule(() => onCountIn(beatsLeft), time)
      }, at)
    }
  }

  let pass = -1
  for (const planBar of plan) {
    const at = loopStart + planBar.barIndex * bar
    // Voicings are voice-led across the whole progression, not per bar, so a
    // chord held over several bars keeps one voicing instead of re-voicing
    // itself mid-vamp.
    const voicing = voicings[planBar.chordIndex]

    transport.schedule((time) => {
      if (planBar.barIndex === 0) pass++
      const event: BarEvent = {
        barIndex: planBar.barIndex,
        chordIndex: planBar.chordIndex,
        numeral: planBar.numeral,
        atMs: wallMsFor(time),
        barMs: bar * 1000,
        pass: Math.max(0, pass),
      }
      onBar?.(event)
      if (onBarDraw) draw.schedule(() => onBarDraw(event), time)
    }, at)

    if (bass) {
      for (const hit of bassPattern(feel)) {
        const note = bassNoteFor(hit.tone, tonic, planBar.numeral, planBar.nextNumeral)
        if (!note) continue
        const when = at + swingBeat(hit.beat, feel) * beat
        const duration = feel === 'ballad' ? bar * 0.9 : beat * 0.85
        transport.schedule((time) => {
          piano.triggerAttackRelease(note, duration, time, hit.velocity * BASS_VELOCITY)
        }, when)
      }
    }

    if (comp) {
      const notes = voicing.upper
      for (const hit of compPattern(feel)) {
        const when = at + swingBeat(hit.beat, feel) * beat
        const duration = feel === 'ballad' ? bar * 0.85 : beat * 0.7
        transport.schedule((time) => {
          piano.triggerAttackRelease(notes, duration, time, hit.velocity * COMP_VELOCITY)
        }, when)
      }
    }

    if (kit) {
      for (const hit of drumPattern(feel)) {
        const when = at + swingBeat(hit.beat, feel) * beat
        transport.schedule((time) => {
          if (hit.piece === 'kick') kit.kick.triggerAttackRelease('C1', '8n', time, hit.velocity)
          else if (hit.piece === 'snare') kit.snare.triggerAttackRelease('16n', time, hit.velocity)
          else kit.hat.triggerAttackRelease(HAT_HZ, '32n', time, hit.velocity)
        }, when)
      }
    }
  }

  transport.loop = true
  transport.loopStart = loopStart
  transport.loopEnd = loopEnd
  transport.position = 0
  transport.start()

  let stopped = false
  const handle: PlayAlong = {
    bars: plan,
    barSeconds: bar,
    bpm,
    stop: () => {
      if (stopped) return
      stopped = true
      transport.stop()
      transport.cancel()
      transport.loop = false
      transport.position = 0
      kit?.dispose()
      if (active === handle) active = null
    },
  }
  active = handle
  return handle
}
