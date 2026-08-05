import { randomUUID } from 'node:crypto'
import { and, desc, eq, ilike, ne, or } from 'drizzle-orm'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import type OpenAI from 'openai'
import { MODEL, xai } from '@/lib/judge'
import { db } from '@/lib/db'
import {
  curationBatches,
  entries,
  journal,
  recommendations,
  threads,
  type JournalEntry,
  type SharingMode,
} from '@/lib/db/schema'
import { sharingMode } from '@/lib/settings'
import { feedbackFor } from '@/lib/feedback'

/**
 * The curator: a living agent over the whole Zettelkasten. On every new entry
 * (and daily, and on demand) it re-reads everything — entries, threads,
 * what's already public — and surfaces the current best share candidates,
 * each with its case made in the open: why it meets Show Your Work, and why
 * now. It reads and recommends; it never mutates the graph and it never
 * publishes. Artifacts are templates with gaps by default, never finished
 * posts.
 *
 * Privacy, enforced mechanically rather than by prompt alone:
 * - sealed entries are excluded from the corpus AND from every tool result
 * - private-verdict entries appear only as themes (their verdict reason),
 *   never their text — so the model cannot quote what it cannot see
 */

/* ------------------------------------------------------------- corpus -- */

async function visibleEntries(): Promise<JournalEntry[]> {
  return db
    .select()
    .from(journal)
    .where(eq(journal.sealed, false))
    .orderBy(desc(journal.createdAt))
}

function entryLine(e: JournalEntry): string {
  const date = e.createdAt.toISOString().slice(0, 10)
  const flags = [
    e.verdict ?? 'unjudged',
    e.postId ? 'shared-on-X' : null,
    e.threadId ? 'threaded' : 'loose',
  ]
    .filter(Boolean)
    .join(', ')

  // Private entries inform, never speak: theme only, body withheld.
  if (e.verdict === 'private') {
    return `[${e.id}] ${date} (private — theme only): ${e.reason ?? 'personal material'}`
  }
  return `[${e.id}] ${date} (${flags}): ${clip(e.body, 300)}`
}

async function buildCorpus() {
  const [entriesAll, threadsAll, published, recent, taste] = await Promise.all([
    visibleEntries(),
    db.select().from(threads).orderBy(desc(threads.updatedAt)),
    db
      .select({ title: entries.title, postedAt: entries.postedAt })
      .from(entries)
      .where(eq(entries.status, 'published')),
    db
      .select()
      .from(recommendations)
      .where(
        or(
          eq(recommendations.status, 'dismissed'),
          eq(recommendations.status, 'used'),
        ),
      )
      .orderBy(desc(recommendations.createdAt))
      .limit(20),
    feedbackFor('curator').catch(() => [] as string[]),
  ])

  const threadLines = threadsAll.map((t) => {
    const quiet = Math.round(
      (Date.now() - t.updatedAt.getTime()) / 86_400_000,
    )
    return `[${t.id}] "${t.name}" (${t.kind}, ${t.state}, quiet ${quiet}d): ${clip(t.summary, 240)}`
  })

  const sharedLines = [
    ...published.map(
      (p) => `blog: "${p.title}" (${p.postedAt.toISOString().slice(0, 10)})`,
    ),
    ...entriesAll
      .filter((e) => e.postId)
      .map((e) => `X: ${clip(e.body, 80)}`),
  ]

  const historyLines = recent.map(
    (r) => `${r.status.toUpperCase()}: "${r.title}"`,
  )

  const corpus = [
    `THREADS (${threadLines.length}):`,
    threadLines.join('\n') || '(none)',
    ``,
    `JOURNAL ENTRIES (${entriesAll.length}, newest first):`,
    entriesAll.map(entryLine).join('\n') || '(none)',
    ``,
    `ALREADY SHARED (${sharedLines.length}):`,
    sharedLines.join('\n') || '(nothing yet)',
    ``,
    `YOUR RECENT RECOMMENDATIONS AND WHAT HE DID WITH THEM:`,
    historyLines.join('\n') || '(none yet)',
    ``,
    `RECENT FEEDBACK FROM JEREMY (his taste, in his own words):`,
    taste.join('\n') || '(none yet)',
  ].join('\n')

  const considered = `${threadLines.length} threads, ${entriesAll.length} entries, ${sharedLines.length} shared pieces`

  return { corpus, considered }
}

/* -------------------------------------------------------------- tools -- */

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_corpus',
      description:
        'Search journal entries and thread summaries for a phrase. Case-insensitive substring match.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_thread',
      description:
        'Read one thread in full: living summary, its history, and every member entry.',
      parameters: {
        type: 'object',
        properties: { threadId: { type: 'string' } },
        required: ['threadId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_entry',
      description: 'Read one journal entry in full.',
      parameters: {
        type: 'object',
        properties: { entryId: { type: 'string' } },
        required: ['entryId'],
      },
    },
  },
]

