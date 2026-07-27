import { useEffect, useRef, useState } from 'react'
import { DegreeRuler } from '../../components/DegreeRuler'
import { LessonShell, type LessonSection } from './LessonShell'
import { useT } from '../../state/settings'
import { ensureAudio, playDegreeAgainstTonic, playResolution } from '../../audio/engine'
import { resolutionDegrees } from '../../theory'
import type { KeyDef } from '../../theory/keys'

// T3 — tendency and resolution (docs/curriculum.md §5 row T3). Two tendency
// degrees, 7 (pulls up to 1) and 4 (falls to 3), demonstrated with fixed
// button pairs, then explored freely on the ruler.

type Props = {
  activeKey: KeyDef
  onComplete: () => void
}

function pathLabel(path: number[]): string {
  return path.map((d) => (d === 8 ? '1' : String(d))).join(' → ')
}

export function T3Lesson({ activeKey, onComplete }: Props) {
  const t = useT()
  const [sounding, setSounding] = useState(0)
  const [lastPath, setLastPath] = useState<number[] | null>(null)
  const [audioError, setAudioError] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  async function withAudio(fn: () => Promise<void>) {
    try {
      setAudioError(false)
      await ensureAudio()
      await fn()
    } catch {
      if (mounted.current) setAudioError(true)
    }
  }

  function playAgainstTonic(degree: number) {
    setSounding(degree)
    void withAudio(() => playDegreeAgainstTonic(activeKey.tonic, degree))
  }

  function playTheResolution(degree: number) {
    void withAudio(() =>
      playResolution(activeKey.tonic, degree, (d) => {
        if (mounted.current) setSounding(d)
      }),
    )
  }

  function handleTapWidget(degree: number) {
    setSounding(degree)
    setLastPath(resolutionDegrees(degree))
    void withAudio(async () => {
      await playDegreeAgainstTonic(activeKey.tonic, degree)
      await playResolution(activeKey.tonic, degree, (d) => {
        if (mounted.current) setSounding(d)
      })
    })
  }

  const chip =
    'mono snap border-[length:var(--rule)] border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-[length:var(--fs-2)] font-bold'

  const sections: LessonSection[] = [
    {
      headingKey: 't3.demo.heading',
      bodyKey: 't3.demo.body',
      bodyVars: { key: activeKey.label },
      content: (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <button className={chip} onClick={() => playAgainstTonic(7)}>
              {t('t3.demo.play7')}
            </button>
            <button className={chip} onClick={() => playTheResolution(7)}>
              {t('t3.demo.resolve7')}
            </button>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <button className={chip} onClick={() => playAgainstTonic(4)}>
              {t('t3.demo.play4')}
            </button>
            <button className={chip} onClick={() => playTheResolution(4)}>
              {t('t3.demo.resolve4')}
            </button>
          </div>
          <DegreeRuler tonic={activeKey.tonic} soundingDegree={sounding} showNotes />
        </>
      ),
    },
    {
      headingKey: 't3.widget.heading',
      bodyKey: 't3.widget.body',
      content: (
        <>
          <DegreeRuler tonic={activeKey.tonic} soundingDegree={sounding} onTap={handleTapWidget} showNotes />
          <p className="mono mt-4 text-[length:var(--fs-1)] text-[color:var(--ink-dim)]">
            {lastPath ? t('t3.widget.caption', { path: pathLabel(lastPath) }) : t('t3.widget.captionEmpty')}
          </p>
          {audioError ? (
            <p className="mono mt-2 text-[length:var(--fs-1)]" role="alert">
              {t('audio.error')}
            </p>
          ) : null}
        </>
      ),
    },
  ]

  return (
    <LessonShell
      nodeId="T3"
      eyebrowKey="t3.eyebrow"
      titleKey="t3.title"
      claimKey="t3.claim"
      sections={sections}
      completeBodyKey="t3.complete.body"
      completeCtaLabelKey="lesson.cta.session"
      onComplete={onComplete}
    />
  )
}
