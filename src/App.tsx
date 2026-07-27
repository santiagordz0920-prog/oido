import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Home } from './features/Home'
import { T2Lesson } from './features/T2Lesson'
import { E1Drill } from './features/E1Drill'
import { SessionSetup } from './features/SessionSetup'
import { SessionRunner } from './features/SessionRunner'
import { Constellation } from './features/Constellation'
import { useSettings } from './state/settings'
import { useNodeCompleted } from './state/progress'
import { keyByTonic, type KeyDef } from './theory/keys'
import { stop } from './audio/engine'
import { migratePhase0 } from './db'
import { completeLesson } from './scheduler/engine'
import type { SessionMode } from './session/modes'

type View =
  | { name: 'home' }
  | { name: 't2' }
  | { name: 'e1' }
  | { name: 'session-setup' }
  | { name: 'session'; mode: SessionMode }
  | { name: 'constellation' }

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
          onOpenT2={() => setView({ name: 't2' })}
          onOpenE1={() => setView({ name: 'e1' })}
          onOpenSession={() => setView({ name: 'session-setup' })}
          onOpenConstellation={() => setView({ name: 'constellation' })}
        />
      ) : null}
      {view.name === 't2' ? (
        <T2Lesson activeKey={activeKey} onKeyChange={setActiveKey} onGoToDrill={() => setView({ name: 'e1' })} />
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
    </div>
  )
}
