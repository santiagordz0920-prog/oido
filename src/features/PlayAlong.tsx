import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../state/settings'
import { KEYS, displayNote, type KeyDef } from '../theory/keys'
import { chordDegreePitchClass, chordDisplaySymbol, parseNumeral, type ChordDegree } from '../theory'
import { tonicPitchClassOf } from '../audio/input/notes'
import { positionsFor } from '../lib/fretboardMath'
import { Fretboard, type Marker } from '../components/Fretboard'
import { FEELS, type Feel } from '../audio/patterns'
import {
  DEFAULT_BPM,
  MAX_BPM,
  MIN_BPM,
  startPlayAlong,
  type BarEvent,
  type PlayAlong as PlayAlongHandle,
} from '../audio/playalong'
import { loadProgressionFrequency, topProgressions } from '../curriculum/progressions'

// The Play-Along Engine's screen (docs/curriculum.md §9.3). A backing track
// for any progression, in any key, tempo and feel, with the practice targets
// for the *current* chord drawn on the fretboard as it passes.
//
// The progression list is the corpus, not a guessed set of standards: the
// same frequency table that orders E7 and E8 orders what is worth playing
// over. A handful of vamps sit above it because a two-chord loop is what
// P3-style target practice wants, and the corpus's four-chord entries are
// not that.

type Overlay = 'none' | 'chord' | 'guide'

const VAMPS: string[][] = [
  ['I', 'IV'],
  ['ii', 'V'],
  ['I', 'vi'],
  ['i', 'iv'],
]

const CORPUS_COUNT = 8

type Source = { id: string; numerals: string[]; mode: 'major' | 'minor' }