async function runTool(name: string, args: Record<string, string>) {
  switch (name) {
    case 'search_corpus': {
      const q = `%${args.query ?? ''}%`
      const [es, ts] = await Promise.all([
        db
          .select()
          .from(journal)
          .where(and(eq(journal.sealed, false), ilike(journal.body, q)))
          .limit(8),
        db.select().from(threads).where(ilike(threads.summary, q)).limit(5),
      ])
      return [
        ...es.map(entryLine),
        ...ts.map((t) => `thread [${t.id}] "${t.name}": ${clip(t.summary, 200)}`),
      ].join('\n') || 'no matches'
    }
    case 'read_thread': {
      const [t] = await db
        .select()
        .from(threads)
        .where(eq(threads.id, args.threadId ?? ''))
        .limit(1)
      if (!t) return 'thread not found'
      const members = await db
        .select()
        .from(journal)
        .where(
          and(eq(journal.threadId, t.id), eq(journal.sealed, false)),
        )
        .orderBy(journal.createdAt)
      return [
        `"${t.name}" (${t.state})`,
        `SUMMARY: ${t.summary}`,
        `MEMBERS:`,
        ...members.map(entryLine),
      ].join('\n')
    }
    case 'read_entry': {
      const [e] = await db
        .select()
        .from(journal)
        .where(
          and(eq(journal.id, args.entryId ?? ''), eq(journal.sealed, false)),
        )
        .limit(1)
      if (!e) return 'entry not found'
      // Full body only for non-private; private stays a theme even here.
      if (e.verdict === 'private') return entryLine(e)
      return `[${e.id}] ${e.createdAt.toISOString().slice(0, 10)} (${e.verdict ?? 'unjudged'}):\n${e.body}`
    }
    default:
      return `unknown tool ${name}`
  }
}

/* -------------------------------------------------------------- rubric -- */

const Candidate = z.object({
  sourceKind: z.enum(['thread', 'entry']),
  threadId: z.string(),
  entryId: z.string(),
  title: z.string(),
  meetsStandards: z.string(),
  whyNow: z.string(),
  artifact: z.string(),
  score: z.number(),
})

const CuratorReport = z.object({
  greeting: z.string(),
  candidates: z.array(Candidate),
})

function curatorRubric(mode: SharingMode) {
  return `
You are the curator of Jeremy Dudet's body of work. He is becoming an
independent entrepreneur — finding real problems, launching businesses,
building cash flow beyond any single product. Stockcount is the current
vehicle. His journal, idea threads, and published posts are the corpus below.

Your job on every run: re-read EVERYTHING — not just what is new — and surface
the 1 to 4 pieces most worth sharing right now. A note that sat dormant for
months and was just completed by a new connection is exactly what you exist to
catch. There is no pipeline and no stages; the best candidate today may be the
oldest thing in the corpus.

North Star (Austin Kleon, Show Your Work) — name these in your justifications:
- Process over product: the messy middle of building beats polished results
- Share something small every day
- Open the cabinet of curiosities: influences and noticing count
- Teach what you know: teachable beats opinion
- Never human spam: no self-promotion, no engagement bait
- Good stories win: tried X → result → lesson

For each candidate:
- meetsStandards: which principles it serves, concretely — not a list, a case.
- whyNow: what changed that makes this timely. Cite the entry or connection.
- score: 0 to 1, how strongly you would push this today.
- Skip anything already shared unless there is a genuinely new angle.
- Do not re-pitch what he recently DISMISSED unless something material changed.
- Honor RECENT FEEDBACK FROM JEREMY when selecting and scoring — it is his
  taste in his own words. The North Star above still wins where they conflict.
- Never build a candidate from private-theme material. The themes exist so you
  understand his season; their content is not yours to share.

${mode === 'template' ? TEMPLATE_RULES : DRAFT_RULES}

greeting: one warm, specific line for when he opens the app. Reference what
actually moved ("The integration-moat idea got its third data point") — never
generic filler. If nothing is worth sharing today, say that plainly and make
the greeting about what is ripening instead; an empty candidates list is a
valid, honest answer.

You have tools to read anything in full before deciding. Use them for your top
candidates rather than working from digests alone.
`.trim()
}

/** Exported for the essay writer (lib/essay-writer.ts): a harvested thread is
 *  shaped by the same sharing mode as a share proposal, and the rules are the
 *  standard — one copy, not two that drift. */
