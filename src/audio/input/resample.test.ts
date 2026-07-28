import { describe, expect, it } from 'vitest'
import { concatFloat32, peakOf, resampleLinear, TARGET_SAMPLE_RATE, toMono } from './resample'

function sine(hz: number, rate: number, seconds: number): Float32Array {
  const out = new Float32Array(Math.round(rate * seconds))
  for (let i = 0; i < out.length; i++) out[i] = Math.sin((2 * Math.PI * hz * i) / rate)
  return out
}

// Zero crossings are a cheap frequency estimate that needs no FFT, and they
// are exactly what a resampler must preserve: the point of resampling is
// that the tone comes out the same tone.
function estimateHz(samples: Float32Array, rate: number): number {
  let crossings = 0
  for (let i = 1; i < samples.length; i++) {
    if (samples[i - 1] < 0 && samples[i] >= 0) crossings++
  }
  return (crossings * rate) / samples.length
}

describe('resampleLinear', () => {
  it('returns the input untouched at the target rate', () => {
    const input = sine(440, TARGET_SAMPLE_RATE, 0.1)
    expect(resampleLinear(input, TARGET_SAMPLE_RATE)).toBe(input)
  })

  it('produces one second of output for one second of input', () => {
    for (const rate of [44100, 48000]) {
      const out = resampleLinear(sine(220, rate, 1), rate)
      expect(out.length).toBe(Math.floor(rate / (rate / TARGET_SAMPLE_RATE)))
      // Within a sample of the target rate, which is what "one second" means.
      expect(Math.abs(out.length - TARGET_SAMPLE_RATE)).toBeLessThanOrEqual(1)
    }
  })

  it('preserves the pitch of a guitar-range tone from both common rates', () => {
    for (const rate of [44100, 48000]) {
      // The open low E and a note near the top of the drilled range.
      for (const hz of [82.41, 659.26]) {
        const out = resampleLinear(sine(hz, rate, 1), rate)
        expect(estimateHz(out, TARGET_SAMPLE_RATE)).toBeCloseTo(hz, 0)
      }
    }
  })

  // The reason the averaging is there at all: without it, content above the
  // new Nyquist folds back down into the guitar's own range and a
  // transcription model reports it as notes that were never played. This
  // pins the actual measured attenuation rather than a hoped-for one — a box
  // filter takes the top of the band down by about 12 dB, not to nothing,
  // which is why the browser's resampler is the primary path.
  it('takes the top of the band down hard while leaving the passband alone', () => {
    const nearNyquist = peakOf(resampleLinear(sine(18000, 48000, 0.5), 48000))
    const musical = peakOf(resampleLinear(sine(440, 48000, 0.5), 48000))
    expect(musical).toBeGreaterThan(0.9)
    expect(nearNyquist).toBeLessThan(0.35)
    expect(nearNyquist).toBeLessThan(musical / 3)
  })

  it('interpolates when asked to upsample', () => {
    const out = resampleLinear(sine(200, 8000, 0.5), 8000)
    expect(out.length).toBeGreaterThan(4000)
    expect(estimateHz(out, TARGET_SAMPLE_RATE)).toBeCloseTo(200, -1)
  })

  it('rejects a nonsense source rate', () => {
    expect(() => resampleLinear(new Float32Array(10), 0)).toThrow()
  })
})

describe('toMono', () => {
  it('passes a single channel straight through', () => {
    const one = new Float32Array([1, 2, 3])
    expect(toMono([one])).toBe(one)
  })

  it('averages channels and stops at the shortest', () => {
    const out = toMono([new Float32Array([1, 1, 1, 1]), new Float32Array([0, 2, 0])])
    expect([...out]).toEqual([0.5, 1.5, 0.5])
  })

  it('handles nothing captured at all', () => {
    expect(toMono([]).length).toBe(0)
  })
})

describe('concatFloat32', () => {
  it('joins chunks in order', () => {
    const out = concatFloat32([new Float32Array([1, 2]), new Float32Array([]), new Float32Array([3])])
    expect([...out]).toEqual([1, 2, 3])
  })
})

describe('peakOf', () => {
  it('finds the largest magnitude, either sign', () => {
    expect(peakOf(new Float32Array([0.1, -0.8, 0.3]))).toBeCloseTo(0.8, 6)
    expect(peakOf(new Float32Array([]))).toBe(0)
  })
})
