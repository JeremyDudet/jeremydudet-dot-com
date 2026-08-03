import { randomUUID } from 'node:crypto'
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { MODEL, xai } from '@/lib/judge'
import { db } from '@/lib/db'
import {
  feedback,
  type FeedbackKind,
  type FeedbackSentiment,
} from '@/lib/db/schema'

/**
 * The taste loop. When Jeremy rejects a share proposal he can say why, in his
 * own words (typed or dictated); the raw text lands here immediately and a
 * background call distills it into one generalized line of guidance. Those
 * lines are injected into the judge and curator prompts, so the system's
 * taste drifts toward his — while the rubric stays the standard.
 */

export async function recordFeedback(input: {
  subjectKind: FeedbackKind
  subjectId: string
  raw: string
  entryId?: string | null
  threadId?: string | null
  spoken?: boolean
  sentiment?: FeedbackSentiment
}): Promise<string> {
  const id = randomUUID()
  await db.insert(feedback).values({
    id,
    subjectKind: input.subjectKind,
    subjectId: input.subjectId,
    sentiment: input.sentiment ?? 'negative',
    entryId: input.entryId ?? null,
    threadId: input.threadId ?? null,
    raw: input.raw,
    spoken: input.spoken === true,
  })
  return id
}

/** Undo support: a retracted rejection takes its lesson with it. */
export async function deleteFeedback(id: string) {
  await db.delete(feedback).where(eq(feedback.id, id))
}

const Distilled = z.object({ distilled: z.string() })

const DISTILL_RUBRIC = `
Jeremy rejected a share proposal and said why, in his own words (possibly
dictated, so tolerate run-ons). Condense his reaction into ONE imperative
sentence of generalized guidance for whoever proposes future posts.

Generalize the taste, not the instance: "Don't pitch posts that read as
humblebrags", never "he didn't like this one". Keep it under 25 words. If his
reaction names something he wants MORE of, phrase it as a "do". Do not invent
preferences he didn't express.
`.trim()

const DISTILL_POSITIVE_RUBRIC = `
Jeremy edited an AI-suggested draft before publishing it. You see the draft
and what he actually published. Condense the difference into ONE imperative
sentence of generalized guidance for whoever writes future drafts — what his
edit reveals about his taste ("Cut throat-clearing openers", "Keep the
concrete numbers"). Under 25 words. If the changes are trivial or reveal
nothing, return an empty string.
`.trim()

/**
 * One small model call, run in after() so rejecting never waits on it. On
 * failure the row simply keeps distilled = null and injection falls back to
 * the clipped raw text — a distill failure costs nothing.
 */
export async function distillFeedback(id: string, context?: string) {
  const [row] = await db
    .select()
    .from(feedback)
    .where(eq(feedback.id, id))
    .limit(1)
  if (!row) return

  const positive = row.sentiment === 'positive'
  const content = positive
    ? `THE DRAFT:\n${clip(context ?? '', 600)}\n\nWHAT HE PUBLISHED:\n${row.raw}`
    : context
      ? `WHAT WAS PROPOSED:\n${clip(context, 600)}\n\nHIS REACTION:\n${row.raw}`
      : row.raw

  const completion = await xai().chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: positive ? DISTILL_POSITIVE_RUBRIC : DISTILL_RUBRIC,
      },
      { role: 'user', content },
    ],
    response_format: zodResponseFormat(Distilled, 'distilled_feedback'),
  })

  const distilled = completion.choices[0]?.message.parsed?.distilled.trim()

  // A positive delta the model judged trivial teaches nothing — drop the row
  // rather than let its raw text fall back into prompts as noise. A negative
  // stays regardless: he said it in his own words.
  if (!distilled) {
    if (positive) await db.delete(feedback).where(eq(feedback.id, id))
    return
  }

  await db.update(feedback).set({ distilled }).where(eq(feedback.id, id))
}

/**
 * The lines injected into prompts. Scoped: the journal judge hears feedback
 * about entries; the curator hears everything. Capped and time-decayed so an
 * old taste can't haunt the system — feedback older than 60 days ages out.
 */
export async function feedbackFor(
  scope: 'judge' | 'curator',
  limit = 10,
): Promise<string[]> {
  const kinds: FeedbackKind[] =
    scope === 'judge' ? ['entry'] : ['entry', 'recommendation']

  const rows = await db
    .select()
    .from(feedback)
    .where(
      and(
        inArray(feedback.subjectKind, kinds),
        gte(feedback.createdAt, sql`now() - interval '60 days'`),
      ),
    )
    .orderBy(desc(feedback.createdAt))
    .limit(limit)

  return rows.map(
    (r) =>
      `${r.sentiment === 'positive' ? 'MORE' : 'AVOID'}: ${r.distilled ?? clip(r.raw, 200)}`,
  )
}

/** Recent rows for the Settings "What I've learned" list. */
export async function recentFeedback(limit = 20) {
  return db
    .select()
    .from(feedback)
    .orderBy(desc(feedback.createdAt))
    .limit(limit)
}

function clip(s: string, n: number) {
  const clean = s.replace(/\s+/g, ' ').trim()
  return clean.length > n ? `${clean.slice(0, n - 1)}…` : clean
}
