// The corpus device taxonomy and which skill node grants which devices.
// This is the contract between the ingest artifacts (src/data/*.json) and
// Corpus Coverage: a song counts as covered only when every device it uses
// is granted by a MASTERED node (§4.2 — under-claim rather than over-claim).
//
// Device strings (closed list, produced by scripts/ingest/billboard.mjs):
//   q:*            chord-quality classes (q:maj, q:dom7, q:ext, ...)
//   f:<numeral>    diatonic function against the local tonic (f:I, f:bVII, ...)
//   f:V/<numeral>  secondary dominants
//   f:borrowed:<n> borrowed chords in major
//   f:inversion, f:modulation, f:chromatic
//
// Grants may end in '*' to match a device prefix (f:V/* matches every
// secondary dominant).

// Which nodes grant which devices. Deliberately conservative: devices hang on
// ear-track mastery, not on theory completion, because Coverage claims the
// user can HEAR the harmony. Devices no node grants yet (q:sus, q:6, q:min6,
// q:ext, f:chromatic) keep their songs uncovered until later curriculum
// exists — honest, and measured by the calibration report.
export const DEVICE_GRANTS: Record<string, string[]> = {
  // Diatonic function in major, plus power chords (no quality to identify —
  // hearing the root as a degree is the whole task).
  E6: ['f:I', 'f:ii', 'f:iii', 'f:IV', 'f:V', 'f:vi', 'f:vii0', 'q:power'],
  // Chord quality, both stages of the node (triads, then sevenths).
  E5: ['q:maj', 'q:min', 'q:dim', 'q:aug', 'q:maj7', 'q:min7', 'q:dom7', 'q:m7b5', 'q:dim7'],
  // Four-bar corpus progressions drill both modes; minor diatonic function
  // is credited here (E4 trains the scale forms, not chord function).
  E8: ['f:i', 'f:ii0', 'f:bIII', 'f:iv', 'f:v', 'f:bVI', 'f:bVII'],
  E10: ['f:V/*', 'f:borrowed:*'],
  E11: ['f:inversion'],
  E13: ['f:modulation'],
}

export type DeviceMatcher = (device: string) => boolean

// Build a matcher over the union of grants from the given mastered nodes.
export function grantedMatcher(masteredNodeIds: Iterable<string>): DeviceMatcher {
  const exact = new Set<string>()
  const prefixes: string[] = []
  for (const nodeId of masteredNodeIds) {
    for (const grant of DEVICE_GRANTS[nodeId] ?? []) {
      if (grant.endsWith('*')) prefixes.push(grant.slice(0, -1))
      else exact.add(grant)
    }
  }
  return (device) => exact.has(device) || prefixes.some((p) => device.startsWith(p))
}

// All node ids that grant at least one device, in graph order elsewhere.
export const GRANTING_NODES: string[] = Object.keys(DEVICE_GRANTS)
