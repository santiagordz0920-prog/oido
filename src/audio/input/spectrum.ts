// Single-bin magnitude estimation. Only two frequencies matter per frame, so
// a pair of Goertzel evaluations is far cheaper than an FFT and avoids the
// bin-rounding an FFT would impose on an arbitrary candidate frequency.

export function hannWindow(length: number): Float32Array {
  const w = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (length - 1)))
  }
  return w
}

export function goertzelMagnitude(
  buf: Float32Array,
  window: Float32Array,
  freq: number,
  sampleRate: number,
): number {
  const w = (2 * Math.PI * freq) / sampleRate
  const cosw = Math.cos(w)
  const sinw = Math.sin(w)
  const coeff = 2 * cosw
  let s1 = 0
  let s2 = 0
  for (let i = 0; i < buf.length; i++) {
    const s0 = buf[i] * window[i] + coeff * s1 - s2
    s2 = s1
    s1 = s0
  }
  const real = s1 - s2 * cosw
  const imag = s2 * sinw
  return (2 * Math.sqrt(real * real + imag * imag)) / buf.length
}

// Evidence that a candidate frequency is actually the second partial of a
// note an octave below it. A partial halfway between the candidate and its
// octave can only belong to a fundamental at half the candidate, and unlike
// looking for the fundamental itself, this survives the low-end roll-off of
// a laptop mic. Returns 0 when the partial is not meaningfully present.
export function octaveDownEvidence(
  buf: Float32Array,
  window: Float32Array,
  candidateHz: number,
  sampleRate: number,
  rms: number,
): number {
  if (candidateHz <= 0 || candidateHz * 1.5 >= sampleRate / 2) return 0
  const magCandidate = goertzelMagnitude(buf, window, candidateHz, sampleRate)
  const magHalf = goertzelMagnitude(buf, window, candidateHz * 1.5, sampleRate)
  if (magHalf < 0.15 * rms) return 0
  return magHalf / (magCandidate + 1e-9)
}
