import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from './index'
import {
  curationBatches,
  entries,
  journal,
  posts,
  recommendations,
  threads,
  type Proposal,
  type ProposalType,
  type Recommendation,
} from './schema'
import { entryCounts, pendingProposals } from './zettel'
import { processingCount } from './queries'
import { openQuestions, recentlyResolvedPrivate } from './questions'

/**
 * The Needs-you queue: the only things that block on a human, in one list.
 * Share proposals (ready-to-post entries and curator picks) and blog-gate
 * decisions live here; zettelkasten maintenance lives on the Ideas surface
 * via ideasReview() — it is deliberately a when-you-feel-like-it queue.
 */
export type Attention = {
  id: string
  kind: 'blog' | 'develop'
  /** Lower sorts first. Decisions that block publication outrank ideas. */
  priority: number
  title: string
  body: string
  reason: string | null
  score: number | null
  meta: string | null
  createdAt: Date
}

/**
 * One share proposal, whichever agent raised it. `score` is normalized 0–1
 * across both sources so the queue has a single honest ordering.
 */
export type Share =
  | { kind: 'entry'; score: number; createdAt: Date; entry: ShareEntry }
  | { kind: 'recommendation'; score: number; createdAt: Date; rec: Recommendation }

export type ShareEntry = {
  id: string
  /** The current draft: suggested (possibly human-refined) or the raw body.
   *  Shown in full on the card — this exact text is what would be posted. */
  body: string
  reason: string | null
  /** Raw judge score, 0–10, for display. */
  score: number | null
}

/** A follow-up question, with its root entry readable in full. */
export type QuestionItem = {
  id: string
  question: string
  entryId: string
  rootBody: string
  createdAt: Date
}

export type NeedsYou = {
  blog: Attention[]
  /** Harvested essay drafts awaiting review — publish to blog or reject. */
  essays: ShareEntry[]
  shares: Share[]
  questions: QuestionItem[]
  develop: Attention[]
  /** Q/A chains that just resolved to private — visible, not silent. */
  resolved: string[]
  /** Entries still waiting on a background verdict. */
  processingCount: number
  /** What the curator read to pick its candidates, for the section sub-line. */
  considered: string | null
}

