import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from './index'
import {
  entries,
  journal,
  posts,
  syndications,
  threads,
  type Proposal,
  type ProposalType,
} from './schema'
import { entryCounts, pendingProposals } from './zettel'

/**
 * Everything blocking on a decision, in one list.
 *
 * The old page interleaved statistics with actions, so "what needs me" had to
 * be inferred by scanning. This models it directly: an item is either waiting
 * on you, moving on its own, or done.
 */
export type Attention = {
  id: string
  kind: 'blog' | 'ready-to-post' | 'develop' | 'stalled'
  /** Lower sorts first. Decisions that block publication outrank ideas. */
  priority: number
  title: string
  body: string
  reason: string | null
  score: number | null
  meta: string | null
  createdAt: Date
}

export type Stage = {
  label: string
  count: number
  note: string
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

export type Review = {
  attention: Attention[]
  suggestions: ProposalView[]
  ripe: RipeThread[]
  moving: { label: string; count: number; note: string }[]
  stages: Stage[]
}

export async function review(): Promise<Review> {
  const [pendingEntries, readyToPost, toDevelop, stalled] = await Promise.all([
    // Blog entries awaiting approve/reject — the only thing that blocks a post
    // from going live, so it sorts first.
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

    // Real ideas that need another pass. Not blocking, but the whole point of
    // keeping a journal — these are what rot if never surfaced.
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

    // Written but never judged — means the model call failed. Needs a retry,
    // not a decision.
    db
      .select()
      .from(journal)
      .where(
        and(
          isNull(journal.verdict),
          eq(journal.sealed, false),
          eq(journal.status, 'unjudged'),
        ),
      )
      .orderBy(desc(journal.createdAt)),
  ])

  const attention: Attention[] = [
    ...pendingEntries.map((e) => ({
      id: e.slug,
      kind: 'blog' as const,
      priority: 1,
      title: e.title,
      body: e.body,
      reason: null,
      score: null,
      meta: `${e.impressions} impressions on X`,
      createdAt: e.postedAt,
    })),
    ...readyToPost.map((j) => ({
      id: j.id,
      kind: 'ready-to-post' as const,
      priority: 2,
      title: firstLine(j.suggested ?? j.body),
      body: j.suggested ?? j.body,
      reason: j.reason,
      score: j.score,
      meta: null,
      createdAt: j.createdAt,
    })),
    ...toDevelop.map((j) => ({
      id: j.id,
      kind: 'develop' as const,
      priority: 3,
      title: firstLine(j.body),
      body: j.body,
      reason: j.reason,
      score: j.score,
      meta: null,
      createdAt: j.createdAt,
    })),
    ...stalled.map((j) => ({
      id: j.id,
      kind: 'stalled' as const,
      priority: 4,
      title: firstLine(j.body),
      body: j.body,
      reason: 'Never judged — the model call failed.',
      score: null,
      meta: null,
      createdAt: j.createdAt,
    })),
  ].sort(
    (a, b) =>
      a.priority - b.priority || b.createdAt.getTime() - a.createdAt.getTime(),
  )

  const [counts] = (
    await db.execute<{
      approved: number
      published: number
      unsent: number
      posted_journal: number
      journal_total: number
      x_posts: number
      judged: number
      subs: number
      linkedin_pending: number
    }>(sql`
      select
        (select count(*) from entries where status='approved')::int as approved,
        (select count(*) from entries where status='published')::int as published,
        (select count(*) from entries e where e.status='published'
           and not exists (
             select 1 from issues i where i.slugs::jsonb ? e.slug
           ))::int as unsent,
        (select count(*) from journal where post_id is not null)::int as posted_journal,
        (select count(*) from journal)::int as journal_total,
        (select count(*) from posts)::int as x_posts,
        (select count(*) from decisions where reason not like 'gate:%')::int as judged,
        (select count(*) from subscribers
           where confirmed_at is not null and unsubscribed_at is null)::int as subs,
        (select count(*) from syndications
           where target='linkedin' and status='pending')::int as linkedin_pending
    `)
  ).rows

  const [suggestions, ripe] = await Promise.all([
    buildProposalViews(),
    ripeThreads(),
  ])

  const moving = [
    {
      label: 'Approved',
      count: counts.approved,
      note: 'goes live on the next publish run',
    },
    {
      label: 'Published, not yet mailed',
      count: counts.unsent,
      note: counts.subs
        ? 'in the next newsletter'
        : 'no subscribers yet, so nothing will send',
    },
  ].filter((m) => m.count > 0)

  const stages: Stage[] = [
    {
      label: 'Journal',
      count: counts.journal_total,
      note: `${counts.posted_journal} posted`,
    },
    {
      label: 'On X',
      count: counts.x_posts,
      note: `${counts.judged} reached Grok`,
    },
    {
      label: 'Blog',
      count: counts.published,
      note: counts.published === 1 ? 'post live' : 'posts live',
    },
    {
      label: 'Newsletter',
      count: counts.subs,
      note: counts.subs === 1 ? 'subscriber' : 'subscribers',
    },
  ]

  return { attention, suggestions, ripe, moving, stages }
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

  return pending.map((p) => view(p, byThread, byEntry))
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
