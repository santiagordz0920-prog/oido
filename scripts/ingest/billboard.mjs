#!/usr/bin/env node
// McGill Billboard salami_chords.txt -> Oido corpus artifacts.
//
// Usage: node scripts/ingest/billboard.mjs [rawDir] [indexCsvPath]
//   rawDir       — path to the McGill-Billboard directory (890 NNNN/ subdirs).
//   indexCsvPath — path to index.csv (defaults to a sibling of rawDir).
//
// Produces:
//   src/data/progression-frequency.json
//   src/data/song-vocabulary.json
//
// See /tmp/claude-0/.../scratchpad/ingest-spec.md for the full spec this
// script implements. Ambiguities not covered literally by the spec are
// resolved conservatively and flagged with "CONSERVATIVE CHOICE" comments
// below, and are restated in the run's stdout report.

import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Note } from 'tonal'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')

const DEFAULT_RAW_DIR =
  '/tmp/claude-0/-home-user-oido/6aef2ac2-8189-5f66-bccd-8e82be735adc/scratchpad/corpus/McGill-Billboard'

const rawDir = path.resolve(process.argv[2] ?? DEFAULT_RAW_DIR)
const indexCsvPath = path.resolve(
  process.argv[3] ?? path.join(path.dirname(rawDir), 'index.csv'),
)

const OUT_PROGRESSION = path.join(REPO_ROOT, 'src/data/progression-frequency.json')
const OUT_VOCAB = path.join(REPO_ROOT, 'src/data/song-vocabulary.json')

const SOURCE = 'McGill Billboard 2.0 salami_chords'
const LICENSE = 'CC0; cite Burgoyne, Wild & Fujinaga, ISMIR 2011'

// ---------------------------------------------------------------------------
// Quality taxonomy
// ---------------------------------------------------------------------------
// case: 'major' | 'minor' | 'dim' | 'aug' — drives Roman-numeral casing.
// diat: 'MAJ' | 'MIN' | 'DIM' | 'AGNOSTIC' | 'NONE' — drives diatonic-family
//   matching. AGNOSTIC (sus, power chords) has no third, so it is treated as
//   compatible with whichever family the scale degree expects (CONSERVATIVE
//   CHOICE: spec's case rule ("minor lowercase, major/dominant uppercase")
//   never mentions sus/power, so their printed numeral stays uppercase, but
//   they must not be excluded from diatonic-function tagging just because
//   they lack a third).
// seventh: suffix appended to the *full* numeral (stripped back off again for
//   the plain triad-level numeral used in progression-frequency.json).
//
// minmaj7, maj13, min13 are not in the spec's enumerated shorthand list but
// appear in the real corpus (~dozens of instances). CONSERVATIVE CHOICE:
// bucketed into the closest listed quality family (min7 / ext / ext
// respectively) rather than invented as new taxonomy entries, per the
// instruction that the device list is closed.
const QUALITY_TABLE = {
  maj: { q: 'q:maj', case: 'major', diat: 'MAJ', seventh: null },
  min: { q: 'q:min', case: 'minor', diat: 'MIN', seventh: null },
  '7': { q: 'q:dom7', case: 'major', diat: 'MAJ', seventh: '7' },
  maj7: { q: 'q:maj7', case: 'major', diat: 'MAJ', seventh: 'maj7' },
  min7: { q: 'q:min7', case: 'minor', diat: 'MIN', seventh: '7' },
  dim: { q: 'q:dim', case: 'dim', diat: 'DIM', seventh: null },
  dim7: { q: 'q:dim7', case: 'dim', diat: 'DIM', seventh: '°7' },
  hdim7: { q: 'q:m7b5', case: 'dim', diat: 'DIM', seventh: 'ø7' },
  aug: { q: 'q:aug', case: 'aug', diat: 'NONE', seventh: null },
  sus2: { q: 'q:sus', case: 'major', diat: 'AGNOSTIC', seventh: null },
  sus4: { q: 'q:sus', case: 'major', diat: 'AGNOSTIC', seventh: null },
  '6': { q: 'q:6', case: 'major', diat: 'MAJ', seventh: null },
  maj6: { q: 'q:6', case: 'major', diat: 'MAJ', seventh: null },
  min6: { q: 'q:min6', case: 'minor', diat: 'MIN', seventh: null },
  '9': { q: 'q:ext', case: 'major', diat: 'MAJ', seventh: '7' },
  '11': { q: 'q:ext', case: 'major', diat: 'MAJ', seventh: '7' },
  '13': { q: 'q:ext', case: 'major', diat: 'MAJ', seventh: '7' },
  maj9: { q: 'q:ext', case: 'major', diat: 'MAJ', seventh: 'maj7' },
  maj13: { q: 'q:ext', case: 'major', diat: 'MAJ', seventh: 'maj7' }, // not in spec list; see comment above
  min9: { q: 'q:ext', case: 'minor', diat: 'MIN', seventh: '7' },
  min11: { q: 'q:ext', case: 'minor', diat: 'MIN', seventh: '7' },
  min13: { q: 'q:ext', case: 'minor', diat: 'MIN', seventh: '7' }, // not in spec list; see comment above
  minmaj7: { q: 'q:min7', case: 'minor', diat: 'MIN', seventh: '7' }, // not in spec list; see comment above
  '5': { q: 'q:power', case: 'major', diat: 'AGNOSTIC', seventh: null },
  '1': { q: 'q:power', case: 'major', diat: 'AGNOSTIC', seventh: null },
}