export async function needsYou(): Promise<NeedsYou> {
  const [
    pendingEntries,
    essayDrafts,
    readyToPost,
    toDevelop,
    openRecs,
    batch,
    processing,
    open,
    resolvedRows,
  ] = await Promise.all([
      // Blog entries awaiting approve/reject — the only thing that blocks a
      // post from going live, so it sorts first.
      db
        .select({
          slug: entries.slug,
          title: entries.title,
          body: entries.body,
          postedAt: entries.postedAt,
          postId: entries.postId,
          impressions: sql<number>`(${posts.metrics}->>'impression_count')::int`,
        })
        .from(entries)
        .innerJoin(posts, eq(posts.id, entries.postId))
        .where(eq(entries.status, 'pending'))
        .orderBy(desc(entries.postedAt)),

      // Harvested essay drafts. 'essay' is assigned by the harvest action
      // alone, so the post/develop buckets below exclude these for free.
      db
        .select()
        .from(journal)
        .where(
          and(eq(journal.verdict, 'essay'), eq(journal.status, 'judged')),
        )
        .orderBy(desc(journal.createdAt)),

      // Judged worth posting, never sent.
      db
        .select()
        .from(journal)
        .where(
          and(
            eq(journal.verdict, 'post'),
            isNull(journal.postId),
            sql`${journal.status} <> 'archived'`,
          ),
        )
        .orderBy(desc(journal.createdAt)),

      // Real ideas that need another pass. Interim: phase 4 turns these into
      // follow-up questions and this section empties itself.
      db
        .select()
        .from(journal)
        .where(
          and(
            eq(journal.verdict, 'develop'),
            sql`${journal.status} <> 'archived'`,
          ),
        )
        .orderBy(desc(journal.createdAt)),

      db
        .select()
        .from(recommendations)
        .where(eq(recommendations.status, 'open')),

      db
        .select({ considered: curationBatches.considered })
        .from(curationBatches)
        .orderBy(desc(curationBatches.createdAt))
        .limit(1),

      processingCount(),

      openQuestions(),

      recentlyResolvedPrivate().catch(
        () => [] as { question: string; rootBody: string }[],
      ),
    ])

  const essays: ShareEntry[] = essayDrafts.map((j) => ({
    id: j.id,
    body: j.suggested ?? j.body,
    reason: j.reason,
    score: j.score,
  }))

  const blog: Attention[] = pendingEntries.map((e) => ({
    id: e.slug,
    kind: 'blog' as const,
    priority: 1,
    title: e.title,
    body: e.body,
    reason: null,
    score: null,
    meta: `${e.impressions} impressions on X`,
    createdAt: e.postedAt,
  }))

  const shares: Share[] = [
    ...readyToPost.map((j) => ({
      kind: 'entry' as const,
      score: (j.score ?? 5) / 10,
      createdAt: j.createdAt,
      entry: {
        id: j.id,
        body: j.suggested ?? j.body,
        reason: j.reason,
        score: j.score,
      },
    })),
    ...openRecs.map((r) => ({
      kind: 'recommendation' as const,
      score: r.score,
      createdAt: r.createdAt,
      rec: r,
    })),
  ].sort(
    (a, b) =>
      b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime(),
  )

  // A root with an open question is represented by its QuestionCard — showing
  // it as a develop card too would double it.
  const questioned = new Set(open.map((q) => q.entryId))
  const rootRows = open.length
    ? await db
        .select({ id: journal.id, body: journal.body })
        .from(journal)
        .where(inArray(journal.id, [...questioned]))
    : []
  const rootBody = new Map(rootRows.map((r) => [r.id, r.body]))

  const questions: QuestionItem[] = open.map((q) => ({
    id: q.id,
    question: q.question,
    entryId: q.entryId,
    rootBody: rootBody.get(q.entryId) ?? '',
    createdAt: q.createdAt,
  }))

  const develop: Attention[] = toDevelop
    .filter((j) => !questioned.has(j.id))
    .map((j) => ({
      id: j.id,
      kind: 'develop' as const,
      priority: 3,
      title: firstLine(j.body),
      body: j.body,
      reason: j.reason,
      score: j.score,
      meta: null,
      createdAt: j.createdAt,
    }))

  const resolved = resolvedRows.map(
    (r) =>
      `Your answer settled "${firstLine(r.rootBody, 48)}" as private — it stays in the journal.`,
  )

  return {
    blog,
    essays,
    shares,
    questions,
    develop,
    resolved,
    processingCount: processing,
    considered: openRecs.length ? (batch[0]?.considered ?? null) : null,
  }
}

/** The Ideas surface's slow queue: zettelkasten maintenance + harvestable
 *  threads. Decided at leisure, never part of the daily loop. */
export async function ideasReview() {
  const [suggestions, ripe] = await Promise.all([
    buildProposalViews(),
    ripeThreads(),
  ])
  return { suggestions, ripe }
}

/**
 * A pending agent proposal, enriched with everything needed to decide it on
 * sight: the entry text, the threads involved, and — where a summary changes —
 * the before and after side by side.
 */
export type ProposalView = {
  id: string
  type: ProposalType
  source: string
  confidence: number
  reasoning: string
  headline: string
  entryBody?: string
  before?: string
  after?: string
  parts?: string[]
  editableSummary: boolean
}

export type RipeThread = {
  id: string
  name: string
  summary: string
  entryCount: number
}

async function ripeThreads(): Promise<RipeThread[]> {
  const rows = await db
    .select()
    .from(threads)
    .where(eq(threads.state, 'ripe'))
    .orderBy(desc(threads.updatedAt))
  const counts = await entryCounts()
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    summary: t.summary,
    entryCount: counts.get(t.id) ?? 0,
  }))
}

