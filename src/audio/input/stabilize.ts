import { hzToMidiFloat, midiToHz } from './notes'

// Turning a stream of raw MPM readings into stable note events.
//
// Every default here is tuned for an acoustic guitar into a laptop mic
// (docs/phases.md open question 5), which fails in specific ways:
//
//   * The mic rolls off below roughly 100–150 Hz, so the low E fundamental
//     is attenuated or gone. MPM still finds the right period — periodicity
//     survives a missing fundamental — but when it does slip, it slips an
//     octave UP, so that is the error this module is built to catch.
//   * Room noise sits close to quiet playing, so the volume gate is derived
//     from a measured floor rather than a constant.
//   * Pick transients and body resonance smear the first tens of
//     milliseconds of every note, so onsets are blanked and a note is only
//     reported once several frames agree.

export type DetectorFrame = {
  tMs: number
  hz: number // 0 when the detector found nothing
  clarity: number // MPM clarity, 0..1
  rms: number // linear amplitude
  // Magnitude at 1.5x the candidate relative to magnitude at the candidate.
  // A partial sitting halfway between the candidate and its octave can only
  // exist if the true fundamental is an octave BELOW the candidate, so this
  // detects octave-up errors even when the real fundamental was filtered
  // away by the mic — which is exactly the acoustic-into-laptop case.
  halfHarmonicRatio: number
}

export type StabilizerConfig = {
  noiseFloorRms: number
  gateMarginDb: number
  clarityThreshold: number
  minHz: number
  maxHz: number
  onsetRiseRatio: number
  onsetBaselineFrames: number
  onsetBlankMs: number
  windowFrames: number
  agreeFrames: number
  agreeCents: number
  releaseMs: number
  subOctaveRatio: number
  octaveSwitchClarity: number
}

export const DEFAULT_CONFIG: StabilizerConfig = {
  noiseFloorRms: 0.005,
  gateMarginDb: 12,
  clarityThreshold: 0.85,
  minHz: 70,
  maxHz: 1400,
  // Judged against the quietest of the last 5 frames (~105 ms), which is the
  // level before the attack began rather than part-way up it.
  onsetRiseRatio: 2.2,
  onsetBaselineFrames: 5,
  onsetBlankMs: 45,
  windowFrames: 5,
  agreeFrames: 3,
  agreeCents: 45,
  releaseMs: 160,
  subOctaveRatio: 0.4,
  octaveSwitchClarity: 0.93,
}

export type NoteEvent =
  | { kind: 'note'; midi: number; hz: number; cents: number; clarity: number; tMs: number }
  | { kind: 'off'; tMs: number }

export function dbToRatio(db: number): number {
  return 10 ** (db / 20)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

type Entry = { tMs: number; midiFloat: number }

export type Stabilizer = {
  push: (frame: DetectorFrame) => NoteEvent | null
  reset: () => void
  /** The note currently held, or null. Exposed for meters and tests. */
  current: () => number | null
}

export function createStabilizer(config: StabilizerConfig = DEFAULT_CONFIG): Stabilizer {
  const gateRms = config.noiseFloorRms * dbToRatio(config.gateMarginDb)
  let history: Entry[] = []
  let stableMidi: number | null = null
  let blankUntilMs = -Infinity
  let recentRms: number[] = []
  let quietSinceMs: number | null = null

  function reset() {
    history = []
    stableMidi = null
    blankUntilMs = -Infinity
    recentRms = []
    quietSinceMs = null
  }

  // A new attack, judged against the level BEFORE it started rather than the
  // previous frame. The analysis window is 85 ms wide, so a pluck's attack is
  // smeared across several frames and the frame-to-frame rise is gradual —
  // comparing neighbours misses almost every onset. Comparing against the
  // quietest of the last few frames sees the whole rise, while staying flat
  // during sustain (recent frames match the current one) and during decay
  // (recent frames are louder, never quieter).
  function isOnset(rms: number): boolean {
    if (recentRms.length < config.onsetBaselineFrames) return false
    const baseline = Math.min(...recentRms)
    return baseline > 0 && rms / baseline >= config.onsetRiseRatio
  }

  function push(frame: DetectorFrame): NoteEvent | null {
    const { tMs, clarity, rms } = frame

    // 1. Volume gate against the measured floor. Below it there is nothing
    //    to analyze, and holding a note through real silence would be a lie.
    if (rms < gateRms) {
      recentRms = []
      history = []
      quietSinceMs ??= tMs
      if (stableMidi !== null && tMs - quietSinceMs >= config.releaseMs) {
        stableMidi = null
        return { kind: 'off', tMs }
      }
      return null
    }
    quietSinceMs = null

    // 2. An attack ends the previous note and starts a new one.
    //
    //    Reporting only pitch CHANGES is not enough on a guitar. Playing the
    //    same note twice is a new answer, and a note played over one that is
    //    still ringing has to be able to win. Waiting for the old note to
    //    decay under the gate does not work either: on an acoustic that takes
    //    seconds, and the quieter the gate the longer it takes.
    //
    //    So each attack clears the held note. The old one is released now,
    //    the new one is reported as soon as the frames agree — including when
    //    it is the same pitch as before.
    const onset = isOnset(rms)
    recentRms.push(rms)
    if (recentRms.length > config.onsetBaselineFrames) recentRms.shift()
    if (onset) {
      blankUntilMs = tMs + config.onsetBlankMs
      history = []
      recentRms = [rms]
      if (stableMidi !== null) {
        stableMidi = null
        return { kind: 'off', tMs }
      }
      return null
    }
    if (tMs < blankUntilMs) return null

    // 3. Confidence and range gates. A dropped frame does not clear the
    //    history — brief losses are normal on a decaying acoustic note.
    if (frame.hz <= 0 || clarity < config.clarityThreshold) return null
    if (frame.hz < config.minHz || frame.hz > config.maxHz) return null

    // 4. Octave-up correction from spectral evidence (see halfHarmonicRatio).
    let hz = frame.hz
    if (frame.halfHarmonicRatio >= config.subOctaveRatio && hz / 2 >= config.minHz) {
      hz = hz / 2
    }

    // 5. Octave-flicker guard against the held note. A real octave change is
    //    played deliberately and reads clearly; a detector slip does not.
    //    Ambiguous frames are dropped rather than corrected, so a genuine
    //    octave jump can still win on the evidence of later frames.
    const midiFloat = hzToMidiFloat(hz)
    if (stableMidi !== null && clarity < config.octaveSwitchClarity) {
      const semitonesAway = Math.abs(midiFloat - stableMidi)
      if (Math.abs(semitonesAway - 12) < 0.5 || Math.abs(semitonesAway - 24) < 0.5) return null
    }

    // 6. Temporal agreement. A note is only reported once most of a short
    //    window lands within a semitone-ish of the same pitch.
    history.push({ tMs, midiFloat })
    if (history.length > config.windowFrames) history.shift()
    if (history.length < config.agreeFrames) return null

    const values = history.map((e) => e.midiFloat)
    const centre = median(values)
    const agreeing = values.filter((v) => Math.abs(v - centre) * 100 <= config.agreeCents)
    if (agreeing.length < config.agreeFrames) return null

    const midi = Math.round(centre)
    if (midi === stableMidi) return null
    stableMidi = midi

    const centreHz = midiToHz(centre)
    return {
      kind: 'note',
      midi,
      hz: centreHz,
      cents: (centre - midi) * 100,
      clarity,
      tMs,
    }
  }

  return { push, reset, current: () => stableMidi }
}