// Mode-inference buckets: spec enumerates these shorthands explicitly (line
// "major-family (maj, maj7, 6, maj9, dominant 7/9/11/13) vs minor-family
// (min, min7, min6, min9, min11)"). Chords outside both buckets (dim, aug,
// sus, power, and the undocumented extras) do not count toward either side.
const MODE_MAJOR_SHORTHANDS = new Set(['maj', 'maj6', 'maj7', 'maj9', 'maj13', '7', '9', '11', '13'])
const MODE_MINOR_SHORTHANDS = new Set(['min', 'min6', 'min7', 'min9', 'min11', 'min13', 'minmaj7'])

const DEGREE_TABLE = ['I', 'bII', 'II', 'bIII', 'III', 'IV', '#IV', 'V', 'bVI', 'VI', 'bVII', 'VII']
const MAJOR_SCALE_DEGREES = new Set([0, 2, 4, 5, 7, 9, 11])
const NATURAL_MINOR_SCALE_DEGREES = new Set([0, 2, 3, 5, 7, 8, 10])

const MAJOR_DIATONIC = {
  0: [{ family: 'MAJ', tag: 'f:I' }],
  2: [{ family: 'MIN', tag: 'f:ii' }],
  4: [{ family: 'MIN', tag: 'f:iii' }],
  5: [{ family: 'MAJ', tag: 'f:IV' }],
  7: [{ family: 'MAJ', tag: 'f:V' }],
  9: [{ family: 'MIN', tag: 'f:vi' }],
  11: [{ family: 'DIM', tag: 'f:vii0' }],
}
// Degree 7 accepts both natural-minor v and harmonic-minor V per spec
// ("natural + harmonic minor allowed: V and vii° count as diatonic").
const MINOR_DIATONIC = {
  0: [{ family: 'MIN', tag: 'f:i' }],
  2: [{ family: 'DIM', tag: 'f:ii0' }],
  3: [{ family: 'MAJ', tag: 'f:bIII' }],
  5: [{ family: 'MIN', tag: 'f:iv' }],
  7: [
    { family: 'MIN', tag: 'f:v' },
    { family: 'MAJ', tag: 'f:V' },
  ],
  8: [{ family: 'MAJ', tag: 'f:bVI' }],
  10: [{ family: 'MAJ', tag: 'f:bVII' }],
  11: [{ family: 'DIM', tag: 'f:vii0' }],
}
const BORROWED_IN_MAJOR = {
  1: { family: 'MAJ', tag: 'f:borrowed:bII' },
  3: { family: 'MAJ', tag: 'f:borrowed:bIII' },
  5: { family: 'MIN', tag: 'f:borrowed:iv' },
  7: { family: 'MIN', tag: 'f:borrowed:v' },
  8: { family: 'MAJ', tag: 'f:borrowed:bVI' },
  10: { family: 'MAJ', tag: 'f:borrowed:bVII' },
}