async function buildProposalViews(): Promise<ProposalView[]> {
  const pending = await pendingProposals()
  if (!pending.length) return []

  // One fetch per referenced table, not per proposal.
  const threadIds = new Set<string>()
  const entryIds = new Set<string>()
  for (const p of pending) {
    for (const id of [
      p.payload.threadId,
      p.payload.sourceThreadId,
      p.payload.targetThreadId,
      ...(p.payload.threadIds ?? []),
    ])
      if (id) threadIds.add(id)
    if (p.payload.entryId) entryIds.add(p.payload.entryId)
  }

  const threadRows = threadIds.size
    ? await db.select().from(threads).where(inArray(threads.id, [...threadIds]))
    : []
  const entryRows = entryIds.size
    ? await db.select().from(journal).where(inArray(journal.id, [...entryIds]))
    : []
  const byThread = new Map(threadRows.map((t) => [t.id, t]))
  const byEntry = new Map(entryRows.map((e) => [e.id, e]))

  return pending
    .map((p) => view(p, byThread, byEntry))
    .sort((a, b) => b.confidence - a.confidence)
}

function view(
  p: Proposal,
  byThread: Map<string, typeof threads.$inferSelect>,
  byEntry: Map<string, typeof journal.$inferSelect>,
): ProposalView {
  const pay = p.payload
  const thread = pay.threadId ? byThread.get(pay.threadId) : undefined
  const entry = pay.entryId ? byEntry.get(pay.entryId) : undefined

  const base = {
    id: p.id,
    type: p.type,
    source: p.source,
    confidence: p.confidence,
    reasoning: p.reasoning,
    entryBody: entry?.body,
    editableSummary: false,
  }

  switch (p.type) {
    case 'join_thread':
      return {
        ...base,
        headline: `Add to "${thread?.name ?? 'unknown thread'}"`,
        before: thread?.summary,
        after: pay.updatedSummary,
        editableSummary: Boolean(pay.updatedSummary),
      }
    case 'create_thread':
      return {
        ...base,
        headline: `New idea: "${pay.name}"`,
        after: pay.summary,
        editableSummary: true,
      }
    case 'merge_threads': {
      const source = pay.sourceThreadId
        ? byThread.get(pay.sourceThreadId)
        : undefined
      const target = pay.targetThreadId
        ? byThread.get(pay.targetThreadId)
        : undefined
      return {
        ...base,
        headline: `Merge "${source?.name ?? '?'}" into "${target?.name ?? '?'}"`,
        before: `${source?.summary ?? ''}\n\n— vs —\n\n${target?.summary ?? ''}`,
        after: pay.mergedSummary,
        editableSummary: Boolean(pay.mergedSummary),
      }
    }
    case 'link_threads': {
      const [a, b] = (pay.threadIds ?? []).map((id) => byThread.get(id))
      return { ...base, headline: `Link "${a?.name ?? '?'}" ↔ "${b?.name ?? '?'}"` }
    }
    case 'detach_entry':
      return {
        ...base,
        headline: `Detach entry from "${thread?.name ?? '?'}"`,
      }
    case 'update_summary':
      return {
        ...base,
        headline: `Rewrite summary of "${thread?.name ?? '?'}"`,
        before: thread?.summary,
        after: pay.newSummary,
        editableSummary: true,
      }
    case 'mark_ripe':
      return { ...base, headline: `"${thread?.name ?? '?'}" is ripe` }
    case 'create_structure_note':
      return {
        ...base,
        headline: `Map of Content: "${pay.name}"`,
        after: pay.noteText,
        editableSummary: true,
      }
    case 'archive_orphan':
      return {
        ...base,
        headline: thread
          ? `Archive dead-end thread "${thread.name}"`
          : 'Archive stray entry',
      }
    case 'split_entry':
      return {
        ...base,
        headline: `Split into ${pay.parts?.length ?? 0} separate ideas`,
        parts: pay.parts,
      }
  }
}

function firstLine(text: string, max = 72) {
  const line = text.split('\n').find((l) => l.trim()) ?? text
  const clean = line.trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}
