import { useEffect, useRef, useState } from 'react'
import { useT } from '../state/settings'
import {
  MIN_GATE_MARGIN_DB,
  configFor,
  gateMarginFor,
  noiseFloorFrom,
  useMicSettings,
} from '../state/mic'
import { useMic } from '../audio/input/useMic'
import { noteNameOf } from '../audio/input/notes'
import { InputMeter } from '../components/InputMeter'
import { DEFAULT_CONFIG } from '../audio/input/stabilize'
import type { StringKey } from '../i18n/strings'

// The calibration screen the brief makes mandatory before any mic session.
// It measures two things, because one is not enough: the level the room sits
// at, and how far above it this guitar actually gets. A fixed margin over the
// floor fails in both directions — too wide and a normal room blocks the
// guitar, too tight and the room reaches the detector.

const FLOOR_MS = 2500
const LOW_E_MIDI = 40
const LOW_E_TIMEOUT_MS = 20_000
const TIGHT_SEPARATION_DB = 8

type Phase = 'intro' | 'floor' | 'lowE' | 'done'

function noteLabel(midi: number): string {
  return noteNameOf(midi).replace('#', '♯')
}

function toDb(rms: number | null): number | null {
  if (rms === null || rms <= 0) return null
  return Math.round(20 * Math.log10(rms))
}

type Props = {
  onDone: () => void
  onOpenCheck?: () => void
}

