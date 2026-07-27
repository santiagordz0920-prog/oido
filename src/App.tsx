import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Home } from './features/Home'
import { T2Lesson } from './features/T2Lesson'
import { TheoryIndex } from './features/lessons/TheoryIndex'
import { T1Lesson } from './features/lessons/T1Lesson'
import { T3Lesson } from './features/lessons/T3Lesson'
import { T4Lesson } from './features/lessons/T4Lesson'
import { T5Lesson } from './features/lessons/T5Lesson'
import { T6Lesson } from './features/lessons/T6Lesson'
import { T7Lesson } from './features/lessons/T7Lesson'
import { T8Lesson } from './features/lessons/T8Lesson'
import { T9Lesson } from './features/lessons/T9Lesson'
import { T10Lesson } from './features/lessons/T10Lesson'
import { T11Lesson } from './features/lessons/T11Lesson'
import { T12Lesson } from './features/lessons/T12Lesson'
import { E1Drill } from './features/E1Drill'
import { SessionSetup } from './features/SessionSetup'
import { SessionRunner } from './features/SessionRunner'
import { Constellation } from './features/Constellation'
import { Checkpoint } from './features/Checkpoint'
import { Calibration } from './features/Calibration'
import { MicCheck } from './features/MicCheck'
import { useSettings } from './state/settings'
import { useNodeCompleted } from './state/progress'
import { keyByTonic, type KeyDef } from './theory/keys'
import { stop } from './audio/engine'
import { migratePhase0 } from './db'
import { completeLesson } from './scheduler/engine'
import type { SessionMode } from './session/modes'
import type { CheckpointId } from './curriculum/checkpoints'

type View =
  | { name: 'home' }
  | { name: 'theory' }
  | { name: 't1' }
  | { name: 't2' }
  | { name: 't3' }
  | { name: 't4' }
  | { name: 't5' }
  | { name: 't6' }
  | { name: 't7' }
  | { name: 't8' }
  | { name: 't9' }
  | { name: 't10' }
  | { name: 't11' }
  | { name: 't12' }
  | { name: 'e1' }
  | { name: 'session-setup' }
  | { name: 'session'; mode: SessionMode }
  | { name: 'constellation' }
  | { name: 'checkpoint'; checkpointId: CheckpointId }
  | { name: 'calibration' }
  | { name: 'mic-check' }

// Theory index → lesson view routing. Only lessons with a built screen are
// listed here; TheoryIndex never offers a CTA for a node that has no entry.
const LESSON_VIEW: Partial<Record<string, View>> = {
  T1: { name: 't1' },
  T2: { name: 't2' },
  T3: { name: 't3' },
  T4: { name: 't4' },
  T5: { name: 't5' },
  T6: { name: 't6' },
  T7: { name: 't7' },
  T8: { name: 't8' },
  T9: { name: 't9' },
  T10: { name: 't10' },
  T11: { name: 't11' },
  T12: { name: 't12' },
}

export default function App() {
  const { theme, locale, reduceColor } = useSettings()
  const [view, setView] = useState<View>({ name: 'home' })
  const [activeKey, setActiveKey] = useState<KeyDef>(() => keyByTonic('C'))
  const t2Complete = useNodeCompleted('T2')

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.reduceColor = String(reduceColor)
    root.lang = locale
  }, [theme, reduceColor, locale])

  // One-time carry-over of the Phase 0 localStorage completion flag.
  useEffect(() => {
    void migratePhase0(completeLesson)
  }, [])

  function goHome() {
    stop()
    setView({ name: 'home' })
  }

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ ['--active-key-hue' as string]: `${activeKey.hue}deg` }}
    >
      <Header activeKey={activeKey} onHome={view.name !== 'home' ? goHome : undefined} />
      {view.name === 'home' ? (
        <Home
          onOpenTheory={() => setView({ name: 'theory' })}
          onOpenE1={() => setView({ name: 'e1' })}
          onOpenSession={() => setView({ name: 'session-setup' })}
          onOpenConstellation={() => setView({ name: 'constellation' })}
          onOpenCalibration={() => setView({ name: 'calibration' })}
          onOpenMicCheck={() => setView({ name: 'mic-check' })}
        />
      ) : null}
      {view.name === 'theory' ? (
        <TheoryIndex
          onOpenLesson={(id) => {
            const target = LESSON_VIEW[id]
            if (target) setView(target)
          }}
          onOpenCheckpoint={(id) => setView({ name: 'checkpoint', checkpointId: id as CheckpointId })}
        />
      ) : null}
      {view.name === 't1' ? (
        <T1Lesson activeKey={activeKey} onComplete={() => setView({ name: 'session-setup' })} />
      ) : null}
      {view.name === 't2' ? (
        <T2Lesson activeKey={activeKey} onKeyChange={setActiveKey} onGoToDrill={() => setView({ name: 'e1' })} />
      ) : null}
      {view.name === 't3' ? (
        <T3Lesson activeKey={activeKey} onComplete={() => setView({ name: 'session-setup' })} />
      ) : null}
      {view.name === 't4' ? (
        <T4Lesson
          activeKey={activeKey}
          onKeyChange={setActiveKey}
          onComplete={() => setView({ name: 'session-setup' })}
        />
      ) : null}
      {view.name === 't5' ? (
        <T5Lesson activeKey={activeKey} onComplete={() => setView({ name: 'session-setup' })} />
      ) : null}
      {view.name === 't6' ? (
        <T6Lesson activeKey={activeKey} onComplete={() => setView({ name: 'session-setup' })} />
      ) : null}
      {view.name === 't7' ? (
        <T7Lesson activeKey={activeKey} onComplete={() => setView({ name: 'session-setup' })} />
      ) : null}
      {view.name === 't8' ? (
        <T8Lesson activeKey={activeKey} onComplete={() => setView({ name: 'session-setup' })} />
      ) : null}
      {view.name === 't9' ? (
        <T9Lesson activeKey={activeKey} onComplete={() => setView({ name: 'session-setup' })} />
      ) : null}
      {view.name === 't10' ? (
        <T10Lesson activeKey={activeKey} onComplete={() => setView({ name: 'session-setup' })} />
      ) : null}
      {view.name === 't11' ? (
        <T11Lesson activeKey={activeKey} onComplete={() => setView({ name: 'session-setup' })} />
      ) : null}
      {view.name === 't12' ? (
        <T12Lesson activeKey={activeKey} onComplete={() => setView({ name: 'session-setup' })} />
      ) : null}
      {view.name === 'e1' ? <E1Drill onKeyChange={setActiveKey} /> : null}
      {view.name === 'session-setup' ? (
        <SessionSetup
          t2Complete={t2Complete}
          onStart={(mode) => setView({ name: 'session', mode })}
          onOpenT2={() => setView({ name: 't2' })}
        />
      ) : null}
      {view.name === 'session' ? (
        <SessionRunner mode={view.mode} onKeyChange={setActiveKey} onExit={goHome} />
      ) : null}
      {view.name === 'constellation' ? <Constellation /> : null}
      {view.name === 'calibration' ? (
        <Calibration onDone={goHome} onOpenCheck={() => setView({ name: 'mic-check' })} />
      ) : null}
      {view.name === 'mic-check' ? (
        <MicCheck
          onKeyChange={setActiveKey}
          onOpenCalibration={() => setView({ name: 'calibration' })}
          onExit={goHome}
        />
      ) : null}
      {view.name === 'checkpoint' ? (
        <Checkpoint
          checkpointId={view.checkpointId}
          onKeyChange={setActiveKey}
          onExit={() => setView({ name: 'theory' })}
        />
      ) : null}
    </div>
  )
}
