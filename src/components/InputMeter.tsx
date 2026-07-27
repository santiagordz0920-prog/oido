import { useT } from '../state/settings'
import { dbToRatio } from '../audio/input/stabilize'

// Input level against the measured noise floor. The bar is the quick read;
// the dB figure beside it is the redundant channel, so the meter stays
// usable with colour coding reduced (docs/design-system.md §15.4).

const FLOOR_DB = -70

function toDb(rms: number): number {
  if (rms <= 0) return FLOOR_DB
  return Math.max(FLOOR_DB, 20 * Math.log10(rms))
}

function toPercent(db: number): number {
  return Math.min(100, Math.max(0, ((db - FLOOR_DB) / -FLOOR_DB) * 100))
}

type Props = {
  rms: number
  floorRms: number | null
  gateMarginDb?: number
}

export function InputMeter({ rms, floorRms, gateMarginDb = 12 }: Props) {
  const t = useT()
  const db = toDb(rms)
  const gateDb = floorRms === null ? null : toDb(floorRms * dbToRatio(gateMarginDb))
  const over = gateDb !== null && db >= gateDb

  return (
    <div className="flex flex-col gap-1">
      <div className="mono flex justify-between text-[length:var(--fs-0)] text-[color:var(--ink-dim)]">
        <span>{t('cal.level')}</span>
        <span>{db <= FLOOR_DB ? '—' : `${Math.round(db)} dB`}</span>
      </div>
      <div className="relative h-6 w-full border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)]">
        <div
          className="key-field absolute inset-y-0 left-0"
          style={{ width: `${toPercent(db)}%` }}
          aria-hidden="true"
        />
        {gateDb !== null ? (
          <div
            className="absolute inset-y-0 w-[2px] bg-[var(--ink)]"
            style={{ left: `${toPercent(gateDb)}%` }}
            aria-hidden="true"
          />
        ) : null}
      </div>
      {gateDb !== null ? (
        <div className="mono text-[length:var(--fs-0)] text-[color:var(--ink-dim)]">
          {t('cal.floorLabel')}: {Math.round(toDb(floorRms!))} dB · {over ? '▲' : '·'} {Math.round(gateDb)} dB
        </div>
      ) : null}
    </div>
  )
}
