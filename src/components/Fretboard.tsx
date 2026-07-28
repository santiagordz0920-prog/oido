import { useT } from '../state/settings'

// Shared fretboard diagram for track F (docs/curriculum.md §7). Standard
// tuning, string 6 the lowest (open low E) to string 1 the highest (open
// high e) — the same numbering as OPEN_STRING_MIDI's comment in
// src/audio/input/notes.ts. Drawn top (string 1) to bottom (string 6), the
// usual tab-diagram order.
//
// Every marker kind reads without color (design-system.md §15.4): 'target'
// adds an outer ring (a shape difference), 'correct' and 'wrong' differ in
// fill AND carry a redundant glyph (✓ / ✕) next to the note label, which is
// always shown regardless of kind.

export type MarkerKind = 'target' | 'correct' | 'wrong'

export type Marker = {
  string: number // 1 (high e) .. 6 (low E)
  fret: number
  label: string
  kind?: MarkerKind
}

export type FretboardProps = {
  frets?: number
  markers?: Marker[]
  onTap?: (string: number, fret: number) => void // omit to render read-only
  highlightStrings?: number[] // dim the rest, for "strings 5 and 6" style prompts
}

const STRINGS = [1, 2, 3, 4, 5, 6]
const STRING_GAP = 32
const TOP_PAD = 16
const BOTTOM_PAD = 24
const LEFT_LABEL_WIDTH = 20
const OPEN_COL_WIDTH = 40
const FRET_WIDTH = 40
const DOT_FRETS = [3, 5, 7, 9]
const DOUBLE_DOT_FRET = 12

export function Fretboard({ frets = 12, markers = [], onTap, highlightStrings }: FretboardProps) {
  const t = useT()
  const width = LEFT_LABEL_WIDTH + OPEN_COL_WIDTH + frets * FRET_WIDTH
  const height = TOP_PAD + (STRINGS.length - 1) * STRING_GAP + BOTTOM_PAD
  const fretNumbers = [0, ...Array.from({ length: frets }, (_, i) => i + 1)]

  const stringY = (s: number) => TOP_PAD + (s - 1) * STRING_GAP
  const wireX = (f: number) => LEFT_LABEL_WIDTH + OPEN_COL_WIDTH + f * FRET_WIDTH
  const fretCenterX = (f: number) => (f === 0 ? LEFT_LABEL_WIDTH + OPEN_COL_WIDTH / 2 : wireX(f - 1) + FRET_WIDTH / 2)
  const isDimmed = (s: number) => !!highlightStrings && highlightStrings.length > 0 && !highlightStrings.includes(s)

  return (
    <div
      className="border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] p-2"
      style={{ overflowX: 'auto', touchAction: 'pan-x' }}
    >
      <svg width={width} height={height} role="img" aria-label={t('fretboard.ariaLabel')} className="block">
        {/* nut */}
        <line
          x1={wireX(0)}
          y1={TOP_PAD - 6}
          x2={wireX(0)}
          y2={stringY(6) + 6}
          stroke="var(--ink)"
          strokeWidth={4}
        />
        {/* fret wires */}
        {Array.from({ length: frets }, (_, i) => i + 1).map((f) => (
          <line
            key={`wire-${f}`}
            x1={wireX(f)}
            y1={TOP_PAD - 6}
            x2={wireX(f)}
            y2={stringY(6) + 6}
            stroke="var(--ink-dim)"
            strokeWidth={1}
          />
        ))}
        {/* inlay dots */}
        {DOT_FRETS.filter((f) => f <= frets).map((f) => (
          <circle key={`dot-${f}`} cx={fretCenterX(f)} cy={(stringY(3) + stringY(4)) / 2} r={3} fill="var(--ink-dim)" />
        ))}
        {frets >= DOUBLE_DOT_FRET ? (
          <>
            <circle cx={fretCenterX(DOUBLE_DOT_FRET)} cy={stringY(2)} r={3} fill="var(--ink-dim)" />
            <circle cx={fretCenterX(DOUBLE_DOT_FRET)} cy={stringY(5)} r={3} fill="var(--ink-dim)" />
          </>
        ) : null}
        {/* strings */}
        {STRINGS.map((s) => (
          <line
            key={`str-${s}`}
            x1={0}
            y1={stringY(s)}
            x2={width}
            y2={stringY(s)}
            stroke="var(--ink)"
            strokeWidth={s >= 5 ? 2 : 1}
            opacity={isDimmed(s) ? 0.25 : 1}
          />
        ))}
        {/* string number labels */}
        {STRINGS.map((s) => (
          <text
            key={`slbl-${s}`}
            x={2}
            y={stringY(s) + 3}
            fontSize={9}
            fill="var(--ink-dim)"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {s}
          </text>
        ))}
        {/* fret number labels, only at the marked frets to stay legible */}
        {fretNumbers
          .filter((f) => f === 0 || DOT_FRETS.includes(f) || f === DOUBLE_DOT_FRET)
          .map((f) => (
            <text
              key={`flbl-${f}`}
              x={fretCenterX(f)}
              y={height - 6}
              textAnchor="middle"
              fontSize={9}
              fill="var(--ink-dim)"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {f}
            </text>
          ))}
        {/* tap targets */}
        {onTap
          ? STRINGS.flatMap((s) =>
              fretNumbers.map((f) => (
                <rect
                  key={`tap-${s}-${f}`}
                  x={f === 0 ? LEFT_LABEL_WIDTH : wireX(f - 1)}
                  y={stringY(s) - STRING_GAP / 2}
                  width={f === 0 ? OPEN_COL_WIDTH : FRET_WIDTH}
                  height={STRING_GAP}
                  fill="transparent"
                  className="cursor-pointer"
                  tabIndex={0}
                  role="button"
                  aria-label={`string ${s} fret ${f}`}
                  onClick={() => onTap(s, f)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onTap(s, f)
                    }
                  }}
                />
              )),
            )
          : null}
        {/* markers */}
        {markers.map((m, i) => {
          const cx = fretCenterX(Math.min(Math.max(m.fret, 0), frets))
          const cy = stringY(m.string)
          const wrong = m.kind === 'wrong'
          const target = m.kind === 'target'
          const r = target ? 12 : 11
          return (
            // Markers are drawn after the tap targets, so without this a
            // marker sitting on a fret would swallow every later tap on it —
            // and re-tapping a marked position is exactly what the drills
            // that let you change an answer need to do.
            <g key={`marker-${i}-${m.string}-${m.fret}`} style={{ pointerEvents: 'none' }}>
              {target ? <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="var(--ink)" strokeWidth={2} /> : null}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={wrong ? 'var(--surface)' : 'var(--ink)'}
                stroke="var(--ink)"
                strokeWidth={wrong ? 2 : 0}
              />
              <text
                x={cx}
                y={cy + 3}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill={wrong ? 'var(--ink)' : 'var(--surface)'}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {m.label}
              </text>
              {m.kind === 'correct' ? (
                <text x={cx + r} y={cy - r} textAnchor="middle" fontSize={12} fill="var(--ink)">
                  ✓
                </text>
              ) : null}
              {wrong ? (
                <text x={cx + r} y={cy - r} textAnchor="middle" fontSize={12} fill="var(--ink)">
                  ✕
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
