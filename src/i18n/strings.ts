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

  // Home — theory index card
  'home.theory.eyebrow': { es: 'Teoría', en: 'Theory' },
  'home.theory.title': { es: 'Lecciones de teoría', en: 'Theory lessons' },
  'home.theory.body': {
    es: 'Reglas de la tonalidad, siempre audibles y manipulables.',
    en: 'Rules of the key, always audible and manipulable.',
  },
  'home.theory.cta': { es: 'Ver lecciones', en: 'View lessons' },

  // Theory index screen
  'theory.index.eyebrow': { es: '{id} · 3 min', en: '{id} · 3 min' },
  'theory.soon': { es: 'Próximamente', en: 'Coming soon' },

  // T1 lesson — the harmonic series
  't1.eyebrow': { es: 'T1 · 3 min', en: 'T1 · 3 min' },
  't1.title': { es: 'La serie armónica', en: 'The harmonic series' },
  't1.claim': {
    es: 'Al final de esta lección vas a entender de dónde sale la consonancia: la octava y la quinta son estables porque ya están presentes en la propia vibración de una cuerda.',
    en: "By the end of this lesson you will understand where consonance comes from: the octave and the fifth are stable because they are already present in a single string's own vibration.",
  },
  't1.demo.heading': { es: 'Una cuerda, muchas vibraciones', en: 'One string, many vibrations' },
  't1.demo.body': {
    es: 'Una cuerda no vibra de una sola manera: vibra entera y también en mitades, tercios, cuartos… cada modo añade un parcial. El parcial 2 duplica la nota fundamental —la octava—; el parcial 3 añade una nota nueva, la quinta por encima de esa octava. Tónica: {key}.',
    en: "A string does not vibrate just one way: it vibrates as a whole and also in halves, thirds, quarters — each mode adds a partial. Partial 2 doubles the fundamental note — the octave; partial 3 adds a new note, the fifth above that octave. Tonic: {key}.",
  },
  't1.demo.play': { es: 'Tocar la serie', en: 'Play the series' },
  't1.widget.heading': { es: 'Tócala tú', en: 'Now you play it' },
  't1.widget.body': {
    es: 'Elige hasta qué parcial quieres oír la pila. Después compara la quinta contra la tónica: su estabilidad viene de que ya suena dentro de la propia serie.',
    en: 'Pick how many partials to hear in the stack. Then compare the fifth against the tonic: its stability comes from already sounding inside the series itself.',
  },
  't1.widget.depth': { es: 'Hasta el parcial {n}', en: 'Up to partial {n}' },
  't1.widget.playFifth': { es: 'Tocar 1 y 5 juntos', en: 'Play 1 and 5 together' },
  't1.widget.caption': {
    es: 'El grado 5 es estable porque ya aparece en la serie armónica de la tónica.',
    en: "Degree 5 is stable because it already appears in the tonic's own harmonic series.",
  },
  't1.q1.prompt': {
    es: '¿Qué parcial suena la misma nota que la fundamental, una octava más arriba?',
    en: 'Which partial sounds the same note as the fundamental, one octave higher?',
  },
  't1.q2.prompt': {
    es: '¿Qué parcial es el primero en introducir una clase de nota nueva?',
    en: 'Which partial is the first to introduce a new pitch class?',
  },
  't1.q3.prompt': {
    es: 'Además del grado 1, ¿qué grado de la escala hace estable la serie armónica?',
    en: 'Besides degree 1, which scale degree does the harmonic series make stable?',
  },
  't1.q4.prompt': {
    es: 'Hasta el parcial 4 (inclusive), ¿cuántas clases de nota distintas han sonado?',
    en: 'Up through partial 4, how many distinct pitch classes have sounded?',
  },
  't1.complete.body': {
    es: 'Desbloqueaste E0: retención de la tónica.',
    en: 'You unlocked E0: tonic retention.',
  },

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

  // T3 lesson — tendency and resolution
  't3.eyebrow': { es: 'T3 · 3 min', en: 'T3 · 3 min' },
  't3.title': { es: 'Tendencia y resolución', en: 'Tendency and resolution' },
  't3.claim': {
    es: 'Al final de esta lección vas a sentir por qué el grado 7 tira hacia 1 y el grado 4 se inclina hacia 3 — el resto de la tonalidad se organiza alrededor de esos dos tirones.',
    en: 'By the end of this lesson you will feel why degree 7 pulls toward 1 and degree 4 leans toward 3 — the rest of the key organizes itself around those two pulls.',
  },
  't3.demo.heading': { es: 'Escúchalo primero', en: 'Hear it first' },
  't3.demo.body': {
    es: 'En {key} mayor, el grado 7 es inestable: apoyado sobre la tónica quiere subir un paso a 1. El grado 4 también es inestable: quiere bajar un paso a 3. Ningún nombre de intervalo — solo el tirón.',
    en: 'In {key} major, degree 7 is unstable: held against the tonic it wants to step up to 1. Degree 4 is unstable too: it wants to step down to 3. No interval names — just the pull.',
  },
  't3.demo.play7': { es: 'Tocar 7 contra la tónica', en: 'Play 7 against the tonic' },
  't3.demo.resolve7': { es: 'Tocar la resolución: 7 → 1', en: 'Play the resolution: 7 → 1' },
  't3.demo.play4': { es: 'Tocar 4 contra la tónica', en: 'Play 4 against the tonic' },
  't3.demo.resolve4': { es: 'Tocar la resolución: 4 → 3', en: 'Play the resolution: 4 → 3' },
  't3.widget.heading': { es: 'Tócalos tú', en: 'Now you tap them' },
  't3.widget.body': {
    es: 'Toca cualquier grado: lo oyes contra la tónica y después su resolución completa. Fíjate en cuáles caen solos y cuáles necesitan moverse.',
    en: 'Tap any degree: you hear it against the tonic, then its full resolution. Notice which ones already sit at rest and which ones need to move.',
  },
  't3.widget.caption': { es: 'Camino de resolución: {path}', en: 'Resolution path: {path}' },
  't3.widget.captionEmpty': {
    es: 'Toca un grado para ver su camino de resolución.',
    en: 'Tap a degree to see its resolution path.',
  },
  't3.q1.prompt': {
    es: '¿Qué grado tira hacia arriba, hacia el 1?',
    en: 'Which degree pulls upward, toward 1?',
  },
  't3.q2.prompt': { es: '¿Hacia dónde quiere caer el grado 4?', en: 'Where does degree 4 want to fall?' },
  't3.q3.prompt': { es: '¿Qué grados están estables, en reposo?', en: 'Which degrees are stable, at rest?' },
  't3.q4.prompt': {
    es: 'En la mayor (A), ¿qué nota es el grado 7, el que tira hacia la tónica?',
    en: 'In A major, which note is degree 7, the one that pulls toward the tonic?',
  },
  't3.complete.body': {
    es: 'Desbloqueaste E2: grados activos por tendencia.',
    en: 'You unlocked E2: active degrees by tendency.',
  },

  // T4 lesson — key signatures and the circle of fifths
  't4.eyebrow': { es: 'T4 · 3 min', en: 'T4 · 3 min' },
  't4.title': {
    es: 'Armaduras y el círculo de quintas',
    en: 'Key signatures and the circle of fifths',
  },
  't4.claim': {
    es: 'Al final de esta lección vas a leer el círculo de quintas como un mapa de distancias entre tonalidades, no como una tabla que hay que memorizar.',
    en: 'By the end of this lesson you will read the circle of fifths as a map of distance between keys, not a table to memorize.',
  },
  't4.demo.heading': { es: 'Un mapa, no una lista', en: 'A map, not a list' },
  't4.demo.body': {
    es: 'Tonalidades vecinas en el círculo comparten todas sus notas menos una. Toca la cadencia en {key} y luego muévete un paso a cada lado — el cambio se oye cercano porque casi todo se queda igual.',
    en: 'Neighboring keys on the circle share every note but one. Play the cadence in {key}, then move one step either way — the change sounds close because almost everything stays the same.',
  },
  't4.demo.play': { es: 'Tocar la cadencia', en: 'Play the cadence' },
  't4.demo.stepRight': { es: 'Un paso a la derecha', en: 'One step right' },
  't4.demo.stepLeft': { es: 'Un paso a la izquierda', en: 'One step left' },
  't4.widget.heading': { es: 'Toca cualquier tonalidad', en: 'Tap any key' },
  't4.widget.body': {
    es: 'Cada ficha es una tonalidad. Tócala para oír su cadencia y ver cuántas alteraciones lleva su armadura.',
    en: 'Each chip is a key. Tap it to hear its cadence and see how many accidentals its signature carries.',
  },
  't4.widget.caption.none': { es: '{key} mayor: sin alteraciones.', en: '{key} major: no accidentals.' },
  't4.widget.caption.some': {
    es: '{key} mayor: {count} alteraciones ({glyphs}).',
    en: '{key} major: {count} accidentals ({glyphs}).',
  },
  't4.q1.prompt': {
    es: '¿Qué tonalidad está un paso en sentido horario desde sol (G) mayor?',
    en: 'Which key sits one step clockwise from G major?',
  },
  't4.q2.prompt': {
    es: '¿Cuántas alteraciones tiene mi mayor (E)?',
    en: 'How many accidentals does E major carry?',
  },
  't4.q3.prompt': {
    es: 'Dos tonalidades vecinas en el círculo se diferencian por cuántas notas de la escala?',
    en: 'Two neighboring keys on the circle differ by how many scale notes?',
  },
  't4.q4.prompt': {
    es: '¿Qué tonalidad está en el punto opuesto a do (C) en el círculo?',
    en: 'Which key sits at the point opposite C on the circle?',
  },
  't4.complete.body': {
    es: 'Desbloqueaste E3: la escala mayor completa, entrelazada.',
    en: 'You unlocked E3: the full major scale, interleaved.',
  },

  // T5 lesson — minor in three forms
  't5.eyebrow': { es: 'T5 · 3 min', en: 'T5 · 3 min' },
  't5.title': { es: 'El menor en tres formas', en: 'Minor in three forms' },
  't5.claim': {
    es: 'Al final de esta lección vas a saber por qué el menor tiene tres formas y qué grado cambia en cada una.',
    en: 'By the end of this lesson you will know why minor has three forms and which degree changes in each.',
  },
  't5.demo.heading': { es: 'Tres formas, un menor', en: 'Three forms, one minor' },
  't5.demo.body': {
    es: 'La menor natural es la relativa exacta de la mayor. La armónica sube el grado 7 para que empuje hacia 1. La melódica ascendente sube también el grado 6, para suavizar el salto que deja el 7 subido.',
    en: 'Natural minor is the exact relative of major. Harmonic minor raises degree 7 so it pushes toward 1. Melodic minor ascending also raises degree 6, to smooth the gap the raised 7 leaves behind.',
  },
  't5.demo.natural': { es: 'Menor natural', en: 'Natural minor' },
  't5.demo.harmonic': { es: 'Menor armónica', en: 'Harmonic minor' },
  't5.demo.melodic': { es: 'Menor melódica', en: 'Melodic minor' },
  't5.widget.heading': { es: 'Compárala tú', en: 'Compare it yourself' },
  't5.widget.body': {
    es: 'Elige una forma y compárala contra la mayor paralela. Oyes la mayor primero y la forma elegida después, misma tónica.',
    en: 'Pick a form and compare it against the parallel major. You hear major first, then the chosen form, same tonic.',
  },
  't5.widget.compare': { es: 'Comparar con la mayor', en: 'Compare with major' },
  't5.widget.selected': { es: 'Forma elegida: {form}', en: 'Selected form: {form}' },
  't5.q1.prompt': { es: '¿Qué grado se sube en la menor armónica?', en: 'Which degree is raised in harmonic minor?' },
  't5.q2.prompt': {
    es: 'Al subir el grado 7 en la menor armónica, ¿qué camino de resolución se crea?',
    en: 'When degree 7 is raised in harmonic minor, what resolution path does it create?',
  },
  't5.q3.prompt': {
    es: '¿Qué dos grados se suben en la menor melódica ascendente?',
    en: 'Which two degrees are raised in melodic minor ascending?',
  },
  't5.q4.prompt': {
    es: '¿Cuántos grados de la menor natural se apartan de la armadura de su mayor relativa?',
    en: "How many degrees of natural minor differ from its relative major's key signature?",
  },
  't5.complete.body': {
    es: 'Desbloqueaste E4: el menor contrastado contra la mayor paralela.',
    en: 'You unlocked E4: minor contrasted against parallel major.',
  },

  // T6 lesson — triad construction, four qualities
  't6.eyebrow': { es: 'T6 · 3 min', en: 'T6 · 3 min' },
  't6.title': { es: 'Construcción de tríadas', en: 'Triad construction' },
  't6.claim': {
    es: 'Al final de esta lección vas a saber qué grado del acorde mueves para pasar de mayor a menor, disminuido o aumentado.',
    en: 'By the end of this lesson you will know which chord degree you move to turn major into minor, diminished or augmented.',
  },
  't6.demo.heading': { es: 'Las cuatro calidades', en: 'The four qualities' },
  't6.demo.body': {
    es: 'Toda tríada apila un 1, un 3 y un 5. Bajar o subir el 3 o el 5 cambia la calidad completa del acorde.',
    en: 'Every triad stacks a 1, a 3 and a 5. Lowering or raising the 3 or the 5 changes the whole quality of the chord.',
  },
  't6.demo.maj': { es: 'Mayor', en: 'Major' },
  't6.demo.min': { es: 'Menor', en: 'Minor' },
  't6.demo.dim': { es: 'Disminuido', en: 'Diminished' },
  't6.demo.aug': { es: 'Aumentado', en: 'Augmented' },
  't6.widget.heading': { es: 'Muévelo tú', en: 'Now you move it' },
  't6.widget.body': {
    es: 'Empieza en mayor. Cada botón mueve un grado del acorde y nombra el cambio.',
    en: 'Start from major. Each button moves one chord degree and names the change.',
  },
  't6.widget.lower3': { es: 'Bajar el 3 → menor', en: 'Lower the 3 → minor' },
  't6.widget.lower5ofMinor': {
    es: 'Bajar el 5 de la menor → disminuido',
    en: 'Lower the 5 of minor → diminished',
  },
  't6.widget.raise5ofMajor': {
    es: 'Subir el 5 de la mayor → aumentado',
    en: 'Raise the 5 of major → augmented',
  },
  't6.widget.current': { es: 'Acorde actual: {root} {quality}', en: 'Current chord: {root} {quality}' },
  't6.q1.prompt': {
    es: '¿Qué grado del acorde distingue mayor de menor?',
    en: 'Which chord degree distinguishes major from minor?',
  },
  't6.q2.prompt': {
    es: 'Bajar el 5 de una tríada menor da como resultado:',
    en: 'Lowering the 5 of a minor triad gives:',
  },
  't6.q3.prompt': {
    es: 'Subir el 5 de una tríada mayor da como resultado:',
    en: 'Raising the 5 of a major triad gives:',
  },
  't6.q4.prompt': {
    es: '¿Cuántas calidades de tríada distintas existen aquí?',
    en: 'How many distinct triad qualities exist here?',
  },
  't6.complete.body': {
    es: 'Desbloqueaste E5 (calidad de acordes) y F2 (tríadas en el diapasón).',
    en: 'You unlocked E5 (chord quality) and F2 (triads on the fretboard).',
  },

  // T7 lesson — harmonizing the scale
  't7.eyebrow': { es: 'T7 · 3 min', en: 'T7 · 3 min' },
  't7.title': { es: 'Armonizar la escala', en: 'Harmonizing the scale' },
  't7.claim': {
    es: 'Al final de esta lección vas a saber de dónde salen los siete acordes de una tonalidad: se apila la escala sobre sí misma.',
    en: 'By the end of this lesson you will know where a key\'s seven chords come from: the scale stacked on itself.',
  },
  't7.demo.heading': { es: 'Siete acordes, una escala', en: 'Seven chords, one scale' },
  't7.demo.body': {
    es: 'Cada acorde nace de un grado de la escala, más los dos grados que salen de saltar uno cada vez: el I usa 1, 3 y 5; el ii usa 2, 4 y 6; y así con cada grado. Escúchalos en orden, del I al vii°.',
    en: 'Each chord grows out of one scale degree, plus the two degrees you reach by skipping one each time: I uses 1, 3 and 5; ii uses 2, 4 and 6, and so on for every degree. Hear them in order, from I to vii°.',
  },
  't7.demo.play': { es: 'Tocar la progresión', en: 'Play the progression' },
  't7.demo.stop': { es: 'Detener', en: 'Stop' },
  't7.widget.heading': { es: 'Tócalos tú', en: 'Now you tap them' },
  't7.widget.body': {
    es: 'Toca cualquier numeral: oyes una cadencia y después ese acorde en contexto.',
    en: 'Tap any numeral: you hear a cadence, then that chord in context.',
  },
  't7.widget.caption': { es: '{numeral}: raíz {root}', en: '{numeral}: root {root}' },
  't7.q1.prompt': {
    es: '¿Qué numerales son menores en una tonalidad mayor?',
    en: 'Which numerals are minor in a major key?',
  },
  't7.q2.prompt': { es: '¿Qué calidad cae en vii?', en: 'What quality lands on vii?' },
  't7.q3.prompt': { es: '¿Cuáles tres numerales son mayores?', en: 'Which three numerals are major?' },
  't7.q4.prompt': { es: '¿Hacia dónde quiere ir el acorde V?', en: 'Where does the V chord want to go?' },
  't7.complete.body': {
    es: 'Desbloqueaste E6: función diatónica, presentada después de una cadencia.',
    en: 'You unlocked E6: diatonic function, presented after a cadence.',
  },

  // T8 lesson — functional harmony: tonic, subdominant, dominant
  't8.eyebrow': { es: 'T8 · 3 min', en: 'T8 · 3 min' },
  't8.title': { es: 'Armonía funcional', en: 'Functional harmony' },
  't8.claim': {
    es: 'Al final de esta lección vas a oír que cada acorde de una tonalidad cumple uno de tres trabajos: estar en casa, alejarse de casa, o tirar hacia casa.',
    en: 'By the end of this lesson you will hear that every chord in a key does one of three jobs: sit at home, move away from home, or pull back home.',
  },
  't8.demo.heading': { es: 'Tres trabajos, una progresión', en: 'Three jobs, one progression' },
  't8.demo.body': {
    es: 'En {key} mayor, I es la tónica (T): casa. IV es la subdominante (S): te alejas. V es la dominante (D): tira de vuelta a casa. Escucha I–IV–V–I y sigue la letra de función bajo cada numeral.',
    en: 'In {key} major, I is the tonic (T): home. IV is the subdominant (S): you move away. V is the dominant (D): it pulls back home. Listen to I–IV–V–I and follow the function letter under each numeral.',
  },
  't8.demo.play': { es: 'Tocar I–IV–V–I', en: 'Play I–IV–V–I' },
  't8.demo.stop': { es: 'Detener', en: 'Stop' },
  't8.widget.heading': { es: 'Cada familia, y dos caminos a casa', en: 'Each family, and two paths home' },
  't8.widget.body': {
    es: 'Toca cada familia para oír sus acordes. Después compara dos frases con las mismas piezas en distinto orden: T→S→D→T y T→D→S→T. ¿Cuál de las dos cierra con más fuerza?',
    en: 'Tap each family to hear its chords. Then compare two phrases built from the same pieces in a different order: T→S→D→T and T→D→S→T. Which one closes harder?',
  },
  't8.widget.playT': { es: 'Familia T (I, vi, iii)', en: 'T family (I, vi, iii)' },
  't8.widget.playS': { es: 'Familia S (IV, ii)', en: 'S family (IV, ii)' },
  't8.widget.playD': { es: 'Familia D (V, vii°)', en: 'D family (V, vii°)' },
  't8.widget.phraseTSDT': { es: 'T→S→D→T', en: 'T→S→D→T' },
  't8.widget.phraseTDST': { es: 'T→D→S→T', en: 'T→D→S→T' },
  't8.widget.lastPhrase': { es: 'Última frase: {phrase}', en: 'Last phrase: {phrase}' },
  't8.q1.prompt': {
    es: '¿Qué familia tira con más fuerza hacia casa?',
    en: 'Which family pulls hardest toward home?',
  },
  't8.q2.prompt': {
    es: '¿Qué numerales forman la familia de la tónica?',
    en: 'Which numerals make up the tonic family?',
  },
  't8.q3.prompt': { es: '¿A qué familia pertenece ii?', en: 'Which family does ii belong to?' },
  't8.q4.prompt': { es: '¿Hacia qué numeral quiere resolver V?', en: 'Which numeral does V want to resolve to?' },
  't8.complete.body': {
    es: 'Desbloqueaste E6 (función diatónica) y E7 (movimientos de dos acordes).',
    en: 'You unlocked E6 (diatonic function) and E7 (two-chord motions).',
  },

  // T9 lesson — cadences and phrase structure
  't9.eyebrow': { es: 'T9 · 3 min', en: 'T9 · 3 min' },
  't9.title': { es: 'Cadencias y frases', en: 'Cadences and phrase structure' },
  't9.claim': {
    es: 'Al final de esta lección vas a reconocer cuatro finales de frase por cómo cierran: con fuerza, en el aire, hacia atrás o con sorpresa.',
    en: 'By the end of this lesson you will recognize four phrase endings by how they close: hard, in the air, backward, or with a surprise.',
  },
  't9.demo.heading': { es: 'Cuatro finales, una frase', en: 'Four endings, one phrase' },
  't9.demo.body': {
    es: 'La misma frase de cuatro acordes en {key} mayor puede terminar de formas distintas. La cadencia auténtica (V–I) cierra con más fuerza; la semicadencia se detiene en V, en el aire; la plagal cierra con IV–I; la rota sustituye el I final por vi, una sorpresa.',
    en: 'The same four-chord phrase in {key} major can end in different ways. The authentic cadence (V–I) closes hardest; the half cadence stops on V, in the air; the plagal cadence closes with IV–I; the deceptive cadence swaps the final I for vi, a surprise.',
  },
  't9.demo.authentic': { es: 'Auténtica', en: 'Authentic' },
  't9.demo.half': { es: 'Semicadencia', en: 'Half' },
  't9.demo.plagal': { es: 'Plagal', en: 'Plagal' },
  't9.demo.deceptive': { es: 'Rota', en: 'Deceptive' },
  't9.widget.heading': { es: 'Misma frase, cuatro finales', en: 'Same phrase, four endings' },
  't9.widget.body': {
    es: 'La apertura I–IV se queda fija. Elige el final y escucha la frase completa. ¿Cuál cierra con más fuerza y cuál te deja esperando?',
    en: 'The opening I–IV stays fixed. Pick the ending and hear the full phrase. Which one closes hardest, and which one leaves you waiting?',
  },
  't9.widget.opening': { es: 'Apertura fija: I–IV', en: 'Fixed opening: I–IV' },
  't9.q1.prompt': { es: '¿Qué final cierra con más fuerza?', en: 'Which ending closes hardest?' },
  't9.q2.prompt': {
    es: 'El final de sorpresa sustituye el I final por:',
    en: 'The surprise ending replaces the final I with:',
  },
  't9.q3.prompt': { es: '¿En qué acorde se detiene una semicadencia?', en: 'Which chord does a half cadence stop on?' },
  't9.q4.prompt': {
    es: 'El final IV–I se llama plagal. ¿Qué numeral precede al I?',
    en: 'The IV–I ending is called plagal. Which numeral precedes the I?',
  },
  't9.complete.body': {
    es: 'Desbloqueaste E7: movimientos de dos acordes.',
    en: 'You unlocked E7: two-chord motions.',
  },

  // T10 lesson — seventh chords and the tritone
  't10.eyebrow': { es: 'T10 · 3 min', en: 'T10 · 3 min' },
  't10.title': { es: 'Acordes de séptima y el tritono', en: 'Seventh chords and the tritone' },
  't10.claim': {
    es: 'Al final de esta lección vas a oír por qué añadir la séptima a V lo hace tirar con más fuerza hacia I: dos grados de dentro del acorde chocan y se resuelven.',
    en: 'By the end of this lesson you will hear why adding the seventh to V makes it pull harder toward I: two degrees inside the chord clash and resolve.',
  },
  't10.demo.heading': { es: 'Con y sin la séptima', en: 'With and without the seventh' },
  't10.demo.body': {
    es: 'En {key} mayor, V–I ya tira hacia casa. Añade la séptima a V y el tirón se siente más fuerte: dentro del acorde, los grados 4 y 7 rozan entre sí y se resuelven colapsando hacia 3 y 1.',
    en: 'In {key} major, V–I already pulls home. Add the seventh to V and the pull feels stronger: inside the chord, degrees 4 and 7 rub against each other and resolve by collapsing into 3 and 1.',
  },
  't10.demo.playTriad': { es: 'V – I (tríada)', en: 'V – I (triad)' },
  't10.demo.playSeventh': { es: 'V7 – I', en: 'V7 – I' },
  't10.demo.playTritone': { es: 'Tocar 4 y 7 juntos', en: 'Play 4 and 7 together' },
  't10.demo.playResolved': { es: 'Tocar 3 y 1, resueltos', en: 'Play 3 and 1, resolved' },
  't10.widget.heading': { es: 'Añade la séptima tú', en: 'Add the seventh yourself' },
  't10.widget.body': {
    es: 'Activa la séptima sobre V y vuelve a oír la resolución hacia I. Después toca los dos grados internos solos, y luego resueltos.',
    en: 'Turn on the seventh over V and hear the resolution into I again. Then play the two inner degrees alone, and then resolved.',
  },
  't10.widget.toggleOn': { es: '7ª activada — tocar V7 → I', en: '7th on — play V7 → I' },
  't10.widget.toggleOff': { es: '7ª desactivada — tocar V → I', en: '7th off — play V → I' },
  't10.widget.playInner': { es: 'Tocar los grados internos (4, 7)', en: 'Play the inner degrees (4, 7)' },
  't10.widget.playInnerResolved': { es: 'Tocar la resolución (3, 1)', en: 'Play the resolution (3, 1)' },
  't10.q1.prompt': {
    es: '¿Qué dos grados de la escala rozan dentro de V7?',
    en: 'Which two scale degrees rub against each other inside V7?',
  },
  't10.q2.prompt': { es: '¿A qué dos grados resuelven?', en: 'Which two degrees do they resolve to?' },
  't10.q3.prompt': { es: '¿Cuántas notas distintas tiene V7?', en: 'How many distinct pitches does V7 contain?' },
  't10.q4.prompt': {
    es: 'El grado del acorde que se añade a V para formar V7 es su:',
    en: 'The chord degree added to V to build V7 is its:',
  },
  't10.complete.body': {
    es: 'Desbloqueaste E5 (calidad de acordes) y F3 (séptimas en el diapasón).',
    en: 'You unlocked E5 (chord quality) and F3 (seventh-chord shells on the fretboard).',
  },

  // T11 lesson — voice leading and guide tones
  't11.eyebrow': { es: 'T11 · 3 min', en: 'T11 · 3 min' },
  't11.title': { es: 'Conducción de voces y notas guía', en: 'Voice leading and guide tones' },
  't11.claim': {
    es: 'Al final de esta lección vas a oír que los mismos acordes pueden viajar mucho o casi nada, según cómo se conducen las voces.',
    en: 'By the end of this lesson you will hear that the same chords can travel a lot or almost nothing, depending on how the voices are led.',
  },
  't11.demo.heading': { es: 'Mismos acordes, distinta distancia', en: 'Same chords, different distance' },
  't11.demo.body': {
    es: 'En {key} mayor, ii–V–I puede tocarse en bloques que saltan de raíz en raíz, o con las voces conducidas para moverse lo menos posible. Compara las dos versiones.',
    en: 'In {key} major, ii–V–I can be played in blocks that jump from root to root, or with the voices led to move as little as possible. Compare the two versions.',
  },
  't11.demo.playBlock': { es: 'En bloques', en: 'In blocks' },
  't11.demo.playVoiced': { es: 'Voces conducidas', en: 'Voice-led' },
  't11.widget.heading': { es: 'El mismo contraste, un bucle más largo', en: 'The same contrast, a longer loop' },
  't11.widget.body': {
    es: 'Compara otra vez sobre I–vi–ii–V. En cada acorde, el 3 y el 7 son las notas guía: son las que cargan el cambio de armonía mientras el resto se mantiene quieto.',
    en: 'Compare again over I–vi–ii–V. In every chord, the 3rd and the 7th are the guide tones: they carry the change in harmony while everything else sits still.',
  },
  't11.q1.prompt': {
    es: 'Además del bajo, ¿cuántas voces suenan en estas voces superiores?',
    en: 'Besides the bass, how many voices sound in these upper voicings?',
  },
  't11.q2.prompt': {
    es: '¿Qué grados del acorde se llaman notas guía?',
    en: 'Which chord degrees are called the guide tones?',
  },
  't11.q3.prompt': {
    es: 'En las dos versiones, ¿qué grado del acorde toca siempre el bajo?',
    en: 'In both versions, which chord degree does the bass always play?',
  },
  't11.q4.prompt': {
    es: 'En la versión con voces conducidas, ¿de cuántas posiciones de escala se mueven como máximo las voces superiores?',
    en: 'In the voice-led version, by how many scale positions do the upper voices move at most?',
  },
  't11.complete.body': {
    es: 'Desbloqueaste F4 y F6: conducción de voces y líneas de notas guía en el diapasón.',
    en: 'You unlocked F4 and F6: voice leading and guide-tone lines on the fretboard.',
  },

  // T12 lesson — inversions and slash chords
  't12.eyebrow': { es: 'T12 · 3 min', en: 'T12 · 3 min' },
  't12.title': { es: 'Inversiones y acordes con bajo', en: 'Inversions and slash chords' },
  't12.claim': {
    es: 'Al final de esta lección vas a oír que el mismo acorde suena distinto según qué grado suyo esté en el bajo, y a leer esa nota en la notación con barra.',
    en: 'By the end of this lesson you will hear that the same chord sounds different depending on which of its degrees sits in the bass, and read that note in slash notation.',
  },
  't12.demo.heading': { es: 'Mismo acorde, distinto piso', en: 'Same chord, different floor' },
  't12.demo.body': {
    es: 'El acorde mayor de {key} suena igual arriba en las tres posiciones; lo único que cambia es qué grado suyo está abajo, en el bajo.',
    en: 'The {key} major chord sounds the same on top in all three positions; the only thing that changes is which of its degrees sits at the bottom, in the bass.',
  },
  't12.demo.inv0': { es: 'Fundamental (bajo: 1)', en: 'Root position (bass: 1)' },
  't12.demo.inv1': { es: '1ª inversión (bajo: 3)', en: '1st inversion (bass: 3)' },
  't12.demo.inv2': { es: '2ª inversión (bajo: 5)', en: '2nd inversion (bass: 5)' },
  't12.widget.heading': { es: 'Elige la calidad y la inversión', en: 'Pick the quality and the inversion' },
  't12.widget.body': {
    es: 'Cambia entre mayor y menor, y entre las tres inversiones. La notación con barra nombra el acorde y, después de la barra, la nota que está en el bajo.',
    en: 'Switch between major and minor, and between the three inversions. Slash notation names the chord and, after the slash, the note sitting in the bass.',
  },
  't12.widget.caption': { es: 'Notación: {chord}/{bass}', en: 'Notation: {chord}/{bass}' },
  't12.q1.prompt': {
    es: '¿Qué grado del acorde queda en el bajo en la primera inversión?',
    en: 'Which chord degree sits in the bass in first inversion?',
  },
  't12.q2.prompt': { es: '¿Y en la segunda inversión?', en: 'And in second inversion?' },
  't12.q3.prompt': {
    es: '¿Cuántos pisos de bajo distintos ofrece una tríada?',
    en: 'How many distinct bass floors does a triad offer?',
  },
  't12.q4.prompt': {
    es: 'En posición fundamental, ¿qué grado del acorde está en el bajo?',
    en: 'In root position, which chord degree sits in the bass?',
  },
  't12.complete.body': {
    es: 'Desbloqueaste E11 y F2: inversiones al oído y en el diapasón.',
    en: 'You unlocked E11 and F2: inversions by ear and on the fretboard.',
  },

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

  // E0 drill — tonic retention
  'e0.listening': { es: 'Cadencia…', en: 'Cadence…' },
  'e0.prompt': { es: '¿Es la tónica?', en: 'Is it the tonic?' },
  'e0.yes': { es: 'Sí, es 1', en: 'Yes, it is 1' },
  'e0.no': { es: 'No', en: 'No' },
  'e0.replay': { es: 'Repetir', en: 'Replay' },
  'e0.correct': {
    es: 'Correcto: era el grado {degree}. {note} en {key} mayor.',
    en: 'Correct: it was degree {degree}. {note} in {key} major.',
  },
  'e0.incorrect': {
    es: 'No: era el grado {degree}. {note} en {key} mayor.',
    en: 'No: it was degree {degree}. {note} in {key} major.',
  },
  'e0.sing': {
    es: 'Canta la resolución: {path}.',
    en: 'Sing the resolution: {path}.',
  },
  'e0.playResolution': { es: 'Oír la resolución', en: 'Play the resolution' },

  // E2 drill — active degrees by tendency
  'e2.listening': { es: 'Cadencia…', en: 'Cadence…' },
  'e2.prompt': { es: '¿Qué grado es?', en: 'Which degree is it?' },
  'e2.replay': { es: 'Repetir', en: 'Replay' },
  'e2.correct': { es: 'Sí: {degree}. {note} en {key} mayor.', en: 'Yes: {degree}. {note} in {key} major.' },
  'e2.incorrect': {
    es: 'No: era {degree}. {note} en {key} mayor.',
    en: 'No: it was {degree}. {note} in {key} major.',
  },
  'e2.sing': {
    es: 'Canta la resolución: {path}.',
    en: 'Sing the resolution: {path}.',
  },
  'e2.playResolution': { es: 'Oír la resolución', en: 'Play the resolution' },

  // E3 drill — full major scale, interleaved
  'e3.listening': { es: 'Cadencia…', en: 'Cadence…' },
  'e3.prompt': { es: '¿Qué grado es?', en: 'Which degree is it?' },
  'e3.replay': { es: 'Repetir', en: 'Replay' },
  'e3.correct': { es: 'Sí: {degree}. {note} en {key} mayor.', en: 'Yes: {degree}. {note} in {key} major.' },
  'e3.incorrect': {
    es: 'No: era {degree}. {note} en {key} mayor.',
    en: 'No: it was {degree}. {note} in {key} major.',
  },
  'e3.rtHint': {
    es: 'Apunta a responder en menos de 3 segundos.',
    en: 'Aim to answer in under 3 seconds.',
  },
  'e3.sing': {
    es: 'Canta la resolución: {path}.',
    en: 'Sing the resolution: {path}.',
  },
  'e3.playResolution': { es: 'Oír la resolución', en: 'Play the resolution' },

  // E4 drill — minor in three forms, against parallel major
  'e4.listening': { es: 'Escala…', en: 'Scale…' },
  'e4.prompt': { es: '¿Qué forma es?', en: 'Which form is it?' },
  'e4.replay': { es: 'Repetir', en: 'Replay' },
  'e4.tonicIs': { es: 'Tónica: {key}', en: 'Tonic: {key}' },
  'e4.correct': { es: 'Sí: {form}.', en: 'Yes: {form}.' },
  'e4.incorrect': { es: 'No: era {form}.', en: 'No: it was {form}.' },
  'e4.form.major': { es: 'Mayor', en: 'Major' },
  'e4.form.naturalMinor': { es: 'Menor natural', en: 'Natural minor' },
  'e4.form.harmonicMinor': { es: 'Menor armónica', en: 'Harmonic minor' },
  'e4.form.melodicMinor': { es: 'Menor melódica', en: 'Melodic minor' },

  // E5 drill — chord quality (context-free: no cadence, no key)
  'e5.listening': { es: 'Acorde…', en: 'Chord…' },
  'e5.prompt': { es: '¿Qué calidad es?', en: 'Which quality is it?' },
  'e5.replay': { es: 'Repetir', en: 'Replay' },
  'e5.rootIs': { es: 'Nota base: {note}', en: 'Root note: {note}' },
  'e5.correct': { es: 'Sí: {quality}.', en: 'Yes: {quality}.' },
  'e5.incorrect': { es: 'No: era {quality}.', en: 'No: it was {quality}.' },
  'e5.quality.maj': { es: 'Mayor', en: 'Major' },
  'e5.quality.min': { es: 'Menor', en: 'Minor' },
  'e5.quality.dim': { es: 'Disminuido', en: 'Diminished' },
  'e5.quality.aug': { es: 'Aumentado', en: 'Augmented' },
  'e5.quality.maj7': { es: 'Maj7', en: 'Maj7' },
  'e5.quality.min7': { es: 'm7', en: 'm7' },
  'e5.quality.dom7': { es: '7', en: '7' },
  'e5.quality.m7b5': { es: 'm7♭5', en: 'm7♭5' },
  'e5.quality.dim7': { es: '°7', en: '°7' },

  // E6 drill — diatonic function in major, after a tonic cadence
  'e6.listening': { es: 'Cadencia…', en: 'Cadence…' },
  'e6.prompt': { es: '¿Qué función es?', en: 'Which function is it?' },
  'e6.replay': { es: 'Repetir', en: 'Replay' },
  'e6.correct': {
    es: 'Sí: {numeral} — {note} en {key} mayor.',
    en: 'Yes: {numeral} — {note} in {key} major.',
  },
  'e6.incorrect': {
    es: 'No: era {numeral} — {note} en {key} mayor.',
    en: 'No: it was {numeral} — {note} in {key} major.',
  },

  // E7 drill — two-chord motions, ordered by corpus frequency
  'e7.loading': { es: 'Cargando el corpus…', en: 'Loading the corpus…' },
  'e7.listening': { es: 'Cadencia…', en: 'Cadence…' },
  'e7.prompt': { es: '¿Qué movimiento es?', en: 'Which motion is it?' },
  'e7.replay': { es: 'Repetir', en: 'Replay' },
  'e7.keyIs.major': { es: 'Tonalidad: {key} mayor', en: 'Key: {key} major' },
  'e7.keyIs.minor': { es: 'Tonalidad: {key} menor', en: 'Key: {key} minor' },
  'e7.correct': { es: 'Sí: {motion}.', en: 'Yes: {motion}.' },
  'e7.incorrect': { es: 'No: era {motion}.', en: 'No: it was {motion}.' },

  // E8 drill — four-bar progressions, ordered by corpus frequency
  'e8.loading': { es: 'Cargando el corpus…', en: 'Loading the corpus…' },
  'e8.listening': { es: 'Cadencia…', en: 'Cadence…' },
  'e8.prompt': { es: '¿Qué progresión es?', en: 'Which progression is it?' },
  'e8.replay': { es: 'Repetir', en: 'Replay' },
  'e8.keyIs.major': { es: 'Tonalidad: {key} mayor', en: 'Key: {key} major' },
  'e8.keyIs.minor': { es: 'Tonalidad: {key} menor', en: 'Key: {key} minor' },
  'e8.correct': { es: 'Sí: {motion}.', en: 'Yes: {motion}.' },
  'e8.incorrect': { es: 'No: era {motion}.', en: 'No: it was {motion}.' },

  // E9 drill — bass-line dictation, root motion only
  'e9.loading': { es: 'Cargando el corpus…', en: 'Loading the corpus…' },
  'e9.listening': { es: 'Bajo…', en: 'Bass…' },
  'e9.prompt': { es: 'Toca los grados del bajo, en orden.', en: 'Tap the bass degrees, in order.' },
  'e9.replay': { es: 'Repetir', en: 'Replay' },
  'e9.clear': { es: 'Borrar', en: 'Clear' },
  'e9.correct': { es: 'Sí: {sequence}.', en: 'Yes: {sequence}.' },
  'e9.incorrect': {
    es: 'No: era {sequence}. Tocaste {entered}.',
    en: 'No: it was {sequence}. You entered {entered}.',
  },

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

  // Lesson shell (shared by all theory lessons)
  'lesson.check.heading': { es: 'Comprueba', en: 'Check yourself' },
  'lesson.check.think': {
    es: 'Responde en tu cabeza antes de mirar las opciones.',
    en: 'Answer in your head before looking at the options.',
  },
  'lesson.check.showOptions': { es: 'Ver opciones', en: 'Show options' },
  'lesson.check.correct': { es: 'Correcto.', en: 'Correct.' },
  'lesson.check.incorrect': { es: 'No. Inténtalo otra vez.', en: 'No. Try again.' },
  'lesson.check.progress': { es: 'Pregunta {n} de {total}', en: 'Question {n} of {total}' },
  'lesson.complete.title': { es: 'Lección completada', en: 'Lesson complete' },
  'lesson.cta.session': { es: 'Practicarlo en una sesión', en: 'Practice it in a session' },

  // Corpus Coverage
  'coverage.label': { es: 'Cobertura del corpus', en: 'Corpus coverage' },
  'coverage.claim': {
    es: 'Puedes oír la armonía completa de {songs} de {total} canciones de este corpus.',
    en: 'You can hear the full harmony of {songs} of {total} songs in this corpus.',
  },
  'coverage.next': { es: 'Siguiente desbloqueo: {node}, +{delta}%', en: 'Next unlock: {node}, +{delta}%' },
  'coverage.sections': {
    es: 'Por secciones: {percent}% de las secciones (versos, estribillos) ya son tuyas.',
    en: 'By section: {percent}% of sections (verses, choruses) are already yours.',
  },
  'coverage.method.show': { es: 'Cómo se calcula', en: 'How this is computed' },
  'coverage.method.hide': { es: 'Ocultar', en: 'Hide' },
  'coverage.method.body': {
    es: 'Una canción cuenta solo si dominas —no conoces, dominas— cada recurso armónico que usa: cualidades de acorde, funciones, dominantes secundarias, préstamos, inversiones y modulaciones. Fuente: {source}. El cálculo es conservador a propósito: preferimos afirmar de menos.',
    en: 'A song counts only if you have mastered — not met, mastered — every harmonic device it uses: chord qualities, functions, secondary dominants, borrowed chords, inversions and modulations. Source: {source}. The computation is deliberately conservative: we under-claim.',
  },
  'coverage.loading': { es: 'Cargando el corpus…', en: 'Loading the corpus…' },

  // Theory index — checkpoint gating (docs/curriculum.md "Stages and
  // checkpoints")
  'theory.checkpoint.cta': { es: 'Hacer el control {id}', en: 'Take checkpoint {id}' },
  'theory.checkpoint.passed': { es: '{id} ✓', en: '{id} ✓' },

  // Checkpoints (CP1/CP2/CP3): timed challenges on real corpus progressions
  'cp.CP1.title': { es: 'Control 1 · Grados', en: 'Checkpoint 1 · Degrees' },
  'cp.CP2.title': { es: 'Control 2 · Acordes', en: 'Checkpoint 2 · Chords' },
  'cp.CP3.title': { es: 'Control 3 · Progresiones', en: 'Checkpoint 3 · Progressions' },
  'cp.loading': { es: 'Cargando el corpus…', en: 'Loading the corpus…' },
  'cp.listening': { es: 'Cadencia…', en: 'Cadence…' },
  'cp.itemCount': { es: '{current} / {total}', en: '{current} / {total}' },
  'cp.timeLeft': { es: '{clock} restantes', en: '{clock} left' },
  'cp.keyIs.major': { es: 'Tonalidad: {key} mayor', en: 'Key: {key} major' },
  'cp.keyIs.minor': { es: 'Tonalidad: {key} menor', en: 'Key: {key} minor' },
  'cp.cp1.prompt': { es: 'Toca los dos grados del bajo, en orden.', en: 'Tap the two bass degrees, in order.' },
  'cp.cp2.prompt': { es: '¿Qué numeral es el segundo acorde?', en: 'What numeral is the second chord?' },
  'cp.cp3.prompt': { es: '¿Qué progresión es?', en: 'Which progression is it?' },
  'cp.clear': { es: 'Borrar', en: 'Clear' },
  'cp.result.pass': { es: 'Aprobado. {correct} de {total}.', en: 'Passed. {correct} of {total}.' },
  'cp.result.fail': { es: 'No esta vez. {correct} de {total}.', en: 'Not this time. {correct} of {total}.' },
  'cp.result.retry': { es: 'Reintentar', en: 'Retry' },
  'cp.result.continue': { es: 'Continuar', en: 'Continue' },

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
