import type { Track } from '../curriculum/graph'
import type { StringKey } from '../i18n/strings'

// The four session modes per docs/architecture.md §10.4. A mode is a list of
// timed blocks; each drill block names the tracks it may draw from. Tracks
// whose content is not built yet simply contribute nothing to the eligible
// set, and the block carries a note saying so.

export type SessionMode = 'deskside' | 'commute' | 'bench' | 'deep'

export type Block =
  | { kind: 'warmup'; minutes: number }
  | { kind: 'drill'; minutes: number; tracks: Track[]; fallbackNote?: StringKey }

export type ModeDef = {
  id: SessionMode
  minutes: number
  blocks: Block[]
}

export const MODES: Record<SessionMode, ModeDef> = {
  deskside: {
    id: 'deskside',
    minutes: 3,
    blocks: [{ kind: 'drill', minutes: 3, tracks: ['T', 'E'] }],
  },
  commute: {
    id: 'commute',
    minutes: 10,
    blocks: [{ kind: 'drill', minutes: 10, tracks: ['T', 'E'] }],
  },
  bench: {
    id: 'bench',
    minutes: 25,
    blocks: [
      { kind: 'warmup', minutes: 3 },
      { kind: 'drill', minutes: 22, tracks: ['T', 'E', 'F'], fallbackNote: 'session.fallback.bench' },
    ],
  },
  deep: {
    id: 'deep',
    minutes: 50,
    blocks: [{ kind: 'drill', minutes: 50, tracks: ['T', 'E'], fallbackNote: 'session.fallback.deep' }],
  },
}

export const MODE_ORDER: SessionMode[] = ['deskside', 'commute', 'bench', 'deep']
