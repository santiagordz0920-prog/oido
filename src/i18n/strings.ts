export type Locale = 'es' | 'en'

// Every user-facing string lives here, in both languages, from Phase 0.
// Keys are grouped by feature. Placeholders use {name} syntax.
const strings = {
  // App shell
  'app.title': { es: 'Oído', en: 'Oído' },
  'app.tagline': {
    es: 'Entrenador de oído funcional, teoría y diapasón para guitarristas',
    en: 'Functional-ear, theory, and fretboard trainer for guitarists',
  },
  'shell.theme.toLight': { es: 'Tema claro', en: 'Light theme' },
  'shell.theme.toDark': { es: 'Tema oscuro', en: 'Dark theme' },
  'shell.language': { es: 'English', en: 'Español' },
  'shell.reduceColor.on': { es: 'Color: reducido', en: 'Color: reduced' },
  'shell.reduceColor.off': { es: 'Color: completo', en: 'Color: full' },
  'shell.back': { es: 'Inicio', en: 'Home' },
  'shell.wheel.open': { es: 'Círculo de quintas. Tonalidad actual: {key}', en: 'Circle of fifths. Current key: {key}' },
  'shell.wheel.close': { es: 'Cerrar', en: 'Close' },
  'shell.wheel.title': { es: 'Círculo de quintas', en: 'Circle of fifths' },

  // Home
  'home.lessons': { es: 'Teoría', en: 'Theory' },
  'home.drills': { es: 'Oído', en: 'Ear' },
  'home.empty': {
    es: 'Una pantalla vacía es una invitación a empezar.',
    en: 'An empty progress screen is an invitation to start.',
  },
  'home.locked': { es: 'Se desbloquea al completar {id}', en: 'Unlocks after completing {id}' },
  'home.done': { es: 'Completada', en: 'Completed' },
  'home.start': { es: 'Empezar', en: 'Start' },
  'home.review': { es: 'Repasar', en: 'Review' },

  // T2 lesson
  't2.eyebrow': { es: 'T2 · 3 min', en: 'T2 · 3 min' },
  't2.title': {
    es: 'La escala mayor como regla de medir',
    en: 'The major scale as the measuring ruler',
  },
  't2.claim': {
    es: 'Al final de esta lección vas a entender que cada nota de una tonalidad se nombra por su grado —su posición en la regla— y que esa regla funciona igual en las doce tonalidades.',
    en: 'By the end of this lesson you will understand that every note in a key is named by its degree — its position on the ruler — and that the ruler works the same in all twelve keys.',
  },
  't2.demo.heading': { es: 'Escúchala primero', en: 'Hear it first' },
  't2.demo.body': {
    es: 'Esto es la escala mayor de {key}. No es una lista de notas: es una regla de siete posiciones que se repite. El grado 1 es casa.',
    en: 'This is the {key} major scale. It is not a list of notes: it is a seven-position ruler that repeats. Degree 1 is home.',
  },
  't2.demo.play': { es: 'Tocar la escala', en: 'Play the scale' },
  't2.demo.stop': { es: 'Detener', en: 'Stop' },
  't2.widget.heading': { es: 'Muévela tú', en: 'Now you move it' },
  't2.widget.body': {
    es: 'Toca cualquier grado para oírlo contra la tónica. Después cambia la tonalidad: las notas cambian, los grados no. Esa es la idea completa.',
    en: 'Tap any degree to hear it against the tonic. Then change the key: the notes change, the degrees do not. That is the whole idea.',
  },
  't2.widget.keyLabel': { es: 'Tonalidad', en: 'Key' },
  't2.widget.degreeOf': { es: 'Grado {degree} de {key} mayor: {note}', en: 'Degree {degree} of {key} major: {note}' },
  't2.check.heading': { es: 'Comprueba', en: 'Check yourself' },
  't2.check.think': {
    es: 'Responde en tu cabeza antes de mirar las opciones.',
    en: 'Answer in your head before looking at the options.',
  },
  't2.check.showOptions': { es: 'Ver opciones', en: 'Show options' },
  't2.check.correct': { es: 'Correcto.', en: 'Correct.' },
  't2.check.incorrect': { es: 'No. Inténtalo otra vez.', en: 'No. Try again.' },
  't2.check.progress': { es: 'Pregunta {n} de {total}', en: 'Question {n} of {total}' },
  't2.q1.prompt': {
    es: '¿Qué grado es casa, el punto de reposo de una tonalidad?',
    en: 'Which degree is home, the point of rest in a key?',
  },
  't2.q2.prompt': {
    es: '¿Cuántos grados tiene la regla antes de repetirse?',
    en: 'How many degrees does the ruler have before it repeats?',
  },
  't2.q3.prompt': {
    es: 'En mi mayor (E), ¿qué nota es el grado 5?',
    en: 'In E major, which note is degree 5?',
  },
  't2.q4.prompt': {
    es: 'En la bemol mayor (A♭), ¿qué nota es el grado 3?',
    en: 'In A♭ major, which note is degree 3?',
  },
  't2.complete.title': { es: 'Lección completada', en: 'Lesson complete' },
  't2.complete.body': {
    es: 'Desbloqueaste E1: grados estables de la escala mayor.',
    en: 'You unlocked E1: stable degrees of the major scale.',
  },
  't2.complete.cta': { es: 'Ir al ejercicio E1', en: 'Go to drill E1' },

  // E1 drill
  'e1.eyebrow': { es: 'E1 · grados estables', en: 'E1 · stable degrees' },
  'e1.title': { es: 'Grados estables: 1, 3 y 5', en: 'Stable degrees: 1, 3 and 5' },
  'e1.intro': {
    es: 'Vas a oír una cadencia que establece la tonalidad y después una nota. Nómbrala por su grado. Luego canta su resolución hacia 1.',
    en: 'You will hear a cadence that establishes the key, then one note. Name it by its degree. Then sing its resolution down to 1.',
  },
  'e1.begin': { es: 'Empezar la ronda', en: 'Begin the round' },
  'e1.keyIs': { es: 'Tonalidad: {key} mayor', en: 'Key: {key} major' },
  'e1.listening': { es: 'Cadencia…', en: 'Cadence…' },
  'e1.prompt': { es: '¿Qué grado es?', en: 'Which degree is it?' },
  'e1.replay': { es: 'Repetir', en: 'Replay' },
  'e1.correct': { es: 'Sí: {degree}. {note} en {key} mayor.', en: 'Yes: {degree}. {note} in {key} major.' },
  'e1.incorrect': {
    es: 'No: era {degree}. {note} en {key} mayor.',
    en: 'No: it was {degree}. {note} in {key} major.',
  },
  'e1.sing': {
    es: 'Canta la resolución: {path}. Escúchala:',
    en: 'Sing the resolution: {path}. Hear it:',
  },
  'e1.playResolution': { es: 'Oír la resolución', en: 'Play the resolution' },
  'e1.next': { es: 'Siguiente', en: 'Next' },
  'e1.finish': { es: 'Terminar la ronda', en: 'Finish the round' },
  'e1.score': { es: '{correct} de {total} en esta ronda', en: '{correct} of {total} this round' },
  'e1.item': { es: 'Nota {n} de {total}', en: 'Item {n} of {total}' },
  'e1.summary.title': { es: 'Ronda terminada', en: 'Round complete' },
  'e1.summary.body': {
    es: 'Criterio de dominio: 90% sobre 30 notas. Las sesiones programan tus repasos a partir de aquí.',
    en: 'Mastery criterion: 90% over 30 items. Sessions schedule your reviews from here.',
  },
  'e1.summary.again': { es: 'Otra ronda', en: 'Another round' },

  // Home, Phase 1 additions
  'home.session.eyebrow': { es: 'Práctica programada', en: 'Scheduled practice' },
  'home.session.title': { es: 'Empezar una sesión', en: 'Start a session' },
  'home.session.body': {
    es: 'Elige un modo; el programador elige qué repasar.',
    en: 'Pick a mode; the scheduler picks what to review.',
  },
  'home.session.start': { es: 'Elegir modo', en: 'Choose a mode' },
  'home.due': { es: '{n} tarjetas pendientes', en: '{n} cards due' },
  'home.progress': { es: 'Progreso', en: 'Progress' },
  'home.open': { es: 'Abrir', en: 'Open' },

  // Session modes
  'session.pick.title': { es: 'Elige una sesión', en: 'Choose a session' },
  'session.pick.body': {
    es: 'El modo decide la mezcla de pistas. El programador decide qué toca repasar.',
    en: 'The mode sets the track mix. The scheduler decides what is due.',
  },
  'session.locked': {
    es: 'Las sesiones se desbloquean al completar la lección T2.',
    en: 'Sessions unlock after completing lesson T2.',
  },
  'session.mode.deskside.name': { es: 'Escritorio', en: 'Deskside' },
  'session.mode.deskside.context': { es: '3 min · entre reuniones', en: '3 min · between meetings' },
  'session.mode.deskside.detail': {
    es: 'Una lección de teoría o una tanda de ejercicios.',
    en: 'One theory lesson or one drill set.',
  },
  'session.mode.commute.name': { es: 'Trayecto', en: 'Commute' },
  'session.mode.commute.context': { es: '10 min · audífonos, sin instrumento', en: '10 min · headphones, no instrument' },
  'session.mode.commute.detail': {
    es: 'Solo teoría y oído: nada requiere la guitarra.',
    en: 'Theory and ear only — nothing needs the guitar.',
  },
  'session.mode.bench.name': { es: 'Banco', en: 'Bench' },
  'session.mode.bench.context': { es: '25 min · guitarra en mano', en: '25 min · guitar in hand' },
  'session.mode.bench.detail': {
    es: 'Calentamiento de tónica y luego ejercicios mixtos.',
    en: 'Tonic warm-up, then mixed drills.',
  },
  'session.mode.deep.name': { es: 'Profunda', en: 'Deep' },
  'session.mode.deep.context': { es: '50 min · fin de semana', en: '50 min · weekend' },
  'session.mode.deep.detail': { es: 'Repaso mixto extendido.', en: 'Extended mixed review.' },

  // Session runner
  'session.timeLeft': { es: '{clock} restantes', en: '{clock} left' },
  'session.count': { es: '{n} respuestas', en: '{n} answered' },
  'session.end': { es: 'Terminar la sesión', en: 'End the session' },
  'session.loading': { es: 'Preparando…', en: 'Preparing…' },
  'session.empty': {
    es: 'No hay nada que repasar todavía. Completa la lección T2 para desbloquear los ejercicios.',
    en: 'Nothing to review yet. Complete lesson T2 to unlock the drills.',
  },
  'session.theoryReview': { es: 'Repaso de teoría · T2', en: 'Theory review · T2' },
  'session.check.reveal': { es: 'No: la respuesta es {answer}.', en: 'No: the answer is {answer}.' },
  'session.summary.title': { es: 'Sesión terminada', en: 'Session complete' },
  'session.summary.score': { es: '{correct} de {total}', en: '{correct} of {total}' },
  'session.summary.accuracy': { es: '{pct}% de aciertos en esta sesión.', en: '{pct}% correct this session.' },
  'session.warmup.title': { es: 'Calentamiento de tónica', en: 'Tonic warm-up' },
  'session.warmup.body': {
    es: 'Una cadencia establece la tonalidad. Canta la tónica, sosténla y compárate con el piano. Cambia de tonalidad y repite.',
    en: 'A cadence establishes the key. Sing the tonic, hold it, and check yourself against the piano. Change keys and repeat.',
  },
  'session.warmup.play': { es: 'Tocar la cadencia', en: 'Play the cadence' },
  'session.warmup.tonic': { es: 'Oír la tónica', en: 'Hear the tonic' },
  'session.warmup.nextKey': { es: 'Otra tonalidad', en: 'New key' },
  'session.warmup.skip': { es: 'Pasar a los ejercicios', en: 'Skip to the drills' },
  'session.fallback.bench': {
    es: 'Los bloques de diapasón y producción llegan en las fases 3 y 4; hoy este bloque usa teoría y oído.',
    en: 'Fretboard and production blocks arrive in Phases 3 and 4; today this block runs theory and ear.',
  },
  'session.fallback.deep': {
    es: 'Las tareas y el banco de transcripción llegan en la fase 5; hoy esta sesión es repaso mixto.',
    en: 'Assignments and the transcription workbench arrive in Phase 5; today this session is mixed review.',
  },

  // Skill constellation
  'const.title': { es: 'Constelación de habilidades', en: 'Skill constellation' },
  'const.zoomIn': { es: 'Acercar', en: 'Zoom in' },
  'const.zoomOut': { es: 'Alejar', en: 'Zoom out' },
  'const.reset': { es: 'Reiniciar', en: 'Reset' },
  'const.hint': {
    es: 'Toca un nodo para ver su detalle. Arrastra para mover; usa los botones para acercar.',
    en: 'Tap a node for details. Drag to pan; use the buttons to zoom.',
  },
  'const.window': {
    es: '{pct}% en las últimas {n} (meta: {goal}% sobre {min})',
    en: '{pct}% over the last {n} (goal: {goal}% over {min})',
  },
  'const.track.T': { es: 'Teoría', en: 'Theory' },
  'const.track.E': { es: 'Oído', en: 'Ear' },
  'const.track.F': { es: 'Diapasón', en: 'Fretboard' },
  'const.track.P': { es: 'Producción', en: 'Production' },
  'const.state.locked': { es: 'Bloqueado', en: 'Locked' },
  'const.state.later': { es: 'Fase posterior', en: 'Later phase' },
  'const.state.available': { es: 'Disponible', en: 'Available' },
  'const.state.learning': { es: 'En curso', en: 'In progress' },
  'const.state.mastered': { es: 'Dominado', en: 'Mastered' },

  // Skill node titles (short, for the constellation detail panel)
  'node.T1.title': { es: 'La serie armónica', en: 'The harmonic series' },
  'node.T2.title': { es: 'La escala mayor como regla', en: 'The major scale as ruler' },
  'node.T3.title': { es: 'Tendencia y resolución', en: 'Tendency and resolution' },
  'node.T4.title': { es: 'Armaduras y el círculo de quintas', en: 'Key signatures and the circle of fifths' },
  'node.T5.title': { es: 'El menor en tres formas', en: 'Minor in three forms' },
  'node.T6.title': { es: 'Construcción de tríadas', en: 'Triad construction' },
  'node.T7.title': { es: 'Armonizar la escala', en: 'Harmonizing the scale' },
  'node.T8.title': { es: 'Armonía funcional', en: 'Functional harmony' },
  'node.T9.title': { es: 'Cadencias y frases', en: 'Cadences and phrase structure' },
  'node.T10.title': { es: 'Acordes de séptima y el tritono', en: 'Seventh chords and the tritone' },
  'node.T11.title': { es: 'Conducción de voces y notas guía', en: 'Voice leading and guide tones' },
  'node.T12.title': { es: 'Inversiones y acordes con bajo', en: 'Inversions and slash chords' },
  'node.T13.title': { es: 'Dominantes secundarias', en: 'Secondary dominants' },
  'node.T14.title': { es: 'Intercambio modal', en: 'Modal interchange' },
  'node.T15.title': { es: 'Los modos como color', en: 'Modes as harmonic color' },
  'node.T16.title': { es: 'Modulación', en: 'Modulation' },
  'node.T17.title': { es: 'El blues y sus anomalías', en: 'The blues and its anomalies' },
  'node.T18.title': { es: 'Mediantes cromáticas y más', en: 'Chromatic mediants and beyond' },
  'node.T19.title': { es: 'Rearmonización', en: 'Reharmonization' },
  'node.E0.title': { es: 'Retención de la tónica', en: 'Tonic retention' },
  'node.E1.title': { es: 'Grados estables: 1, 3 y 5', en: 'Stable degrees: 1, 3 and 5' },
  'node.E2.title': { es: 'Grados activos por tendencia', en: 'Active degrees by tendency' },
  'node.E3.title': { es: 'La escala mayor completa', en: 'The full major scale' },
  'node.E4.title': { es: 'El menor contra el mayor paralelo', en: 'Minor against parallel major' },
  'node.E5.title': { es: 'Calidad de acordes', en: 'Chord quality' },
  'node.E6.title': { es: 'Función diatónica', en: 'Diatonic function' },
  'node.E7.title': { es: 'Movimientos de dos acordes', en: 'Two-chord motions' },
  'node.E8.title': { es: 'Progresiones de cuatro compases', en: 'Four-bar progressions' },
  'node.E9.title': { es: 'Dictado de líneas de bajo', en: 'Bass-line dictation' },
  'node.E10.title': { es: 'Dominantes secundarias y préstamos', en: 'Secondary dominants and borrowed chords' },
  'node.E11.title': { es: 'Inversiones y acordes con bajo', en: 'Inversions and slash chords' },
  'node.E12.title': { es: 'Color modal', en: 'Modal color' },
  'node.E13.title': { es: 'Modulación', en: 'Modulation' },
  'node.E14.title': { es: 'Tiempo real', en: 'Real time' },
  'node.F0.title': { es: 'Nombres de notas contra el reloj', en: 'Note names under time pressure' },
  'node.F1.title': { es: 'Grados desde una raíz entre cuerdas', en: 'Degrees from a root across strings' },
  'node.F2.title': { es: 'Tríadas en todas las inversiones', en: 'Triads in all inversions' },
  'node.F3.title': { es: 'Séptimas: shells y drop-2', en: 'Seventh-chord shells and drop-2' },
  'node.F4.title': { es: 'Conducción en un grupo de cuerdas', en: 'Voice-leading on one string set' },
  'node.F5.title': { es: 'Grado sobre una raíz móvil', en: 'Degree over a moving root' },
  'node.F6.title': { es: 'Líneas de notas guía', en: 'Guide-tone lines' },
  'node.P0.title': { es: 'Canta lo que tocas', en: 'Sing what you play' },
  'node.P1.title': { es: 'Toca lo que cantas', en: 'Play what you sing' },
  'node.P2.title': { es: 'Toca lo que oyes', en: 'Play what you hear' },
  'node.P3.title': { es: 'Práctica con objetivo', en: 'Target practice' },
  'node.P4.title': { es: 'Improvisación con límites', en: 'Constrained improvisation' },
  'node.P5.title': { es: 'Improvisación libre con análisis', en: 'Free improvisation with analysis' },

  // Audio
  'audio.loading': { es: 'Cargando el piano…', en: 'Loading the piano…' },
  'audio.error': {
    es: 'El audio no pudo iniciarse. Toca la pantalla e inténtalo de nuevo.',
    en: 'Audio could not start. Tap the screen and try again.',
  },
} as const

export type StringKey = keyof typeof strings

export function translate(locale: Locale, key: StringKey, vars?: Record<string, string | number>): string {
  let s: string = strings[key][locale]
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      s = s.replaceAll(`{${name}}`, String(value))
    }
  }
  return s
}
