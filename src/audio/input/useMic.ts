import { useEffect, useRef, useState } from 'react'
import { MicError, startMic, type MicErrorReason, type MicSession } from './mic'
import { createStabilizer, DEFAULT_CONFIG, type DetectorFrame, type NoteEvent, type StabilizerConfig } from './stabilize'

// React binding for Tier 1 input. Frames arrive about every 21 ms, which is
// far faster than anything worth re-rendering for, so the meter is sampled
// on animation frames while note changes — which are rare — propagate at
// once.

export type MicStatus = 'idle' | 'starting' | 'running' | 'error'

export type UseMicOptions = {
  active: boolean
  config?: StabilizerConfig
  onFrame?: (frame: DetectorFrame) => void
  onNote?: (event: NoteEvent) => void
}

export type UseMicResult = {
  status: MicStatus
  error: MicErrorReason | null
  rms: number
  peakRms: number
  midi: number | null
  cents: number
  clarity: number
}

export function useMic({ active, config = DEFAULT_CONFIG, onFrame, onNote }: UseMicOptions): UseMicResult {
  const [status, setStatus] = useState<MicStatus>('idle')
  const [error, setError] = useState<MicErrorReason | null>(null)
  const [meter, setMeter] = useState({ rms: 0, peakRms: 0 })
  const [note, setNote] = useState<{ midi: number | null; cents: number; clarity: number }>({
    midi: null,
    cents: 0,
    clarity: 0,
  })

  // Callbacks and config live in refs so changing them never tears down the
  // audio graph — restarting the mic mid-drill would be jarring.
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame
  const onNoteRef = useRef(onNote)
  onNoteRef.current = onNote
  const configRef = useRef(config)
  configRef.current = config

  // The stabilizer is replaced rather than the audio graph when the gate
  // changes, so calibration can measure a noise floor and apply it without
  // dropping the stream the user is already playing into.
  const stabilizerRef = useRef(createStabilizer(config))
  useEffect(() => {
    stabilizerRef.current = createStabilizer(configRef.current)
  }, [config.noiseFloorRms, config.clarityThreshold, config.gateMarginDb])

  useEffect(() => {
    if (!active) {
      setStatus('idle')
      return
    }

    let cancelled = false
    let session: MicSession | null = null
    let raf = 0
    const latest = { rms: 0, peakRms: 0 }

    setStatus('starting')
    setError(null)

    const tick = () => {
      setMeter({ rms: latest.rms, peakRms: latest.peakRms })
      raf = requestAnimationFrame(tick)
    }

    startMic((frame) => {
      latest.rms = frame.rms
      latest.peakRms = Math.max(latest.peakRms, frame.rms)
      onFrameRef.current?.(frame)
      const event = stabilizerRef.current.push(frame)
      if (event) {
        onNoteRef.current?.(event)
        if (event.kind === 'note') {
          setNote({ midi: event.midi, cents: event.cents, clarity: event.clarity })
        } else {
          setNote({ midi: null, cents: 0, clarity: 0 })
        }
      }
    })
      .then((s) => {
        if (cancelled) {
          void s.stop()
          return
        }
        session = s
        setStatus('running')
        raf = requestAnimationFrame(tick)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setStatus('error')
        setError(err instanceof MicError ? err.reason : 'failed')
      })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      void session?.stop()
      setNote({ midi: null, cents: 0, clarity: 0 })
      setMeter({ rms: 0, peakRms: 0 })
    }
  }, [active])

  return { status, error, rms: meter.rms, peakRms: meter.peakRms, ...note }
}
