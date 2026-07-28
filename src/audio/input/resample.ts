// Getting captured audio to the one sample rate Basic Pitch accepts.
//
// `evaluateModel` throws unless the audio is mono at 22050 Hz
// (AUDIO_SAMPLE_RATE in @spotify/basic-pitch@1.0.1's src/inference.ts, read
// rather than assumed — docs/phases.md open question 3), and a laptop's
// capture context runs at 44100 or 48000. Something has to bridge that.
//
// The browser will do it better than this module can: an OfflineAudioContext
// resamples with a real polyphase filter. This exists as the fallback for
// when a context cannot be constructed at the target rate, and as the
// version that can be tested without a Web Audio implementation.

export const TARGET_SAMPLE_RATE = 22050

// Downsampling without a lowpass folds everything above the new Nyquist back
// into the audible band as false partials, which is precisely the kind of
// spectral garbage a transcription model would report as notes. Averaging
// each output sample's whole input span, rather than picking one point out
// of it, is a box filter — the cheapest thing that is better than nothing.
//
// Be clear about what that buys: a box filter of this width first nulls at
// the new sample rate and gives roughly −12 dB near the new Nyquist, so it
// takes the top of the band down hard but leaves the middle largely intact.
// That is why it is the fallback and not the plan. The primary path lets an
// OfflineAudioContext resample, which uses a real polyphase filter.
export function resampleLinear(input: Float32Array, fromRate: number, toRate = TARGET_SAMPLE_RATE): Float32Array {
  if (fromRate <= 0) throw new Error(`Bad source sample rate: ${fromRate}`)
  if (fromRate === toRate) return input
  const ratio = fromRate / toRate
  const outLength = Math.floor(input.length / ratio)
  const out = new Float32Array(outLength)

  if (ratio < 1) {
    // Upsampling: no aliasing to worry about, so interpolate between
    // neighbours. (Not a case the app hits today — no capture context runs
    // below 22050 — but a resampler that silently mangles one direction is
    // a trap for whoever reaches for it next.)
    for (let i = 0; i < outLength; i++) {
      const pos = i * ratio
      const left = Math.floor(pos)
      const right = Math.min(left + 1, input.length - 1)
      const frac = pos - left
      out[i] = input[left] * (1 - frac) + input[right] * frac
    }
    return out
  }

  for (let i = 0; i < outLength; i++) {
    const start = i * ratio
    const end = start + ratio
    const first = Math.floor(start)
    const last = Math.min(Math.ceil(end), input.length)
    let sum = 0
    let weight = 0
    for (let j = first; j < last; j++) {
      // Partial weight for the samples the span only covers part of, so the
      // filter does not jitter with the fractional phase of each output.
      const w = Math.min(end, j + 1) - Math.max(start, j)
      if (w <= 0) continue
      sum += input[j] * w
      weight += w
    }
    out[i] = weight > 0 ? sum / weight : 0
  }
  return out
}

// Mix to mono by averaging. Capture asks for one channel, but a device that
// hands back two would otherwise reach the model as a channel count it
// rejects.
export function toMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0)
  if (channels.length === 1) return channels[0]
  const length = Math.min(...channels.map((c) => c.length))
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    let sum = 0
    for (const channel of channels) sum += channel[i]
    out[i] = sum / channels.length
  }
  return out
}

export function concatFloat32(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Float32Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

export function peakOf(samples: Float32Array): number {
  let peak = 0
  for (const s of samples) {
    const abs = Math.abs(s)
    if (abs > peak) peak = abs
  }
  return peak
}
