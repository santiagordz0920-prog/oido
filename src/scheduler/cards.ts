import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs'

// FSRS wrapper (verified against ts-fsrs@5.4.1). One card per pairing of
// skill node and context: for ear drills the context is the key's tonic,
// for theory lessons it is the check-question id (§10.1 — theory decays too).

export type CardRow = {
  id: string // `${nodeId}|${context}`
  nodeId: string
  context: string
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review?: number
}

const scheduler = fsrs({ enable_fuzz: true })

export function cardId(nodeId: string, context: string): string {
  return `${nodeId}|${context}`
}

export function newCardRow(nodeId: string, context: string, now: Date = new Date()): CardRow {
  return toRow(nodeId, context, createEmptyCard(now))
}

export function toRow(nodeId: string, context: string, card: Card): CardRow {
  return {
    id: cardId(nodeId, context),
    nodeId,
    context,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review?.getTime(),
  }
}

export function toCard(row: CardRow): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.last_review === undefined ? undefined : new Date(row.last_review),
  }
}

// Correctness alone drives FSRS. Latency is logged on the attempt where the
// mastery criteria (median RT) can read it.
export function gradeFor(correct: boolean): Grade {
  return correct ? Rating.Good : Rating.Again
}

export function reviewCard(row: CardRow, correct: boolean, now: Date = new Date()): CardRow {
  const { card } = scheduler.next(toCard(row), now, gradeFor(correct))
  return toRow(row.nodeId, row.context, card)
}

export function isDue(row: CardRow, now: Date = new Date()): boolean {
  return row.due <= now.getTime()
}

export function isNew(row: CardRow): boolean {
  return row.state === State.New
}

// Memory strength 0..1 for the constellation's mastery sizing.
export function retrievability(row: CardRow, now: Date = new Date()): number {
  if (isNew(row)) return 0
  return scheduler.get_retrievability(toCard(row), now, false)
}
