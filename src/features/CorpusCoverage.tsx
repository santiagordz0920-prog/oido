import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useT } from '../state/settings'
import { masteryOf } from '../scheduler/engine'
import { GRANTING_NODES } from '../curriculum/devices'
import {
  computeCoverage,
  loadVocabulary,
  unlockDeltas,
  type SongVocabulary,
} from '../curriculum/coverage'
import type { StringKey } from '../i18n/strings'

// The headline metric (§4.2, §15.8): the largest number in the app, and a
// true statement. Song-level percent leads; the section-level figure rides
// along because early progress shows up there first (open question 2).

export function CorpusCoverage() {
  const t = useT()
  const [vocab, setVocab] = useState<SongVocabulary | null>(null)
  const [methodOpen, setMethodOpen] = useState(false)

  useEffect(() => {
    let alive = true
    loadVocabulary().then((v) => {
      if (alive) setVocab(v)
    })
    return () => {
      alive = false
    }
  }, [])

  const mastered = useLiveQuery(async () => {
    const out: string[] = []
    for (const id of GRANTING_NODES) {
      if ((await masteryOf(id)).mastered) out.push(id)
    }
    return out
  }, [])

  if (!vocab || mastered === undefined) {
    return (
      <p className="mono text-[length:var(--fs-1)] text-[color:var(--ink-dim)]" role="status">
        {t('coverage.loading')}
      </p>
    )
  }

  const coverage = computeCoverage(vocab, mastered)
  const next = unlockDeltas(vocab, mastered).find((d) => d.songDelta > 0)
  const percent = Math.floor(coverage.songPercent)

  return (
    <div>
      <div className="display text-[length:var(--fs-8)] leading-none" aria-hidden="true">
        {percent}%
      </div>
      <div className="mono mt-1 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
        {t('coverage.label')}
      </div>
      <p className="mt-2 max-w-[65ch]">
        {t('coverage.claim', { songs: coverage.coveredSongs, total: coverage.songCount })}
      </p>
      {next ? (
        <p className="chromatic mono mt-1 text-[length:var(--fs-2)] font-bold">
          {t('coverage.next', {
            node: t(`node.${next.nodeId}.title` as StringKey),
            delta: next.songPercentDelta.toFixed(1),
          })}
        </p>
      ) : null}
      <p className="mono mt-1 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
        {t('coverage.sections', { percent: coverage.sectionPercent.toFixed(0) })}
      </p>
      <button
        className="mono snap mt-3 border border-[var(--ink-dim)] bg-[var(--surface)] px-2 py-1 text-[length:var(--fs-0)]"
        onClick={() => setMethodOpen((v) => !v)}
        aria-expanded={methodOpen}
      >
        {methodOpen ? t('coverage.method.hide') : t('coverage.method.show')}
      </button>
      {methodOpen ? (
        <p className="mt-2 max-w-[65ch] text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
          {t('coverage.method.body', { source: vocab.source })}
        </p>
      ) : null}
    </div>
  )
}
