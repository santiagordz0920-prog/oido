// The capture half of Tier 2. Unlike the Tier 1 worklet, this one does no
// analysis at all: Basic Pitch grades a whole window rather than streaming,
// so the only job here is to hand raw samples to the main thread without
// dropping any.
//
// Blocks arrive 128 samples at a time. Posting each one would be ~170
// messages a second for nothing, so they are accumulated into chunks first.

declare const registerProcessor: (name: string, ctor: unknown) => void
declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort
}

const CHUNK = 4096

class CaptureProcessor extends AudioWorkletProcessor {
  private buf = new Float32Array(CHUNK)
  private filled = 0
  private running = true

  constructor() {
    super()
    this.port.onmessage = (event: MessageEvent) => {
      if (event.data === 'stop') {
        this.flush()
        this.running = false
      }
    }
  }

  private flush() {
    if (this.filled === 0) return
    const chunk = this.buf.slice(0, this.filled)
    this.port.postMessage(chunk, [chunk.buffer])
    this.filled = 0
  }

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0]
    if (!channel || channel.length === 0) return this.running
    let offset = 0
    while (offset < channel.length) {
      const room = CHUNK - this.filled
      const take = Math.min(room, channel.length - offset)
      this.buf.set(channel.subarray(offset, offset + take), this.filled)
      this.filled += take
      offset += take
      if (this.filled === CHUNK) this.flush()
    }
    return this.running
  }
}

registerProcessor('capture-processor', CaptureProcessor)
