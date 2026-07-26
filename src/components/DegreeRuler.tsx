import { displayNote } from '../theory/keys'
import { degreeNote } from '../theory'

// The measuring ruler: eight degree circles (a circle is a pitch; the tonic
// is the largest). Degree numbers are always printed — never hue alone.

type Props = {
  tonic: string
  soundingDegree: number // 0 = nothing sounding
  onTap?: (degree: number) => void
  showNotes?: boolean
}

const DEGREES = [1, 2, 3, 4, 5, 6, 7, 8]

export function DegreeRuler({ tonic, soundingDegree, onTap, showNotes = false }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      {DEGREES.map((d) => {
        const tonicLike = d === 1 || d === 8
        const sounding = soundingDegree === d
        const size = tonicLike ? 'h-14 w-14 text-[length:var(--fs-3)]' : 'h-11 w-11 text-[length:var(--fs-2)]'
        return (
          <div key={d} className="flex flex-col items-center gap-1">
            <button
              disabled={!onTap}
              onClick={onTap ? () => onTap(d) : undefined}
              className={`mono snap flex items-center justify-center rounded-full border-[length:var(--rule)] border-[var(--ink)] font-bold ${size} ${
                sounding ? 'key-chip' : 'bg-[var(--surface)]'
              } ${sounding ? 'scale-110' : ''} ${onTap ? '' : 'cursor-default'}`}
              aria-pressed={sounding}
            >
              {d === 8 ? '1' : d}
            </button>
            {showNotes ? (
              <span className="mono text-[length:var(--fs-0)] text-[color:var(--ink-dim)]">
                {displayNote(degreeNote(tonic, d))}
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