function matchesFamily(quality, expectedFamily) {
  const entry = QUALITY_TABLE[quality]
  if (entry.diat === 'AGNOSTIC') return true
  return entry.diat === expectedFamily
}

// Gap tokens that break progression windows. '*' is not in the spec's
// explicit {N, X, &pause} list but is treated identically (CONSERVATIVE
// CHOICE — see "unparseable" reporting below, where '*' is still logged).
const RECOGNIZED_GAP_TOKENS = new Set(['N', 'X', '&pause'])

const CHORD_RE = /^([A-G][#b]?):([A-Za-z0-9]+)(?:\([^)]*\))?(?:\/([#b0-9A-Za-z]+))?$/

// ---------------------------------------------------------------------------
// CSV parsing (index.csv has quoted fields with embedded commas and escaped
// quotes, e.g. "Nat ""King"" Cole")
// ---------------------------------------------------------------------------
function parseCsvLine(line) {
  const fields = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      fields.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  fields.push(cur)
  return fields
}

function loadIndex(csvPath) {
  const text = readFileSync(csvPath, 'utf8')
  const lines = text.split('\n').filter((l) => l.length > 0)
  const header = parseCsvLine(lines[0])
  const rows = new Map()
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i])
    const row = {}
    header.forEach((h, idx) => (row[h.trim()] = fields[idx] ?? ''))
    const id = (row.id ?? '').padStart(4, '0')
    rows.set(id, row)
  }
  return rows
}

// ---------------------------------------------------------------------------
// Per-line parsing helpers
// ---------------------------------------------------------------------------
const LETTER_RE = /^[A-Z]'*$/

function resolveSectionLabel(prefixText) {
  const pieces = prefixText
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  let letter = null
  const labelPieces = []
  for (const piece of pieces) {
    if (LETTER_RE.test(piece)) letter = piece
    else labelPieces.push(piece)
  }
  if (labelPieces.length > 0) return labelPieces.join(', ')
  if (letter) return letter
  return null
}

// ---------------------------------------------------------------------------
// Per-song parsing
// ---------------------------------------------------------------------------
const unparseableTokens = new Map() // token -> count

function parseHeader(lines) {
  let title = null
  let artist = null
  let tonic = null
  let bodyStart = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('#')) {
      const mTitle = /^#\s*title:\s*(.*)$/.exec(line)
      const mArtist = /^#\s*artist:\s*(.*)$/.exec(line)
      const mTonic = /^#\s*tonic:\s*(.*)$/.exec(line)
      if (mTitle) title = mTitle[1].trim()
      else if (mArtist) artist = mArtist[1].trim()
      else if (mTonic) tonic = mTonic[1].trim()
      bodyStart = i + 1
    } else if (line.trim() === '') {
      bodyStart = i + 1
    } else {
      bodyStart = i
      break
    }
  }
  return { title, artist, tonic, bodyStart }
}

