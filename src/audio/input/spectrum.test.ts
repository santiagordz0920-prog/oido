import { describe, expect, it } from 'vitest'
import { goertzelMagnitude, hannWindow, octaveDownEvidence } from './spectrum'

const SR = 48000
const N = 4096
const WINDOW = hannWindow(N)

// A plucked string as a laptop mic delivers it: harmonic amplitudes fall as
// 1/n, and the mic's low-end roll-off scales everything under ~200 Hz.
function pluck(f0: number, { rolloff = true } = {}): Float32Array {
  const micResponse = (hz: number) => (!rolloff ? 1 : hz < 120 ? 0.08 : hz < 200 ? 0.5 : 1)
  const buf = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const t = i / SR
    let s = 0
    for (let n = 1; n <= 12; n++) {
      const hz = f0 * n
      if (hz > SR / 2) break
      s += (1 / n) * micResponse(hz) * Math.sin(2 * Math.PI * hz * t + n * 1.7)
    }
    buf[i] = 0.25 * s
  }
  return buf
}

function rmsOf(buf: Float32Array): number {
  let sum = 0
  for (const v of buf) sum += v * v
  return Math.sqrt(sum / buf.length)
}

describe('goertzelMagnitude', () => {
  it('finds a tone at its own frequency and not at a neighbour', () => {
    const buf = new Float32Array(N)
    for (let i = 0; i < N; i++) buf[i] = 0.5 * Math.sin((2 * Math.PI * 247 * i) / SR)
    const atTone = goertzelMagnitude(buf, WINDOW, 247, SR)
    const offTone = goertzelMagnitude(buf, WINDOW, 400, SR)
    expect(atTone).toBeGreaterThan(0.1)
    expect(offTone).toBeLessThan(atTone / 20)
  })
})

describe('octaveDownEvidence', () => {
  it('fires when the candidate is really the second partial of a low E', () => {
    // The acoustic-into-laptop failure: 82 Hz fundamental all but gone, so
    // if MPM ever reports 164.8 the correction has to catch it. The proof is
    // the partial at 247 Hz, which only a fundamental at 82 can produce.
    const buf = pluck(82.41)
    const evidence = octaveDownEvidence(buf, WINDOW, 82.41 * 2, SR, rmsOf(buf))
    expect(evidence).toBeGreaterThan(0.4)
  })

  it('stays quiet for a genuine note at that frequency', () => {
    const buf = pluck(164.81)
    const evidence = octaveDownEvidence(buf, WINDOW, 164.81, SR, rmsOf(buf))
    expect(evidence).toBeLessThan(0.4)
  })

  it('stays quiet for a genuine note even without mic roll-off', () => {
    const buf = pluck(164.81, { rolloff: false })
    expect(octaveDownEvidence(buf, WINDOW, 164.81, SR, rmsOf(buf))).toBeLessThan(0.4)
  })

  it('reports nothing when the halfway partial is only noise', () => {
    const buf = new Float32Array(N)
    for (let i = 0; i < N; i++) buf[i] = 0.02 * (Math.random() * 2 - 1)
    expect(octaveDownEvidence(buf, WINDOW, 165, SR, rmsOf(buf))).toBe(0)
  })

  it('ignores candidates whose partial would exceed Nyquist', () => {
    const buf = pluck(200)
    expect(octaveDownEvidence(buf, WINDOW, SR / 2, SR, rmsOf(buf))).toBe(0)
  })
})