export const TEMPLATE_RULES = `
ARTIFACT = A TEMPLATE, NEVER PROSE. He writes the post; you build the
scaffold. Rules:
- Markdown skeleton: 3-6 short section prompts in his logical order.
- Under each prompt: bullets quoting HIS OWN phrases from the source entries
  (quote marks, verbatim) that belong in that section.
- Mark every gap he must write himself as: [ your words: what goes here ].
- No continuous sentences of your own beyond the section prompts.
- Never invent facts, numbers, events, or opinions. If a section needs
  something the corpus doesn't contain, that is a gap, not a guess.
`.trim()

/** Exported alongside TEMPLATE_RULES — see the note there. */
export const DRAFT_RULES = `
ARTIFACT = AN EDITABLE DRAFT, NEVER A FINISHED POST. Rules:
- Assemble prose ONLY from what he actually wrote — his events, his numbers,
  his phrasing wherever possible. You may reorder and connect; you may not
  invent facts, events, or opinions.
- Keep his register: plain, direct, no hashtags, no emoji, no engagement bait.
- Where his material runs out, leave [ your words: ... ] rather than filling
  the hole yourself.
- This is a starting point he will rewrite, not a product awaiting approval.
`.trim()

/* ---------------------------------------------------------------- run -- */

export async function runCurator(trigger: 'entry' | 'manual' | 'cron') {
  const mode = await sharingMode()
  const { corpus, considered } = await buildCorpus()

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: curatorRubric(mode) },
    { role: 'user', content: corpus },
  ]

  // Bounded tool loop: drill down, then decide. The cap keeps latency and
  // spend predictable; the corpus digest means it can always answer without
  // tools if it must.
  for (let hop = 0; hop < 6; hop++) {
    const res = await xai().chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
    })
    const msg = res.choices[0]?.message
    if (!msg?.tool_calls?.length) break

    messages.push(msg)
    for (const call of msg.tool_calls) {
      if (call.type !== 'function') continue
      let args: Record<string, string> = {}
      try {
        args = JSON.parse(call.function.arguments)
      } catch {
        /* tolerate malformed args; tool returns its own error */
      }
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: await runTool(call.function.name, args),
      })
    }
  }

  messages.push({
    role: 'user',
    content:
      'Now give your final report: the greeting and your candidates, per the rules.',
  })

  const final = await xai().chat.completions.parse({
    model: MODEL,
    messages,
    response_format: zodResponseFormat(CuratorReport, 'curator_report'),
  })

  const report = final.choices[0]?.message.parsed
  if (!report) throw new Error('curator produced no report')

  // Fluidity: the new batch supersedes the old. Open candidates that didn't
  // make this batch go stale — they can always resurface in a later one.
  const batchId = randomUUID()
  await db
    .update(recommendations)
    .set({ status: 'stale', decidedAt: new Date() })
    .where(eq(recommendations.status, 'open'))

  await db.insert(curationBatches).values({
    id: batchId,
    trigger,
    greeting: report.greeting.trim(),
    considered,
  })

  const rows = report.candidates.slice(0, 4).map((c) => ({
    id: randomUUID(),
    batchId,
    sourceKind: c.sourceKind,
    threadId: c.threadId || null,
    entryId: c.entryId || null,
    title: c.title,
    meetsStandards: c.meetsStandards,
    whyNow: c.whyNow,
    mode,
    artifact: c.artifact,
    score: Math.max(0, Math.min(1, c.score)),
  }))
  if (rows.length) await db.insert(recommendations).values(rows)

  return { batchId, greeting: report.greeting, count: rows.length }
}

/* ------------------------------------------------------------- queries -- */

export async function currentCuration() {
  const [batch] = await db
    .select()
    .from(curationBatches)
    .orderBy(desc(curationBatches.createdAt))
    .limit(1)
  if (!batch) return null

  const recs = await db
    .select()
    .from(recommendations)
    .where(
      and(
        eq(recommendations.batchId, batch.id),
        eq(recommendations.status, 'open'),
      ),
    )
    .orderBy(desc(recommendations.score))

  return { batch, recommendations: recs }
}

export async function recommendationById(id: string) {
  const [row] = await db
    .select()
    .from(recommendations)
    .where(eq(recommendations.id, id))
    .limit(1)
  return row
}

export async function decideRecommendation(
  id: string,
  status: 'dismissed' | 'used',
) {
  await db
    .update(recommendations)
    .set({ status, decidedAt: new Date() })
    .where(
      and(eq(recommendations.id, id), ne(recommendations.status, status)),
    )
}

/** Undo a dismissal. Only a dismissed row can reopen — a used or stale one
 *  has moved on. */
export async function reopenRecommendation(id: string) {
  await db
    .update(recommendations)
    .set({ status: 'open', decidedAt: null })
    .where(
      and(eq(recommendations.id, id), eq(recommendations.status, 'dismissed')),
    )
}

function clip(s: string, n: number) {
  const clean = s.replace(/\s+/g, ' ').trim()
  return clean.length > n ? `${clean.slice(0, n - 1)}…` : clean
}