function parseSong(songId, rawText, indexRow) {
  const lines = rawText.split('\n').map((l) => l.replace(/\r$/, ''))
  const header = parseHeader(lines)
  if (!header.tonic) {
    return { skip: 'no-tonic' }
  }

  let currentTonic = header.tonic
  let tonicDeclarationCount = 1

  // Pass A state
  const chords = [] // flat list of successfully parsed chord events, in order
  const sections = [] // { label, devices: Set }
  let currentSectionIdx = -1
  const runs = [] // arrays of plain (7th-stripped) numerals, dup-collapsed
  let currentRun = []

  let majorVotes = 0
  let minorVotes = 0
  let fallbackMajorVotes = 0
  let fallbackMinorVotes = 0

  function flushRun() {
    if (currentRun.length > 0) {
      runs.push(currentRun)
      currentRun = []
    }
  }

  function startNewSection(label) {
    flushRun()
    currentSectionIdx = sections.length
    sections.push({ label, devices: new Set() })
  }

  function onGap() {
    flushRun()
  }

  for (let i = header.bodyStart; i < lines.length; i++) {
    const rawLine = lines[i]
    if (rawLine.trim() === '') continue

    if (rawLine.startsWith('#')) {
      const mTonic = /^#\s*tonic:\s*(.*)$/.exec(rawLine)
      if (mTonic) {
        currentTonic = mTonic[1].trim()
        tonicDeclarationCount++
        flushRun() // tonic change breaks progression windows
      }
      // '# metre:' changes are tracked structurally but do not affect any
      // artifact field, so they are parsed-and-ignored.
      continue
    }

    const tabIdx = rawLine.indexOf('\t')
    const content = (tabIdx === -1 ? rawLine : rawLine.slice(tabIdx + 1)).trim()
    if (content === '') continue

    let bars = []
    if (content.startsWith('|')) {
      // Continuation line: bars only, current section (if any) continues.
      const pieces = content.split('|')
      bars = pieces.slice(1, -1)
    } else {
      const pipeIdx = content.indexOf('|')
      const prefixText = pipeIdx === -1 ? content : content.slice(0, pipeIdx)
      const label = resolveSectionLabel(prefixText) ?? prefixText.trim()
      startNewSection(label)
      if (pipeIdx !== -1) {
        const pieces = content.slice(pipeIdx).split('|')
        bars = pieces.slice(1, -1)
      }
    }

    for (const bar of bars) {
      const tokens = bar.trim().split(/\s+/).filter((t) => t.length > 0)
      for (const token of tokens) {
        if (token === '.') continue // repeat previous chord: no new event
        if (token === '*') {
          unparseableTokens.set('*', (unparseableTokens.get('*') ?? 0) + 1)
          onGap()
          continue
        }
        if (RECOGNIZED_GAP_TOKENS.has(token)) {
          onGap()
          continue
        }
        const m = CHORD_RE.exec(token)
        if (!m) {
          unparseableTokens.set(token, (unparseableTokens.get(token) ?? 0) + 1)
          onGap()
          continue
        }
        const [, root, shorthand, bass] = m
        const qEntry = QUALITY_TABLE[shorthand]
        if (!qEntry) {
          unparseableTokens.set(token, (unparseableTokens.get(token) ?? 0) + 1)
          onGap()
          continue
        }

        const chromaRoot = Note.chroma(root)
        const chromaTonic = Note.chroma(currentTonic)
        if (chromaRoot === undefined || chromaTonic === undefined) {
          unparseableTokens.set(token, (unparseableTokens.get(token) ?? 0) + 1)
          onGap()
          continue
        }
        const degree = (chromaRoot - chromaTonic + 12) % 12
        const base = DEGREE_TABLE[degree]
        const numeralFull = computeNumeral(qEntry, base)
        const numeralPlain = stripSeventh(numeralFull)
        const hasSlashBass = bass !== undefined && bass !== '1'

        // Mode-inference tallies (song-level, computed regardless of mode).
        if (degree === 0) {
          if (MODE_MAJOR_SHORTHANDS.has(shorthand)) majorVotes++
          else if (MODE_MINOR_SHORTHANDS.has(shorthand)) minorVotes++
        }
        if (MAJOR_SCALE_DEGREES.has(degree)) fallbackMajorVotes++
        if (NATURAL_MINOR_SCALE_DEGREES.has(degree)) fallbackMinorVotes++

        chords.push({
          root,
          shorthand,
          degree,
          numeralFull,
          numeralPlain,
          hasSlashBass,
          sectionIdx: currentSectionIdx,
          qualityDevice: qEntry.q,
        })

        if (currentRun.length === 0 || currentRun[currentRun.length - 1] !== numeralPlain) {
          currentRun.push(numeralPlain)
        }
      }
    }
  }
  flushRun()

  if (chords.length === 0) {
    return { skip: 'no-chords' }
  }

  // Mode inference (step 3 of spec).
  let mode
  let usedFallback = false
  if (majorVotes === 0 && minorVotes === 0) {
    usedFallback = true
    // Tie conservative default: major (pop corpus skews major; documented).
    mode = fallbackMinorVotes > fallbackMajorVotes ? 'minor' : 'major'
  } else {
    mode = minorVotes > majorVotes ? 'minor' : 'major'
  }

  const modulated = tonicDeclarationCount > 1

  // Pass B: function-device tagging (needs mode + next-chord lookahead).
  // Two sub-passes: diatonic tags must ALL be resolved first, because
  // secondary-dominant detection for chord i looks at chord i+1's diatonic
  // tag, which — in song order — has not been computed yet if this were a
  // single forward pass.
  const diatonicTable = mode === 'major' ? MAJOR_DIATONIC : MINOR_DIATONIC
  for (const c of chords) {
    let diatonicTag = null
    const candidates = diatonicTable[c.degree] ?? []
    for (const cand of candidates) {
      if (matchesFamily(c.shorthand, cand.family)) {
        diatonicTag = cand.tag
        break
      }
    }
    c.__diatonicTag = diatonicTag
  }
  for (let i = 0; i < chords.length; i++) {
    const c = chords[i]
    let tag = c.__diatonicTag
    if (!tag) {
      // Secondary dominant: strict base shorthand 'maj' or '7' only
      // (CONSERVATIVE CHOICE — spec says "non-diatonic major-or-dom7 chord",
      // read narrowly as the bare maj/7 shorthands rather than every chord
      // with a major third, to avoid over-tagging maj9/maj7/etc as V/x).
      const next = chords[i + 1]
      if (
        (c.shorthand === 'maj' || c.shorthand === '7') &&
        next &&
        next.__diatonicTag &&
        next.__diatonicTag !== 'f:I' &&
        next.__diatonicTag !== 'f:i'
      ) {
        const chromaThis = Note.chroma(c.root)
        const chromaNext = Note.chroma(next.root)
        if ((chromaThis - chromaNext + 12) % 12 === 7) {
          tag = `f:V/${next.__diatonicTag.replace(/^f:/, '')}`
        }
      }
    }
    if (!tag && mode === 'major') {
      const b = BORROWED_IN_MAJOR[c.degree]
      if (b && matchesFamily(c.shorthand, b.family)) tag = b.tag
    }
    if (!tag) tag = 'f:chromatic'
    c.__tag = tag
  }

  // Assemble devices per section + song.
  const songDevices = new Set()
  let inversionSong = false
  for (const c of chords) {
    const sec = c.sectionIdx >= 0 ? sections[c.sectionIdx] : null
    if (sec) sec.devices.add(c.qualityDevice)
    songDevices.add(c.qualityDevice)
    if (c.__tag) {
      if (sec) sec.devices.add(c.__tag)
      songDevices.add(c.__tag)
    }
    if (c.hasSlashBass) {
      if (sec) sec.devices.add('f:inversion')
      songDevices.add('f:inversion')
      inversionSong = true
    }
  }
  if (modulated) songDevices.add('f:modulation')

  // Dedupe identical (label, devices) section pairs; drop empty sections.
  const seenSectionKeys = new Set()
  const outSections = []
  for (const sec of sections) {
    if (sec.devices.size === 0) continue
    const sortedDevices = [...sec.devices].sort()
    const key = sec.label + '|' + sortedDevices.join(',')
    if (seenSectionKeys.has(key)) continue
    seenSectionKeys.add(key)
    outSections.push({ label: sec.label, devices: sortedDevices })
  }

  return {
    id: songId,
    title: header.title ?? indexRow?.title ?? '',
    artist: header.artist ?? indexRow?.artist ?? '',
    mode,
    usedFallback,
    modulated,
    devices: [...songDevices].sort(),
    sections: outSections,
    runs,
    inversionSong,
  }
}

