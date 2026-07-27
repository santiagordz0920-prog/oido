import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_CONFIG, type StabilizerConfig } from '../audio/input/stabilize'

// Calibration results, persisted. Both numbers are per-room and per-laptop
// rather than constants, because an acoustic guitar into a built-in mic can
// sit only a little above the room itself — in a room with normal background
// noise the separation can be under 10 dB, so a fixed gate margin either
// blocks the guitar or lets the room through.

type MicState = {
  noiseFloorRms: number | null
  gateMarginDb: number | null
  notePeakRms: number | null
  calibratedAt: number | null
  lowEConfirmed: boolean
  save: (result: {
    noiseFloorRms: number
    gateMarginDb: number
    notePeakRms: number | null
    lowEConfirmed: boolean
  }) => void
  clear: () => void
}

export const useMicSettings = create<MicState>()(
  persist(
    (set) => ({
      noiseFloorRms: null,
      gateMarginDb: null,
      notePeakRms: null,
      calibratedAt: null,
      lowEConfirmed: false,
      save: ({ noiseFloorRms, gateMarginDb, notePeakRms, lowEConfirmed }) =>
        set({ noiseFloorRms, gateMarginDb, notePeakRms, lowEConfirmed, calibratedAt: Date.now() }),
      clear: () =>
        set({
          noiseFloorRms: null,
          gateMarginDb: null,
          notePeakRms: null,
          calibratedAt: null,
          lowEConfirmed: false,
        }),
    }),
    { name: 'oido-mic', version: 2 },
  ),
)

// Smooth first, then take a LOW percentile.
//
// Two things go wrong if you skip either half. Raw frames contain
// single-frame transients — a chair, a car, a keystroke — so a high
// percentile of the raw signal reports the room's loudest moment as its
// floor, and the gate built on top then sits above the guitar. Averaging
// alone is not enough either, because a loud transient still drags a mean
// upward. A short moving average removes the spikes, and a low percentile of
// the smoothed signal answers the question actually being asked: what level
// does this room sit at when nothing is happening?
//
// Biasing low is safe here because volume is not the only gate the input
// path applies — MPM clarity, the pitch range, and multi-frame agreement all
// have to agree before a note is reported, and room noise satisfies none of
// them.
const SMOOTH_FRAMES = 5
const FLOOR_PERCENTILE = 0.25
const MIN_FLOOR_RMS = 0.0008

function movingAverage(values: number[], window: number): number[] {
  if (values.length < window) return [...values]
  const out: number[] = []
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= window) sum -= values[i - window]
    if (i >= window - 1) out.push(sum / window)
  }
  return out
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)))
  return sorted[index]
}

export function noiseFloorFrom(samples: number[]): number {
  if (samples.length === 0) return DEFAULT_CONFIG.noiseFloorRms
  const smoothed = movingAverage(samples, SMOOTH_FRAMES)
  // A perfectly silent input would produce a zero gate, which would then
  // accept anything; keep a small absolute minimum.
  return Math.max(percentile(smoothed, FLOOR_PERCENTILE), MIN_FLOOR_RMS)
}

// How far above the floor a note has to sit, derived from the separation
// this room and this guitar actually achieve rather than assumed.
//
// The gate is placed at the midpoint in dB between the measured floor and
// the level the guitar reached, which is the point furthest from both kinds
// of mistake. It is then clamped: never so tight that room noise reaches the
// pitch detector, never so wide that a quiet room's guitar cannot clear it.
export const MIN_GATE_MARGIN_DB = 4
export const MAX_GATE_MARGIN_DB = 12

export function gateMarginFor(noiseFloorRms: number, notePeakRms: number | null): number {
  if (notePeakRms === null || notePeakRms <= 0 || noiseFloorRms <= 0) return MAX_GATE_MARGIN_DB
  const separationDb = 20 * Math.log10(notePeakRms / noiseFloorRms)
  if (!Number.isFinite(separationDb)) return MAX_GATE_MARGIN_DB
  return Math.min(MAX_GATE_MARGIN_DB, Math.max(MIN_GATE_MARGIN_DB, separationDb / 2))
}

export function configFor(noiseFloorRms: number | null, gateMarginDb?: number | null): StabilizerConfig {
  if (noiseFloorRms === null) return DEFAULT_CONFIG
  return {
    ...DEFAULT_CONFIG,
    noiseFloorRms,
    gateMarginDb: gateMarginDb ?? DEFAULT_CONFIG.gateMarginDb,
  }
}
