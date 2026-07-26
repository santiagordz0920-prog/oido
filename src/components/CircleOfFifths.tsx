import { KEYS, type KeyDef } from '../theory/keys'

// The primary orientation object (§15.8). Twelve annulus segments, current
// key highlighted with a heavier stroke and a center label — the label is the
// redundant channel, so the wheel stays readable with color stripped out.

function sectorPath(cx: number, cy: number, r0: number, r1: number, position: number): string {
  const a0 = ((position * 30 - 15 - 90) * Math.PI) / 180
  const a1 = ((position * 30 + 15 - 90) * Math.PI) / 180
  const p = (r: number, a: number) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  return [
    `M ${p(r0, a0)}`,
    `A ${r0} ${r0} 0 0 1 ${p(r0, a1)}`,
    `L ${p(r1, a1)}`,
    `A ${r1} ${r1} 0 0 0 ${p(r1, a0)}`,
    'Z',
  ].join(' ')
}

type Props = {
  activeKey: KeyDef
  size: number
  showLabels?: boolean
}

export function CircleOfFifths({ activeKey, size, showLabels = false }: Props) {
  const c = 50
  const r1 = showLabels ? 30 : 22
  const r0 = 48
  const labelR = (r0 + r1) / 2
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-hidden="true">
      {KEYS.map((k) => (
        <path
          key={k.tonic}
          className="cof-seg"
          d={sectorPath(c, c, r0, r1, k.position)}
          style={{ fill: `oklch(var(--key-L) var(--key-C) ${k.hue}deg)` }}
          stroke={k.position === activeKey.position ? 'var(--ink)' : 'var(--ground)'}
          strokeWidth={k.position === activeKey.position ? 3 : 1}
        />
      ))}
      {/* re-draw the active segment so its stroke sits on top */}
      <path
        className="cof-seg"
        d={sectorPath(c, c, r0, r1, activeKey.position)}
        style={{ fill: `oklch(var(--key-L) var(--key-C) ${activeKey.hue}deg)` }}
        stroke="var(--ink)"
        strokeWidth={3}
      />
      {showLabels &&
        KEYS.map((k) => {
          const a = ((k.position * 30 - 90) * Math.PI) / 180
          return (
            <text
              key={k.tonic}
              x={c + labelR * Math.cos(a)}
              y={c + labelR * Math.sin(a)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={k.position === activeKey.position ? 9 : 7}
              fontWeight={k.position === activeKey.position ? 700 : 400}
              fill="var(--ink)"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {k.label}
            </text>
          )
        })}
      <text
        x={c}
        y={c}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={showLabels ? 16 : 22}
        fontWeight={700}
        fill="var(--ink)"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {activeKey.label}
      </text>
    </svg>
  )
}
