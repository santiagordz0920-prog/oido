import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useT } from '../state/settings'
import { db } from '../db'
import { ALL_NODES, isAvailable, TRACKS, type SkillNode, type Track } from '../curriculum/graph'
import { masteryOf } from '../scheduler/engine'
import type { StringKey } from '../i18n/strings'

// The skill constellation (docs/design-system.md §15.8): nodes as flat shapes
// sized by mastery, edges as 1px straight lines, tracks distinguished by
// shape rather than color, because color is reserved for keys. Zoomable and
// pannable. Fully readable with color stripped out — it never uses hue.

type NodeState = 'locked' | 'later' | 'available' | 'learning' | 'mastered'

type NodeView = {
  node: SkillNode
  state: NodeState
  progress: number
  accuracy: number
  windowSize: number
}

const COL_W = 132
const ROW_H = 52
const PAD = 48
const WIDTH = PAD * 2 + COL_W * 3 + 60
const HEIGHT = PAD * 2 + ROW_H * 18 + 20

function pos(node: SkillNode): { x: number; y: number } {
  return { x: PAD + TRACKS.indexOf(node.track) * COL_W + 30, y: PAD + 24 + node.index * ROW_H }
}

const STATE_KEY: Record<NodeState, StringKey> = {
  locked: 'const.state.locked',
  later: 'const.state.later',
  available: 'const.state.available',
  learning: 'const.state.learning',
  mastered: 'const.state.mastered',
}

const TRACK_KEY: Record<Track, StringKey> = {
  T: 'const.track.T',
  E: 'const.track.E',
  F: 'const.track.F',
  P: 'const.track.P',
}

// Track shapes: theory square, ear circle, fretboard diamond, production triangle.
function Shape({ track, r, filled, dashed }: { track: Track; r: number; filled: boolean; dashed: boolean }) {
  const stroke = dashed ? 'var(--ink-dim)' : 'var(--ink)'
  const common = {
    fill: filled ? 'var(--ink)' : 'var(--surface)',
    stroke,
    strokeWidth: 2,
    strokeDasharray: dashed ? '3 3' : undefined,
  }
  if (track === 'E') return <circle r={r} {...common} />
  if (track === 'T') return <rect x={-r} y={-r} width={r * 2} height={r * 2} {...common} />
  if (track === 'F') return <rect x={-r} y={-r} width={r * 2} height={r * 2} transform="rotate(45)" {...common} />
  return <polygon points={`0,${-r} ${r},${r} ${-r},${r}`} {...common} />
}