export function PlayAlong({ onKeyChange }: { onKeyChange: (k: KeyDef) => void }) {
  const t = useT()

  const [itemKey, setItemKey] = useState<KeyDef>(KEYS[0])
  const [bpm, setBpm] = useState(DEFAULT_BPM)
  const [feel, setFeel] = useState<Feel>('straight')
  const [barsPerChord, setBarsPerChord] = useState(2)
  const [overlay, setOverlay] = useState<Overlay>('chord')
  const [drums, setDrums] = useState(true)
  const [corpus, setCorpus] = useState<Source[] | null>(null)
  const [sourceId, setSourceId] = useState<string>('vamp-0')
  const [loopFrom, setLoopFrom] = useState(0)
  const [loopTo, setLoopTo] = useState(1)
  const [running, setRunning] = useState(false)
  const [countIn, setCountIn] = useState<number | null>(null)
  const [current, setCurrent] = useState<BarEvent | null>(null)
  const [audioError, setAudioError] = useState(false)

  const handle = useRef<PlayAlongHandle | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      handle.current?.stop()
      handle.current = null
    }
  }, [])

  useEffect(() => {
    onKeyChange(itemKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKey])

  // The corpus table is a ~400KB JSON, loaded the same lazy way E7/E8 load it.
  useEffect(() => {
    let cancelled = false
    void loadProgressionFrequency().then((data) => {
      if (cancelled) return
      const sources: Source[] = []
      for (const mode of ['major', 'minor'] as const) {
        for (const [rank, entry] of topProgressions(data, mode, 'four', CORPUS_COUNT).entries()) {
          sources.push({ id: `${mode}-${rank}`, numerals: entry.p, mode })
        }
      }
      setCorpus(sources)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const sources: Source[] = useMemo(
    () => [
      ...VAMPS.map((numerals, i) => ({
        id: `vamp-${i}`,
        numerals,
        mode: (numerals[0] === 'i' ? 'minor' : 'major') as 'major' | 'minor',
      })),
      ...(corpus ?? []),
    ],
    [corpus],
  )

  const source = sources.find((s) => s.id === sourceId) ?? sources[0]

  // Looping a section is just playing a slice of the progression: the engine
  // loops whatever it is handed, so the section IS the loop.
  const from = Math.min(loopFrom, source.numerals.length - 1)
  const to = Math.min(Math.max(loopTo, from), source.numerals.length - 1)
  const numerals = source.numerals.slice(from, to + 1)

  function stopTrack() {
    handle.current?.stop()
    handle.current = null
    setRunning(false)
    setCountIn(null)
    setCurrent(null)
  }

  async function startTrack() {
    stopTrack()
    try {
      setAudioError(false)
      const h = await startPlayAlong({
        tonic: itemKey.tonic,
        numerals,
        bpm,
        feel,
        barsPerChord,
        parts: { drums },
        onBarDraw: (bar) => {
          if (!mounted.current) return
          setCountIn(null)
          setCurrent(bar)
        },
        onCountIn: (beatsLeft) => {
          if (mounted.current) setCountIn(beatsLeft)
        },
      })
      if (!mounted.current) {
        h.stop()
        return
      }
      handle.current = h
      setRunning(true)
    } catch {
      if (mounted.current) setAudioError(true)
    }
  }

  // Restart on any change that alters the arrangement, but only while
  // running — changing the tempo of a stopped track should not start it.
  const arrangement = `${itemKey.tonic}|${sourceId}|${from}-${to}|${bpm}|${feel}|${barsPerChord}|${drums}`
  const lastArrangement = useRef(arrangement)
  useEffect(() => {
    if (lastArrangement.current === arrangement) return
    lastArrangement.current = arrangement
    if (running) void startTrack()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrangement])

  const activeNumeral = current ? numerals[current.chordIndex] : numerals[0]
  const spec = parseNumeral(itemKey.tonic, activeNumeral)

  // Practice targets for the chord currently sounding, labelled by chord
  // degree — the answer language of the app is degrees, never interval names.
  const targets = useMemo(() => {
    if (overlay === 'none') return new Map<number, string>()
    const degrees: ChordDegree[] = overlay === 'guide' ? [3, 7] : [1, 3, 5, 7]
    const map = new Map<number, string>()
    for (const degree of degrees) {
      const pc = chordDegreePitchClass(spec, degree)
      if (pc === null) continue
      map.set(tonicPitchClassOf(pc), String(degree))
    }
    return map
  }, [overlay, spec])

  const markers: Marker[] = useMemo(
    () =>
      positionsFor([...targets.keys()]).map((p) => ({
        string: p.string,
        fret: p.fret,
        label: targets.get(p.pitchClass) ?? '',
      })),
    [targets],
  )

  const card = 'border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] p-4 sm:p-6'
  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-3 py-2 text-[length:var(--fs-1)] font-bold text-[color:var(--ink)]'
  const chipOn =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--ink)] px-3 py-2 text-[length:var(--fs-1)] font-bold text-[color:var(--surface)]'
  const action =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--ground)] px-4 py-2 text-[length:var(--fs-2)] font-bold text-[color:var(--ink)]'

  function sourceLabel(s: Source): string {
    return s.numerals.join(' ')
  }

  return (
    <div className="flex-1">
      <div className="key-field p-4">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mono text-[length:var(--fs-1)]">{t('playalong.eyebrow')}</div>
          <h1 className="display text-[length:var(--fs-5)] leading-tight">{t('playalong.title')}</h1>
          <p className="mono mt-2 text-[length:var(--fs-3)] font-bold" role="status">
            {countIn !== null
              ? t('playalong.countIn', { n: countIn })
              : running
                ? numerals
                    .map((n, i) => (i === (current?.chordIndex ?? 0) ? `[${n}]` : n))
                    .join(' ')
                : numerals.join(' ')}
          </p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <p className="max-w-[65ch]">{t('playalong.body')}</p>

        <div className="flex flex-wrap gap-3">
          <button className={action} onClick={() => (running ? stopTrack() : void startTrack())}>
            {running ? t('playalong.stop') : t('playalong.play')}
          </button>
          <span className="mono self-center text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {t('playalong.chordIs', { numeral: activeNumeral, chord: displayNote(chordDisplaySymbol(spec)) })}
          </span>
        </div>

        <section className={card}>
          <h2 className="mono mb-2 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {t('playalong.progression')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {sources.map((s) => (
              <button
                key={s.id}
                className={s.id === source.id ? chipOn : chip}
                onClick={() => {
                  setSourceId(s.id)
                  setLoopFrom(0)
                  setLoopTo(s.numerals.length - 1)
                }}
              >
                {sourceLabel(s)}
              </button>
            ))}
          </div>
          {corpus === null ? (
            <p className="mono mt-2 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
              {t('playalong.loadingCorpus')}
            </p>
          ) : null}
          {source.numerals.length > 1 ? (
            <div className="mt-3">
              <div className="mono mb-1 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
                {t('playalong.loop')}
              </div>
              <div className="flex flex-wrap gap-2">
                {source.numerals.map((n, i) => (
                  <button
                    key={`${n}-${i}`}
                    className={i >= from && i <= to ? chipOn : chip}
                    aria-pressed={i >= from && i <= to}
                    onClick={() => {
                      // Tapping outside the current range extends it; tapping
                      // inside it starts a new one-chord selection.
                      if (i < from) setLoopFrom(i)
                      else if (i > to) setLoopTo(i)
                      else {
                        setLoopFrom(i)
                        setLoopTo(i)
                      }
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className={card}>
          <h2 className="mono mb-2 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">{t('playalong.key')}</h2>
          <div className="flex flex-wrap gap-2">
            {KEYS.map((k) => (
              <button
                key={k.tonic}
                className={k.tonic === itemKey.tonic ? chipOn : chip}
                onClick={() => setItemKey(k)}
              >
                {k.label}
              </button>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="mono mb-2 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">{t('playalong.tempo')}</h2>
          <label className="flex items-center gap-3">
            <input
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              step={5}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-56"
              aria-label={t('playalong.tempo')}
            />
            <span className="mono text-[length:var(--fs-2)] font-bold">{t('playalong.bpm', { n: bpm })}</span>
          </label>

          <h2 className="mono mt-4 mb-2 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {t('playalong.feel')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {FEELS.map((f) => (
              <button key={f} className={f === feel ? chipOn : chip} onClick={() => setFeel(f)}>
                {t(`playalong.feel.${f}` as never)}
              </button>
            ))}
          </div>

          <h2 className="mono mt-4 mb-2 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {t('playalong.barsPerChord')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 4].map((n) => (
              <button key={n} className={n === barsPerChord ? chipOn : chip} onClick={() => setBarsPerChord(n)}>
                {n}
              </button>
            ))}
            <button className={drums ? chipOn : chip} aria-pressed={drums} onClick={() => setDrums(!drums)}>
              {t('playalong.drums')}
            </button>
          </div>
        </section>

        <section className={card}>
          <h2 className="mono mb-2 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">{t('playalong.targets')}</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {(['chord', 'guide', 'none'] as Overlay[]).map((o) => (
              <button key={o} className={o === overlay ? chipOn : chip} onClick={() => setOverlay(o)}>
                {t(`playalong.targets.${o}` as never)}
              </button>
            ))}
          </div>
          {overlay === 'none' ? (
            <p className="max-w-[65ch] text-[color:var(--ink-dim)]">{t('playalong.targets.off')}</p>
          ) : (
            <>
              <Fretboard markers={markers} />
              <p className="mt-2 max-w-[65ch] text-[color:var(--ink-dim)]">
                {overlay === 'guide' ? t('playalong.targets.guideNote') : t('playalong.targets.chordNote')}
              </p>
            </>
          )}
        </section>

        {audioError ? (
          <p className="mono text-[length:var(--fs-1)]" role="alert">
            {t('audio.error')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
