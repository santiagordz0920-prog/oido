import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_CONFIG, type StabilizerConfig } from '../audio/input/stabilize'

// Calibration results, persisted. The noise floor is per-room and per-laptop
// rather than a constant, because an acoustic guitar into a built-in mic can
// sit only a little above the room itself.

type MicState = {
  noiseFloorRms: number | null
  calibratedAt: number | null
  lowEConfirmed: boolean
  save: (result: { noiseFloorRms: number; lowEConfirmed: boolean }) => void
  clear: () => void
}

export const useMicSettings = create<MicState>()(
  persist(
    (set) => ({
      noiseFloorRms: null,
      calibratedAt: null,
      lowEConfirmed: false,
      save: ({ noiseFloorRms, lowEConfirmed }) =>
        set({ noiseFloorRms, lowEConfirmed, calibratedAt: Date.now() }),
      clear: () => set({ noiseFloorRms: null, calibratedAt: null, lowEConfirmed: false }),
    }),
    { name: 'oido-mic' },
  ),
)

// The 90th percentile rather than the mean: a fan cycling or one keyboard
// tap should raise the floor, not be averaged away into a gate that then
// lets noise through as notes.
export function noiseFloorFrom(samples: number[]): number {
  if (samples.length === 0) return DEFAULT_CONFIG.noiseFloorRms
  const sorted = [...samples].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))
  // A perfectly silent input would produce a zero gate, which would then
  // accept anything; keep a small absolute minimum.
  return Math.max(sorted[index], 0.0008)
}

export function configFor(noiseFloorRms: number | null): StabilizerConfig {
  if (noiseFloorRms === null) return DEFAULT_CONFIG
  return { ...DEFAULT_CONFIG, noiseFloorRms }
}
