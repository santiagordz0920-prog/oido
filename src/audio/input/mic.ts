import workletUrl from './pitchWorklet.ts?worker&url'
import type { DetectorFrame } from './stabilize'

// Main-thread control of the microphone. Everything the browser does by
// default to make speech sound better destroys pitch detection, so all three
// processors are switched off (docs/architecture.md §12.2). Nothing is ever
// uploaded: the stream goes to an AudioWorklet and nowhere else.

export type MicErrorReason = 'denied' | 'no-device' | 'insecure' | 'unsupported' | 'failed'

export class MicError extends Error {
  reason: MicErrorReason
  constructor(reason: MicErrorReason, message?: string) {
    super(message ?? reason)
    this.name = 'MicError'
    this.reason = reason
  }
}

export type MicSession = {
  stop: () => Promise<void>
  sampleRate: number
}

function classify(err: unknown): MicError {
  const name = err instanceof Error ? err.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return new MicError('denied')
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return new MicError('no-device')
  if (name === 'SecurityError') return new MicError('insecure')
  return new MicError('failed', err instanceof Error ? err.message : String(err))
}

export async function startMic(onFrame: (frame: DetectorFrame) => void): Promise<MicSession> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new MicError('unsupported')
  }
  if (!window.isSecureContext) throw new MicError('insecure')

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
  } catch (err) {
    throw classify(err)
  }

  const context = new AudioContext()
  try {
    await context.audioWorklet.addModule(workletUrl)
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop())
    await context.close()
    throw classify(err)
  }

  const source = context.createMediaStreamSource(stream)
  const node = new AudioWorkletNode(context, 'pitch-processor')
  node.port.onmessage = (event: MessageEvent<DetectorFrame>) => onFrame(event.data)

  // Nothing should be audible — monitoring an acoustic guitar through the
  // laptop speakers would feed straight back into the mic. The silent sink
  // exists only so the graph keeps being pulled.
  const silence = context.createGain()
  silence.gain.value = 0
  source.connect(node)
  node.connect(silence)
  silence.connect(context.destination)

  if (context.state === 'suspended') await context.resume()

  let stopped = false
  return {
    sampleRate: context.sampleRate,
    stop: async () => {
      if (stopped) return
      stopped = true
      node.port.postMessage('stop')
      node.port.onmessage = null
      source.disconnect()
      node.disconnect()
      silence.disconnect()
      stream.getTracks().forEach((t) => t.stop())
      await context.close()
    },
  }
}
