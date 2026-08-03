import { randomUUID } from 'node:crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from './index'
import { questions, type Question } from './schema'

/**
 * Follow-up questions: the judge's side of the conversation. Policy lives in
 * lib/process-entry.ts; this file is just the rows.
 */

/** How many answers a root can accumulate before the judge must decide. */
export const MAX_ANSWERS_PER_ROOT = 2

/**
 * At most one open question per root — enforced here and by the partial
 * unique index, so a race between after() and the sweep cannot double-ask.
 * Returns the new id, or null when one is already open.
 */
export async function insertOpenQuestion(input: {
  entryId: string
  threadId?: string | null
  question: string
  source?: string
}): Promise<string | null> {
  const id = randomUUID()
  try {
    const inserted = await db
      .insert(questions)
      .values({
        id,
        entryId: input.entryId,
        threadId: input.threadId ?? null,
        question: input.question,
        source: input.source ?? 'judge',
      })
      .onConflictDoNothing({
        target: questions.entryId,
        where: sql`status = 'open'`,
      })
      .returning({ id: questions.id })
    return inserted.length ? id : null
  } catch {
    // The partial unique index fired — a question is already open.
    return null
  }
}

export async function questionById(id: string): Promise<Question | undefined> {
  const [row] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, id))
    .limit(1)
  return row
}

export async function openQuestions(): Promise<Question[]> {
  return db
    .select()
    .from(questions)
    .where(eq(questions.status, 'open'))
    .orderBy(desc(questions.createdAt))
}

/** Oldest first — the order the conversation actually happened. */
export async function answeredQuestionsFor(entryId: string): Promise<Question[]> {
  return db
    .select()
    .from(questions)
    .where(
      and(eq(questions.entryId, entryId), eq(questions.status, 'answered')),
    )
    .orderBy(questions.createdAt)
}

export async function markAnswered(id: string, answerEntryId: string) {
  await db
    .update(questions)
    .set({ status: 'answered', answerEntryId, answeredAt: new Date() })
    .where(and(eq(questions.id, id), eq(questions.status, 'open')))
}

export async function dismissQuestion(id: string) {
  await db
    .update(questions)
    .set({ status: 'dismissed', answeredAt: new Date() })
    .where(and(eq(questions.id, id), eq(questions.status, 'open')))
}

/**
 * Chains that just resolved without producing a card — an answer that led to
 * "private" would otherwise vanish silently from Needs you.
 */
export async function recentlyResolvedPrivate(): Promise<
  { question: string; rootBody: string }[]
> {
  const rows = await db.execute<{ question: string; root_body: string }>(sql`
    select q.question, j.body as root_body
    from questions q
    join journal j on j.id = q.entry_id
    where q.status = 'answered'
      and q.answered_at > now() - interval '48 hours'
      and j.verdict = 'private'
    order by q.answered_at desc
    limit 3
  `)
  return rows.rows.map((r) => ({ question: r.question, rootBody: r.root_body }))
}
