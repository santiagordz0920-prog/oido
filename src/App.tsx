import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Home } from './features/Home'
import { T2Lesson } from './features/T2Lesson'
import { E1Drill } from './features/E1Drill'
import { useSettings } from './state/settings'
import { keyByTonic, type KeyDef } from './theory/keys'
import { stop } from './audio/engine'

type View = 'home' | 't2' | 'e1'

export default function App() {
  const { theme, locale, reduceColor } = useSettings()
  const [view, setView] = useState<View>('home')
  const [activeKey, setActiveKey] = useState<KeyDef>(() => keyByTonic('C'))

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.reduceColor = String(reduceColor)
    root.lang = locale
  }, [theme, reduceColor, locale])

  function goHome() {
    stop()
    setView('home')
  }

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ ['--active-key-hue' as string]: `${activeKey.hue}deg` }}
    >
      <Header activeKey={activeKey} onHome={view !== 'home' ? goHome : undefined} />
      {view === 'home' ? <Home onOpenT2={() => setView('t2')} onOpenE1={() => setView('e1')} /> : null}
      {view === 't2' ? (
        <T2Lesson activeKey={activeKey} onKeyChange={setActiveKey} onGoToDrill={() => setView('e1')} />
      ) : null}
      {view === 'e1' ? <E1Drill onKeyChange={setActiveKey} /> : null}
    </div>
  )
}
