// The twelve keys in circle-of-fifths order.
// hue(key) = position × 30° — the load-bearing formula of the design system.
export type KeyDef = {
  tonic: string // tonal-compatible spelling, e.g. "F#"
  label: string // display spelling, e.g. "F♯"
  position: number // circle-of-fifths position, 0 = C
  hue: number // degrees in OKLCH
}

const ORDER: Array<[string, string]> = [
  ['C', 'C'],
  ['G', 'G'],
  ['D', 'D'],
  ['A', 'A'],
  ['E', 'E'],
  ['B', 'B'],
  ['F#', 'F♯'],
  ['Db', 'D♭'],
  ['Ab', 'A♭'],
  ['Eb', 'E♭'],
  ['Bb', 'B♭'],
  ['F', 'F'],
]

export const KEYS: KeyDef[] = ORDER.map(([tonic, label], position) => ({
  tonic,
  label,
  position,
  hue: position * 30,
}))

export function keyByTonic(tonic: string): KeyDef {
  const k = KEYS.find((k) => k.tonic === tonic)
  if (!k) throw new Error(`Unknown key: ${tonic}`)
  return k
}

export function randomKey(): KeyDef {
  return KEYS[Math.floor(Math.random() * KEYS.length)]
}

// Pretty-print a tonal note name with real accidental glyphs, octave stripped.
export function displayNote(note: string): string {
  return note.replace(/\d+$/, '').replaceAll('##', '𝄪').replaceAll('#', '♯').replaceAll('bb', '𝄫').replaceAll(/(?<=.)b/g, '♭')
}