function computeNumeral(qEntry, base) {
  switch (qEntry.case) {
    case 'major':
      return base + (qEntry.seventh ?? '')
    case 'minor':
      return base.toLowerCase() + (qEntry.seventh ?? '')
    case 'dim':
      if (qEntry.seventh === '°7') return base.toLowerCase() + '°7'
      if (qEntry.seventh === 'ø7') return base.toLowerCase() + 'ø7'
      return base.toLowerCase() + '°'
    case 'aug':
      return base + '+'
    default:
      return base
  }
}

function stripSeventh(numeral) {
  if (numeral.endsWith('°7')) return numeral.slice(0, -1)
  if (numeral.endsWith('ø7')) return numeral.slice(0, -2) + '°'
  if (numeral.endsWith('maj7')) return numeral.slice(0, -4)
  if (numeral.endsWith('7')) return numeral.slice(0, -1)
  return numeral
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const indexRows = loadIndex(indexCsvPath)
  const dirNames = readdirSync(rawDir).filter((d) => {
    try {
      return statSync(path.join(rawDir, d)).isDirectory()
    } catch {
      return false
    }
  })
  dirNames.sort()

  const parsed = []
  const skipped = { 'no-tonic': [], 'no-chords': [], error: [] }

  for (const dirName of dirNames) {
    const filePath = path.join(rawDir, dirName, 'salami_chords.txt')
    let raw
    try {
      raw = readFileSync(filePath, 'utf8')
    } catch (e) {
      skipped.error.push({ id: dirName, reason: String(e.message ?? e) })
      continue
    }
    const indexRow = indexRows.get(dirName)
    let result
    try {
      result = parseSong(dirName, raw, indexRow)
    } catch (e) {
      skipped.error.push({ id: dirName, reason: String(e.stack ?? e) })
      continue
    }
    if (result.skip) {
      skipped[result.skip].push(dirName)
      continue
    }
    parsed.push(result)
  }

  // Progression-frequency aggregation.
  const progCounts = {
    major: { two: new Map(), four: new Map() },
    minor: { two: new Map(), four: new Map() },
  }
  for (const song of parsed) {
    const bucket = progCounts[song.mode]
    for (const run of song.runs) {
      for (let i = 0; i + 1 < run.length; i++) {
        const key = JSON.stringify([run[i], run[i + 1]])
        bucket.two.set(key, (bucket.two.get(key) ?? 0) + 1)
      }
      for (let i = 0; i + 3 < run.length; i++) {
        const key = JSON.stringify(run.slice(i, i + 4))
        bucket.four.set(key, (bucket.four.get(key) ?? 0) + 1)
      }
    }
  }

  function toSortedEntries(map) {
    return [...map.entries()]
      .map(([key, count]) => ({ p: JSON.parse(key), count }))
      .filter((e) => e.count >= 3)
      .sort((a, b) => b.count - a.count || a.p.join('-').localeCompare(b.p.join('-')))
  }

  const generatedAt = new Date().toISOString()

  const progressionArtifact = {
    source: SOURCE,
    license: LICENSE,
    generatedAt,
    songCount: parsed.length,
    major: {
      two: toSortedEntries(progCounts.major.two),
      four: toSortedEntries(progCounts.major.four),
    },
    minor: {
      two: toSortedEntries(progCounts.minor.two),
      four: toSortedEntries(progCounts.minor.four),
    },
  }

  // Device taxonomy: the 14 quality devices (verbatim, closed) plus the full
  // enumerable set of function devices derivable from the rule tables above
  // (CONSERVATIVE CHOICE: the spec's function-device example list ends in
  // "..." — illustrative, not exhaustive — so the taxonomy here is generated
  // programmatically from the same tables the parser uses, guaranteeing no
  // emitted device string can fall outside it).
  const qualityTags = [
    'q:maj', 'q:min', 'q:dom7', 'q:maj7', 'q:min7', 'q:dim', 'q:dim7',
    'q:m7b5', 'q:aug', 'q:sus', 'q:6', 'q:min6', 'q:ext', 'q:power',
  ]
  const majorDiatonicTags = Object.values(MAJOR_DIATONIC).flat().map((c) => c.tag)
  const minorDiatonicTags = Object.values(MINOR_DIATONIC).flat().map((c) => c.tag)
  const allDiatonicTags = [...new Set([...majorDiatonicTags, ...minorDiatonicTags])]
  const secondaryDominantTags = allDiatonicTags
    .filter((t) => t !== 'f:I' && t !== 'f:i')
    .map((t) => `f:V/${t.replace(/^f:/, '')}`)
  const borrowedTags = Object.values(BORROWED_IN_MAJOR).map((b) => b.tag)
  const extraTags = ['f:chromatic', 'f:inversion', 'f:modulation']
  const deviceTaxonomy = [
    ...qualityTags,
    ...majorDiatonicTags,
    ...minorDiatonicTags.filter((t) => !majorDiatonicTags.includes(t)),
    ...secondaryDominantTags,
    ...borrowedTags,
    ...extraTags,
  ]
  const deviceTaxonomySet = new Set(deviceTaxonomy)

  let songsForVocab = parsed.map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    mode: s.mode,
    devices: s.devices,
    sections: s.sections,
  }))

  let vocabArtifact = {
    source: SOURCE,
    license: LICENSE,
    generatedAt,
    deviceTaxonomy,
    songs: songsForVocab,
  }

  let vocabJson = JSON.stringify(vocabArtifact, null, 2)
  const THRESHOLD = 1.5 * 1024 * 1024
  let interned = false
  if (Buffer.byteLength(vocabJson, 'utf8') > THRESHOLD) {
    interned = true
    const index = new Map(deviceTaxonomy.map((d, i) => [d, i]))
    songsForVocab = parsed.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      mode: s.mode,
      devices: s.devices.map((d) => index.get(d)),
      sections: s.sections.map((sec) => ({
        label: sec.label,
        devices: sec.devices.map((d) => index.get(d)),
      })),
    }))
    vocabArtifact = {
      source: SOURCE,
      license: LICENSE,
      generatedAt,
      deviceTaxonomy,
      interned: true,
      songs: songsForVocab,
    }
    vocabJson = JSON.stringify(vocabArtifact, null, 2)
  }

  // -------------------------------------------------------------------------
  // Validation pass (fail loudly).
  // -------------------------------------------------------------------------
  const errors = []

  for (const song of songsForVocab) {
    const allDevices = interned
      ? [...song.devices, ...song.sections.flatMap((s) => s.devices)].map((i) => deviceTaxonomy[i])
      : [...song.devices, ...song.sections.flatMap((s) => s.devices)]
    for (const d of allDevices) {
      if (d === undefined || !deviceTaxonomySet.has(d)) {
        errors.push(`song ${song.id}: device "${d}" not in closed taxonomy`)
      }
    }
    if (!dirNames.includes(song.id)) {
      errors.push(`song ${song.id}: id not found in raw data directory listing`)
    }
  }

  const totalProgressionCount =
    progressionArtifact.major.two.reduce((n, e) => n + e.count, 0) +
    progressionArtifact.major.four.reduce((n, e) => n + e.count, 0) +
    progressionArtifact.minor.two.reduce((n, e) => n + e.count, 0) +
    progressionArtifact.minor.four.reduce((n, e) => n + e.count, 0)
  if (totalProgressionCount <= 10000) {
    errors.push(`progression counts sum (${totalProgressionCount}) does not exceed sanity floor of 10000`)
  }

  const progressionJson = JSON.stringify(progressionArtifact, null, 2)
  try {
    JSON.parse(progressionJson)
  } catch (e) {
    errors.push(`progression-frequency.json does not round-trip: ${e.message}`)
  }
  try {
    JSON.parse(vocabJson)
  } catch (e) {
    errors.push(`song-vocabulary.json does not round-trip: ${e.message}`)
  }

  if (errors.length > 0) {
    console.error('VALIDATION FAILED:')
    for (const e of errors) console.error('  - ' + e)
    process.exit(1)
  }

  writeFileSync(OUT_PROGRESSION, progressionJson + '\n')
  writeFileSync(OUT_VOCAB, vocabJson + '\n')

  // -------------------------------------------------------------------------
  // Report
  // -------------------------------------------------------------------------
  const majorSongs = parsed.filter((s) => s.mode === 'major')
  const minorSongs = parsed.filter((s) => s.mode === 'minor')
  const fallbackCount = parsed.filter((s) => s.usedFallback).length
  const modulationCount = parsed.filter((s) => s.modulated).length

  const devicesPerSong = songsForVocab.map((s) => s.devices.length).sort((a, b) => a - b)
  function percentile(arr, p) {
    if (arr.length === 0) return 0
    const idx = (p / 100) * (arr.length - 1)
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    if (lo === hi) return arr[lo]
    return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo)
  }
  const medianDevices = percentile(devicesPerSong, 50)
  const p90Devices = percentile(devicesPerSong, 90)

  const progSize = Buffer.byteLength(progressionJson, 'utf8')
  const vocabSize = Buffer.byteLength(vocabJson, 'utf8')

  console.log('=== Billboard ingest report ===')
  console.log(`Songs parsed: ${parsed.length} / ${dirNames.length}`)
  console.log(`Songs skipped: no-tonic=${skipped['no-tonic'].length}, no-chords=${skipped['no-chords'].length}, error=${skipped.error.length}`)
  if (skipped['no-chords'].length) console.log(`  no-chords ids: ${skipped['no-chords'].join(', ')}`)
  if (skipped.error.length) console.log(`  error ids: ${skipped.error.map((e) => `${e.id} (${e.reason})`).join('; ')}`)
  console.log(`Mode split: major=${majorSongs.length}, minor=${minorSongs.length}`)
  console.log(`Fallback mode-inference count: ${fallbackCount}`)
  console.log(`Songs with modulation: ${modulationCount}`)
  console.log('')
  console.log('Top 10 two-chord major progressions:')
  for (const e of progressionArtifact.major.two.slice(0, 10)) console.log(`  ${e.p.join('-')}: ${e.count}`)
  console.log('Top 10 four-chord major progressions:')
  for (const e of progressionArtifact.major.four.slice(0, 10)) console.log(`  ${e.p.join('-')}: ${e.count}`)
  console.log('')
  console.log(`Distinct unparseable chord tokens encountered: ${unparseableTokens.size}`)
  for (const [tok, count] of [...unparseableTokens.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${JSON.stringify(tok)}: ${count}`)
  }
  console.log('')
  console.log(`Median devices/song: ${medianDevices.toFixed(2)}`)
  console.log(`P90 devices/song: ${p90Devices.toFixed(2)}`)
  console.log('')
  console.log(`progression-frequency.json: ${progSize} bytes (${(progSize / 1024).toFixed(1)} KB)`)
  console.log(`song-vocabulary.json: ${vocabSize} bytes (${(vocabSize / 1024).toFixed(1)} KB)${interned ? ' [interned]' : ''}`)
  console.log('')
  console.log('Validation: PASSED')
}

main()
