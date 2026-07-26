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
    es: 'Criterio de dominio: 90% sobre 30 notas. El programador de repaso llega en la Fase 1.',
    en: 'Mastery criterion: 90% over 30 items. The review scheduler arrives in Phase 1.',
  },
  'e1.summary.again': { es: 'Otra ronda', en: 'Another round' },

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
