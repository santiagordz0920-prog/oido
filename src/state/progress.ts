import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Phase 0 progress: just enough state to honor "T gates E".
// Dexie-backed skill state replaces this in Phase 1.
type ProgressState = {
  t2Complete: boolean
  completeT2: () => void
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      t2Complete: false,
      completeT2: () => set({ t2Complete: true }),
    }),
    { name: 'oido-progress' },
  ),
)
