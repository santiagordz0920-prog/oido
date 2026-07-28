import workletUrl from './captureWorklet.ts?worker&url'
import { MicError, type MicErrorReason } from './mic'
import { concatFloat32, resampleLinear, TARGET_SAMPLE_RATE } from './resample'
import type { DetectedNote } from './chordGrade'

// Tier 2: polyphonic capture and grade (docs/architecture.md §12.2).
//
// Basic Pitch is the heaviest thing in the app — about 1.1 MB over the wire
// once the model and TensorFlow.js are counted. Cold start was measured at
// 84 ms and was never the risk; the download is (docs/phases.md open
// question 3). So everything here sits behind a dynamic import: Tracks T and
// E cost zero extra bytes, which is the airport case and the common one, and
// a session that includes Track F or P warms the model in the background
// before the user reaches a chord.
//
// Two integration facts, read from @spotify/basic-pitch@1.0.1's source
// rather than assumed:
//   * audio must be mono at 22050 Hz — evaluateModel throws otherwise — so
//     the capture path resamples;
//   * the constructor accepts a model path as well as a Promise<GraphModel>,
//     which is the seam lazy loading hangs off.
//
// The model itself is vendored into public/models/basic-pitch rather than
// imported, for two reasons. Its model.json refers to its weight shard by a
// relative path, so bundling only the JSON would emit a manifest pointing at
// a file that was never copied; and a public asset is fetched only when it is
// asked for, which is exactly the "zero extra bytes for Tracks T and E"
// property this whole module exists to preserve. Same arrangement as the
// piano samples.

export { TARGET_SAMPLE_RATE } from './resample'

const MODEL_URL = `${import.meta.env.BASE_URL}models/basic-pitch/model.json`

type BasicPitchModule = typeof import('@spotify/basic-pitch')

let modulePromise: Promise<BasicPitchModule> | null = null
let instancePromise: Promise<InstanceType<BasicPitchModule['BasicPitch']>> | null = null

/** How long the model took to become usable, in ms. Null until it has. */
let loadMs: number | null = null
/** How long the last inference took, and over how much audio. */
let lastInference: { ms: number; audioSeconds: number } | null = null

export function polyLoadMs(): number | null {
  return loadMs
}

export function polyLastInference(): { ms: number; audioSeconds: number } | null {
  return lastInference
}

export function polyLoaded(): boolean {
  return loadMs !== null
}

function loadModule(): Promise<BasicPitchModule> {
  modulePromise ??= import('@spotify/basic-pitch')
  return modulePromise
}

// Load the model, or return the one already loading. Safe to call more than
// once and safe to call speculatively — that is the point of warmPoly below.
export function ensurePoly(): Promise<InstanceType<BasicPitchModule['BasicPitch']>> {
  instancePromise ??= (async () => {
    const started = performance.now()
    const { BasicPitch } = await loadModule()
    const instance = new BasicPitch(MODEL_URL)
    await instance.model
    loadMs = Math.round(performance.now() - started)
    return instance
  })()
  instancePromise = instancePromise.catch((err: unknown) => {
    // A failed load must not poison every later attempt.
    instancePromise = null
    throw err
  })
  return instancePromise
}

// Loading the graph is not the whole warm-up. Measured in Chromium on the
// CPU backend: the FIRST inference took 7–8.5 s while every one after it
// settled at about 3.3 s, because TensorFlow.js compiles its kernels on
// first use. Running one throwaway inference over a short silent buffer
// pays that cost while the user is still reading the prompt instead of
// waiting on their first graded chord.
const WARM_SECONDS = 0.5

let warmed = false

/** True once the model is loaded AND its kernels are compiled. */
export function polyWarm(): boolean {
  return warmed
}

async function warmInference(): Promise<void> {
  if (warmed) return
  const instance = await ensurePoly()
  await instance.evaluateModel(
    new Float32Array(Math.round(TARGET_SAMPLE_RATE * WARM_SECONDS)),
    () => {},
    () => {},
  )
  warmed = true
}

/**
 * Start the download and the kernel compilation in the background without
 * waiting for either. Called once a session that includes Track F or P
 * begins, so the bytes are local and the kernels are built by the time a
 * chord drill appears.
 */
export function warmPoly(): void {
  void warmInference().catch(() => {
    // Warming is best-effort; the drill that actually needs the model will
    // surface the failure with somewhere to go.
  })
}

export type PolyCapture = {
  /** Mono samples at TARGET_SAMPLE_RATE. */
  samples: Float32Array
  seconds: number
  /** The rate the browser actually gave us, before any resampling. */
  captureRate: number
  /** True when an AudioContext could be opened at the target rate directly. */
  nativeRate: boolean
}

function classify(err: unknown): MicError {
  const name = err instanceof Error ? err.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return new MicError('denied')
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return new MicError('no-device')
  if (name === 'SecurityError') return new MicError('insecure')
  return new MicError('failed', err instanceof Error ? err.message : String(err))
}

export type CaptureOptions = {
  seconds: number
  /** Fires with elapsed capture seconds, for a progress bar. */
  onProgress?: (elapsedSeconds: number) => void
  signal?: AbortSignal
}