export function Calibration({ onDone, onOpenCheck }: Props) {
  const t = useT()
  const saved = useMicSettings()
  const [phase, setPhase] = useState<Phase>('intro')
  const [floorRms, setFloorRms] = useState<number | null>(saved.noiseFloorRms)
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(FLOOR_MS / 1000))
  const [heardMidi, setHeardMidi] = useState<number | null>(null)
  const [lowETimedOut, setLowETimedOut] = useState(false)
  const [result, setResult] = useState<{ floor: number; margin: number; peak: number | null } | null>(null)

  const samples = useRef<number[]>([])
  const notePeak = useRef<number | null>(null)
  const floorRef = useRef<number | null>(saved.noiseFloorRms)
  floorRef.current = floorRms
  const phaseRef = useRef<Phase>(phase)
  phaseRef.current = phase

  const active = phase === 'floor' || phase === 'lowE'

  function commit(confirmed: boolean) {
    const floor = floorRef.current ?? DEFAULT_CONFIG.noiseFloorRms
    const peak = notePeak.current
    const margin = gateMarginFor(floor, confirmed ? peak : null)
    saved.save({ noiseFloorRms: floor, gateMarginDb: margin, notePeakRms: peak, lowEConfirmed: confirmed })
    setResult({ floor, margin, peak })
    setPhase('done')
  }

  const mic = useMic({
    active,
    // While hunting for the low E the gate is deliberately permissive: the
    // separation is not known yet, and a gate guessed too high here would
    // hide the very note being measured. Clarity and range still filter the
    // room out, and the real margin is computed from what this step observes.
    config: configFor(phase === 'lowE' ? floorRms : null, MIN_GATE_MARGIN_DB),
    onFrame: (frame) => {
      if (phaseRef.current === 'floor') samples.current.push(frame.rms)
      else if (phaseRef.current === 'lowE') {
        notePeak.current = Math.max(notePeak.current ?? 0, frame.rms)
      }
    },
    onNote: (event) => {
      if (phaseRef.current !== 'lowE' || event.kind !== 'note') return
      setHeardMidi(event.midi)
      if (event.midi === LOW_E_MIDI) commit(true)
    },
  })

  // Floor measurement window. Wall-clock pacing of the UI, not musical time.
  useEffect(() => {
    if (phase !== 'floor' || mic.status !== 'running') return
    samples.current = []
    const started = Date.now()
    const id = setInterval(() => {
      const left = FLOOR_MS - (Date.now() - started)
      setSecondsLeft(Math.max(0, Math.ceil(left / 1000)))
      if (left <= 0) {
        clearInterval(id)
        setFloorRms(noiseFloorFrom(samples.current))
        notePeak.current = null
        setHeardMidi(null)
        setLowETimedOut(false)
        setPhase('lowE')
      }
    }, 200)
    return () => clearInterval(id)
  }, [phase, mic.status])

  useEffect(() => {
    if (phase !== 'lowE') return
    const id = setTimeout(() => setLowETimedOut(true), LOW_E_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [phase])

  const section = 'border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] p-4 sm:p-6'
  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'

  const floorDb = toDb(result?.floor ?? floorRms)
  const peakDb = toDb(result?.peak ?? null)
  const separationDb = floorDb !== null && peakDb !== null ? peakDb - floorDb : null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <div>
        <div className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">{t('cal.eyebrow')}</div>
        <h1 className="display text-[length:var(--fs-5)] leading-tight sm:text-[length:var(--fs-6)]">
          {t('cal.title')}
        </h1>
      </div>

      {mic.status === 'error' && mic.error ? (
        <section className={section}>
          <p className="max-w-[65ch]" role="alert">
            {t(`cal.error.${mic.error}` as StringKey)}
          </p>
          <button className={`${chip} mt-4`} onClick={() => setPhase('intro')}>
            {t('cal.lowE.retry')}
          </button>
        </section>
      ) : null}

      {phase === 'intro' ? (
        <section className={section}>
          <p className="mb-4 max-w-[65ch]">{t('cal.intro.body')}</p>
          <button className={chip} onClick={() => setPhase('floor')}>
            {t('cal.start')}
          </button>
        </section>
      ) : null}

      {phase === 'floor' ? (
        <section className={section}>
          <h2 className="display mb-2 text-[length:var(--fs-3)]">{t('cal.floor.heading')}</h2>
          <p className="mb-4 max-w-[65ch]">{t('cal.floor.body')}</p>
          {mic.status === 'starting' ? (
            <p className="mono text-[length:var(--fs-2)]" role="status">
              {t('cal.starting')}
            </p>
          ) : (
            <>
              <p className="mono mb-3 text-[length:var(--fs-3)]" role="status">
                {t('cal.floor.counting', { n: secondsLeft })}
              </p>
              <InputMeter rms={mic.rms} floorRms={null} />
            </>
          )}
        </section>
      ) : null}

      {phase === 'lowE' ? (
        <section className={section}>
          <h2 className="display mb-2 text-[length:var(--fs-3)]">{t('cal.lowE.heading')}</h2>
          <p className="mb-4 max-w-[65ch]">{t('cal.lowE.body')}</p>
          <InputMeter rms={mic.rms} floorRms={floorRms} gateMarginDb={MIN_GATE_MARGIN_DB} />
          <p className="mono mt-3 text-[length:var(--fs-3)]" role="status">
            {heardMidi === null ? t('cal.lowE.waiting') : t('cal.lowE.heard', { note: noteLabel(heardMidi) })}
          </p>
          {lowETimedOut ? (
            <>
              <p className="mt-3 max-w-[65ch]">
                {heardMidi === null
                  ? t('cal.lowE.silent')
                  : t('cal.lowE.wrongNote', { note: noteLabel(heardMidi) })}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className={chip}
                  onClick={() => {
                    setHeardMidi(null)
                    setLowETimedOut(false)
                  }}
                >
                  {t('cal.lowE.retry')}
                </button>
                <button className={chip} onClick={() => commit(false)}>
                  {t('cal.lowE.skip')}
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {phase === 'done' ? (
        <section className={section}>
          <h2 className="display mb-2 text-[length:var(--fs-3)]">{t('cal.done.heading')}</h2>
          {saved.lowEConfirmed ? (
            <p className="mono mb-2 text-[length:var(--fs-2)] font-bold">{t('cal.lowE.confirm')}</p>
          ) : (
            <p className="mb-2 max-w-[65ch]">{t('cal.done.unconfirmed')}</p>
          )}

          {/* The three numbers that decide whether a note counts, shown
              plainly so a misfiring room is diagnosable rather than mysterious. */}
          {floorDb !== null ? (
            <dl className="mono my-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[length:var(--fs-1)]">
              <dt className="text-[color:var(--ink-dim)]">{t('cal.done.room')}</dt>
              <dd>{floorDb} dB</dd>
              {peakDb !== null ? (
                <>
                  <dt className="text-[color:var(--ink-dim)]">{t('cal.done.guitar')}</dt>
                  <dd>{peakDb} dB</dd>
                </>
              ) : null}
              <dt className="text-[color:var(--ink-dim)]">{t('cal.done.gate')}</dt>
              <dd>
                {floorDb + Math.round(result?.margin ?? DEFAULT_CONFIG.gateMarginDb)} dB (+
                {Math.round(result?.margin ?? DEFAULT_CONFIG.gateMarginDb)})
              </dd>
            </dl>
          ) : null}

          {separationDb !== null && separationDb < TIGHT_SEPARATION_DB ? (
            <p className="mb-2 max-w-[65ch] text-[color:var(--ink-dim)]">
              {t('cal.done.tight', { db: separationDb })}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            {onOpenCheck ? (
              <button className={chip} onClick={onOpenCheck}>
                {t('cal.done.check')}
              </button>
            ) : null}
            <button className={chip} onClick={onDone}>
              {t('cal.done.continue')}
            </button>
            <button
              className={chip}
              onClick={() => {
                setHeardMidi(null)
                setLowETimedOut(false)
                setResult(null)
                notePeak.current = null
                setPhase('floor')
              }}
            >
              {t('cal.recalibrate')}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
