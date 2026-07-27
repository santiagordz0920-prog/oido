// Corpus-ordered progressions for E7 (two-chord motions) and E8 (four-bar
// progressions): the curriculum reads its ordering from the ingested
// frequency table, never from a guessed list (brief rule 4).

export type ProgressionEntry = {
  p: string[] // Roman numerals, triad-level
  count: number
}

export type ProgressionFrequency = {
  source: string
  license: string
  generatedAt: string
  songCount: number
  major: { two: ProgressionEntry[]; four: ProgressionEntry[] }
  minor: { two: ProgressionEntry[]; four: ProgressionEntry[] }
}

let cached: Promise<ProgressionFrequency> | null = null
export function loadProgressionFrequency(): Promise<ProgressionFrequency> {
  cached ??= import('../data/progression-frequency.json').then(
    (m) => m.default as unknown as ProgressionFrequency,
  )
  return cached
}

// The top progressions a drill should serve, most frequent first. E7 uses
// (mode, 'two'); E8 uses (mode, 'four') with the top 10 first per §6.
export function topProgressions(
  data: ProgressionFrequency,
  mode: 'major' | 'minor',
  length: 'two' | 'four',
  count: number,
): ProgressionEntry[] {
  return data[mode][length].slice(0, count)
}