/**
 * Record a window of audio for grading. The same getUserMedia constraints as
 * Tier 1: everything the browser does to make speech sound better destroys
 * transcription as thoroughly as it destroys pitch detection.
 */
export async function capturePoly({ seconds, onProgress, signal }: CaptureOptions): Promise<PolyCapture> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) throw new MicError('unsupported')
  if (!window.isSecureContext) throw new MicError('insecure')

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
  } catch (err) {
    throw classify(err)
  }

  // Asking for the target rate directly means the browser resamples with its
  // own polyphase filter, which beats anything this app would write. Not
  // every platform honours it, so the actual rate is checked rather than
  // trusted, and the fallback resampler covers the rest.
  let context: AudioContext
  try {
    context = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE })
  } catch {
    context = new AudioContext()
  }

  const chunks: Float32Array[] = []
  let node: AudioWorkletNode | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let silence: GainNode | null = null

  const cleanup = async () => {
    node?.port.postMessage('stop')
    if (node) node.port.onmessage = null
    source?.disconnect()
    node?.disconnect()
    silence?.disconnect()
    stream.getTracks().forEach((t) => t.stop())
    await context.close()
  }

  try {
    await context.audioWorklet.addModule(workletUrl)
    source = context.createMediaStreamSource(stream)
    node = new AudioWorkletNode(context, 'capture-processor')
    node.port.onmessage = (event: MessageEvent<Float32Array>) => chunks.push(event.data)

    // Nothing audible: monitoring an acoustic through the laptop speakers
    // would feed straight back into the mic.
    silence = context.createGain()
    silence.gain.value = 0
    source.connect(node)
    node.connect(silence)
    silence.connect(context.destination)
    if (context.state === 'suspended') await context.resume()

    const startedAt = context.currentTime
    await new Promise<void>((resolve, reject) => {
      // Capture length is measured on the audio clock, not a wall timer, so
      // the window really is the requested number of seconds of audio.
      const check = () => {
        if (signal?.aborted) {
          reject(new DOMException('Capture aborted', 'AbortError'))
          return
        }
        const elapsed = context.currentTime - startedAt
        onProgress?.(elapsed)
        if (elapsed >= seconds) resolve()
        else requestAnimationFrame(check)
      }
      requestAnimationFrame(check)
    })
  } finally {
    await cleanup()
  }

  const captureRate = context.sampleRate
  const raw = concatFloat32(chunks)
  const samples = captureRate === TARGET_SAMPLE_RATE ? raw : resampleLinear(raw, captureRate)
  return {
    samples,
    seconds: samples.length / TARGET_SAMPLE_RATE,
    captureRate,
    nativeRate: captureRate === TARGET_SAMPLE_RATE,
  }
}

export type TranscribeOptions = {
  /** Reported 0..1 while the model works through the window. */
  onProgress?: (fraction: number) => void
  onsetThreshold?: number
  frameThreshold?: number
  minNoteLengthFrames?: number
}

// Thresholds tuned up from the library defaults (0.5/0.3/11). An acoustic
// into a laptop mic is a low-SNR signal and the model will happily report
// faint partials as notes; a chord drill would rather miss a ghost than
// invent one, because the grader treats every extra note as a wrong answer.
const DEFAULT_ONSET_THRESHOLD = 0.5
const DEFAULT_FRAME_THRESHOLD = 0.35
const DEFAULT_MIN_NOTE_FRAMES = 11

/** Run the model over a captured window and return the notes it found. */
export async function transcribePoly(
  capture: PolyCapture,
  {
    onProgress,
    onsetThreshold = DEFAULT_ONSET_THRESHOLD,
    frameThreshold = DEFAULT_FRAME_THRESHOLD,
    minNoteLengthFrames = DEFAULT_MIN_NOTE_FRAMES,
  }: TranscribeOptions = {},
): Promise<DetectedNote[]> {
  const [basicPitch, { noteFramesToTime, outputToNotesPoly }] = await Promise.all([ensurePoly(), loadModule()])

  const frames: number[][] = []
  const onsets: number[][] = []
  const contours: number[][] = []

  const started = performance.now()
  await basicPitch.evaluateModel(
    capture.samples,
    (f, o, c) => {
      frames.push(...f)
      onsets.push(...o)
      contours.push(...c)
    },
    (percent) => onProgress?.(percent),
  )
  lastInference = { ms: Math.round(performance.now() - started), audioSeconds: capture.seconds }

  const notes = noteFramesToTime(
    outputToNotesPoly(frames, onsets, onsetThreshold, frameThreshold, minNoteLengthFrames),
  )
  return notes.map((n) => ({
    midi: n.pitchMidi,
    startSeconds: n.startTimeSeconds,
    durationSeconds: n.durationSeconds,
    amplitude: n.amplitude,
  }))
}

/** Capture a window and transcribe it, the whole Tier 2 round trip. */
export async function captureAndTranscribe(
  options: CaptureOptions & TranscribeOptions,
): Promise<{ notes: DetectedNote[]; capture: PolyCapture }> {
  const capture = await capturePoly(options)
  const notes = await transcribePoly(capture, options)
  return { notes, capture }
}

export type { MicErrorReason, DetectedNote }
