import { useEffect, useRef, useState } from 'react'
import { useT } from '../state/settings'
import { configFor, noiseFloorFrom, useMicSettings } from '../state/mic'
import { useMic } from '../audio/input/useMic'
import { noteNameOf } from '../audio/input/notes'
import { InputMeter } from '../components/InputMeter'
import { DEFAULT_CONFIG } from '../audio/input/stabilize'
import type { StringKey } from '../i18n/strings'

// The calibration screen the brief makes mandatory before any mic session.
// Two measurements: the room's noise floor, then an open low E — the note a
// laptop mic is most likely to lose, so confirming it is the honest test.

const FLOOR_MS = 2500
const LOW_E_MIDI = 40
const LOW_E_TIMEOUT_MS = 20_000

type Phase = 'intro' | 'floor' | 'lowE' | 'done'

function noteLabel(midi: number): string {
  return noteNameOf(midi).replace('#', '♯')
}

type Props = {
  onDone: () => void
}

export function Calibration({ onDone }: Props) {
  const t = useT()
  const saved = useMicSettings()
  const [phase, setPhase] = useState<Phase>('intro')
  const [floorRms, setFloorRms] = useState<number | null>(saved.noiseFloorRms)
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(FLOOR_MS / 1000))
  const [heardMidi, setHeardMidi] = useState<number | null>(null)
  const [lowETimedOut, setLowETimedOut] = useState(false)

  const samples = useRef<number[]>([])
  const active = phase === 'floor' || phase === 'lowE'

  const mic = useMic({
    active,
    config: configFor(phase === 'lowE' ? floorRms : null),
    onFrame: (frame) => {
      if (phase === 'floor') samples.current.push(frame.rms)
    },
    onNote: (event) => {
      if (phase !== 'lowE' || event.kind !== 'note') return
      setHeardMidi(event.midi)
      if (event.midi === LOW_E_MIDI) {
        setFloorRms((floor) => {
          saved.save({ noiseFloorRms: floor ?? DEFAULT_CONFIG.noiseFloorRms, lowEConfirmed: true })
          return floor
        })
        setPhase('done')
      }
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

  function saveAndFinish(confirmed: boolean) {
    saved.save({
      noiseFloorRms: floorRms ?? DEFAULT_CONFIG.noiseFloorRms,
      lowEConfirmed: confirmed,
    })
    setPhase('done')
  }

  const floorDb = floorRms !== null && floorRms > 0 ? Math.round(20 * Math.log10(floorRms)) : null

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
          <InputMeter rms={mic.rms} floorRms={floorRms} />
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
                <button className={chip} onClick={() => saveAndFinish(false)}>
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
          {floorDb !== null ? (
            <p className="mb-2 max-w-[65ch]">
              {t('cal.done.body', { db: floorDb, margin: DEFAULT_CONFIG.gateMarginDb })}
            </p>
          ) : null}
          {floorDb !== null && floorDb > -40 ? (
            <p className="mb-2 max-w-[65ch] text-[color:var(--ink-dim)]">{t('cal.done.noisy')}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button className={chip} onClick={onDone}>
              {t('cal.done.continue')}
            </button>
            <button
              className={chip}
              onClick={() => {
                setHeardMidi(null)
                setLowETimedOut(false)
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
