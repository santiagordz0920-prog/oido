import { PitchDetector } from 'pitchy'
import { hannWindow, octaveDownEvidence } from './spectrum'

// The capture-side half of Tier 1. Runs on the audio thread so a busy UI
// cannot drop frames, and so nothing here touches the deprecated
// ScriptProcessorNode.
//
// 4096 samples at 48 kHz is about 85 ms, roughly seven periods of the open
// low E (82.4 Hz) — enough for MPM to lock on. The hop is 1024, so frames
// arrive about every 21 ms.

declare const sampleRate: number
declare const registerProcessor: (name: string, ctor: unknown) => void
declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort
}

const FRAME = 4096
const HOP = 1024

class PitchProcessor extends AudioWorkletProcessor {
  private buf = new Float32Array(FRAME)
  private window = hannWindow(FRAME)
  private detector = PitchDetector.forFloat32Array(FRAME)
  private filled = 0
  private sinceHop = 0
  private running = true

  constructor() {
    super()
    // Gating lives in the stabilizer, which knows the user's measured noise
    // floor; the detector itself should report whatever it finds.
    this.detector.clarityThreshold = 0.5
    this.detector.minVolumeDecibels = -70
    this.port.onmessage = (event: MessageEvent) => {
      if (event.data === 'stop') this.running = false
    }
  }

  private analyze(tMs: number) {
    let sumSquares = 0
    for (let i = 0; i < FRAME; i++) sumSquares += this.buf[i] * this.buf[i]
    const rms = Math.sqrt(sumSquares / FRAME)

    const [hz, clarity] = this.detector.findPitch(this.buf, sampleRate)

    const halfHarmonicRatio = octaveDownEvidence(this.buf, this.window, hz, sampleRate, rms)

    this.port.postMessage({ tMs, hz, clarity, rms, halfHarmonicRatio })
  }

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0]
    if (!channel || channel.length === 0) return this.running
    const n = channel.length
    this.buf.copyWithin(0, n)
    this.buf.set(channel, FRAME - n)
    this.filled = Math.min(FRAME, this.filled + n)
    this.sinceHop += n
    if (this.filled >= FRAME && this.sinceHop >= HOP) {
      this.sinceHop = 0
      this.analyze((currentFrame / sampleRate) * 1000)
    }
    return this.running
  }
}

declare const currentFrame: number

registerProcessor('pitch-processor', PitchProcessor)