export function Constellation() {
  const t = useT()
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState({ tx: 0, ty: 0, scale: 1 })
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  const nodes = useLiveQuery(async (): Promise<NodeView[]> => {
    const stats = await db.nodeStats.toArray()
    const completedSet = new Set(stats.filter((s) => s.completedAt !== undefined).map((s) => s.nodeId))
    const attempted = new Set(stats.filter((s) => s.attempts > 0).map((s) => s.nodeId))
    const views: NodeView[] = []
    for (const node of ALL_NODES) {
      const available = isAvailable(node.id, (id) => completedSet.has(id))
      const mastery = await masteryOf(node.id)
      let state: NodeState
      if (mastery.mastered) state = 'mastered'
      else if (!available) state = 'locked'
      else if (!node.hasContent) state = 'later'
      else if (attempted.has(node.id) || completedSet.has(node.id)) state = 'learning'
      else state = 'available'
      views.push({ node, state, progress: mastery.progress, accuracy: mastery.accuracy, windowSize: mastery.windowSize })
    }
    return views
  }, [])

  // Wheel zoom needs a non-passive listener; React's synthetic wheel is passive.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setView((v) => {
        const scale = Math.min(3, Math.max(0.5, v.scale * (e.deltaY < 0 ? 1.12 : 0.89)))
        return { ...v, scale }
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  // No pointer capture here: capturing would retarget the click event to the
  // svg and swallow node selection. Leaving the svg mid-drag just ends the pan.
  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    drag.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true
    drag.current = { x: e.clientX, y: e.clientY, moved: d.moved }
    setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }))
  }
  function onPointerUp() {
    drag.current = null
  }

  const zoomChip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-3 py-1 text-[length:var(--fs-2)] font-bold'

  const byId = new Map((nodes ?? []).map((v) => [v.node.id, v]))
  const selectedView = selected ? byId.get(selected) : undefined

  // Edges: intra-track sequence plus the theory unlock edges.
  const edges: Array<[SkillNode, SkillNode]> = []
  if (nodes) {
    for (const track of TRACKS) {
      const inTrack = ALL_NODES.filter((n) => n.track === track)
      for (let i = 0; i + 1 < inTrack.length; i++) edges.push([inTrack[i], inTrack[i + 1]])
    }
    for (const n of ALL_NODES) {
      if (n.track !== 'T') continue
      for (const u of n.unlocks) {
        const target = ALL_NODES.find((m) => m.id === u)
        if (target) edges.push([n, target])
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="display text-[length:var(--fs-5)] leading-tight">{t('const.title')}</h1>
        <div className="flex gap-2">
          <button className={zoomChip} aria-label={t('const.zoomIn')} onClick={() => setView((v) => ({ ...v, scale: Math.min(3, v.scale * 1.25) }))}>
            +
          </button>
          <button className={zoomChip} aria-label={t('const.zoomOut')} onClick={() => setView((v) => ({ ...v, scale: Math.max(0.5, v.scale * 0.8) }))}>
            −
          </button>
          <button className={zoomChip} onClick={() => setView({ tx: 0, ty: 0, scale: 1 })}>
            {t('const.reset')}
          </button>
        </div>
      </div>

      <div className="mono flex flex-wrap gap-x-4 gap-y-1 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
        <span>■ {t('const.track.T')}</span>
        <span>● {t('const.track.E')}</span>
        <span>◆ {t('const.track.F')}</span>
        <span>▲ {t('const.track.P')}</span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[60vh] w-full touch-none border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        role="img"
        aria-label={t('const.title')}
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          {TRACKS.map((track) => (
            <text
              key={track}
              x={PAD + TRACKS.indexOf(track) * COL_W + 30}
              y={PAD - 8}
              textAnchor="middle"
              className="mono"
              fontSize={12}
              fill="var(--ink-dim)"
            >
              {track} · {t(TRACK_KEY[track])}
            </text>
          ))}

          {edges.map(([a, b]) => {
            const pa = pos(a)
            const pb = pos(b)
            return (
              <line
                key={`${a.id}-${b.id}`}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke="var(--ink-dim)"
                strokeWidth={1}
                opacity={a.track === b.track ? 0.5 : 0.3}
              />
            )
          })}

          {(nodes ?? []).map((v) => {
            const p = pos(v.node)
            const r = 7 + 7 * v.progress
            const isSelected = selected === v.node.id
            return (
              <g
                key={v.node.id}
                transform={`translate(${p.x} ${p.y})`}
                opacity={v.state === 'locked' || v.state === 'later' ? 0.45 : 1}
                onClick={() => {
                  if (!drag.current?.moved) setSelected(isSelected ? null : v.node.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelected(isSelected ? null : v.node.id)
                }}
                role="button"
                tabIndex={0}
                aria-label={v.node.id}
                style={{ cursor: 'pointer' }}
              >
                {isSelected ? (
                  <circle r={r + 6} fill="none" stroke="var(--ink)" strokeWidth={1} strokeDasharray="2 2" />
                ) : null}
                <Shape
                  track={v.node.track}
                  r={r}
                  filled={v.state === 'mastered'}
                  dashed={v.state === 'locked' || v.state === 'later'}
                />
                <text x={r + 6} y={4} className="mono" fontSize={11} fill="var(--ink)">
                  {v.node.id}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {selectedView ? (
        <div className="border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] p-4">
          <div className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {selectedView.node.id} · {t(TRACK_KEY[selectedView.node.track])} · {t(STATE_KEY[selectedView.state])}
          </div>
          <h2 className="display text-[length:var(--fs-3)] leading-tight">
            {t(`node.${selectedView.node.id}.title` as StringKey)}
          </h2>
          {selectedView.windowSize > 0 ? (
            <p className="mono mt-1 text-[length:var(--fs-1)]">
              {t('const.window', {
                pct: Math.round(selectedView.accuracy * 100),
                n: selectedView.windowSize,
                min: selectedView.node.masteryCriteria.minItems,
                goal: Math.round(selectedView.node.masteryCriteria.accuracy * 100),
              })}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">{t('const.hint')}</p>
      )}
    </div>
  )
}
