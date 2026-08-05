import { and, desc, eq, gte, inArray, isNull, lt, notExists, sql } from 'drizzle-orm'
import { slugify } from '@/lib/judge'
import { db } from './index'
import {
  decisions,
  entries,
  issues,
  journal,
  posts,
  subscribers,
  syndications,
  type Cadence,
  type Entry,
  type EntryStatus,
  type JournalStatus,
  type JournalVerdict,
  type Post,
  type SyndicationStatus,
} from './schema'

/* ---------------------------------------------------------------- posts -- */

export async function upsertPosts(rows: (typeof posts.$inferInsert)[]) {
  if (!rows.length) return 0
  await db
    .insert(posts)
    .values(rows)
    .onConflictDoUpdate({
      target: posts.id,
      // Text and shape are immutable; only engagement moves.
      set: {
        metrics: sql`excluded.metrics`,
        metricsUpdatedAt: sql`excluded.metrics_updated_at`,
      },
    })
  return rows.length
}

/**
 * Recompute thread shape from what's actually in the database.
 *
 * Necessary because ingest fetches with `since_id`, so a thread posted across two
 * runs never has all its parts in one batch: yesterday's root isn't re-fetched
 * when today's part 2 arrives, and would otherwise keep threadLength = 1 and
 * never be marked a root. Judged as a single post, a multi-part thread reads
 * as a fragment and gets rejected.
 */
export async function refreshThreadStats(conversationIds: string[]) {
  const ids = [...new Set(conversationIds)]
  if (!ids.length) return

  const counts = await db
    .select({
      conversationId: posts.conversationId,
      n: sql<number>`count(*)::int`,
    })
    .from(posts)
    .where(inArray(posts.conversationId, ids))
    .groupBy(posts.conversationId)

  for (const { conversationId, n } of counts) {
    // The root is the post whose id equals the conversation id.
    const [before] = await db
      .select({ length: posts.threadLength })
      .from(posts)
      .where(eq(posts.id, conversationId))
      .limit(1)

    if (!before || before.length === n) continue

    await db
      .update(posts)
      .set({ isThreadRoot: n > 1, threadLength: n })
      .where(eq(posts.id, conversationId))

    // The post materially changed — a fragment that was rejected on its own
    // may well be publishable as a finished thread. Drop the stale verdict so
    // the judge sees it again with the full body.
    await db.delete(decisions).where(eq(decisions.postId, conversationId))
  }
}

export async function newestPostId(): Promise<string | undefined> {
  const [row] = await db
    .select({ id: posts.id })
    .from(posts)
    .orderBy(desc(posts.createdAt))
    .limit(1)
  return row?.id
}

/** Posts whose engagement is still young enough to be worth re-reading. */
export async function postsNeedingMetrics(withinDays = 7): Promise<Post[]> {
  const since = new Date(Date.now() - withinDays * 86_400_000)
  return db.select().from(posts).where(gte(posts.createdAt, since))
}

export async function updateMetrics(
  updates: { id: string; metrics: Post['metrics'] }[],
) {
  const now = new Date()
  for (const u of updates) {
    await db
      .update(posts)
      .set({ metrics: u.metrics, metricsUpdatedAt: now })
      .where(eq(posts.id, u.id))
  }
}

/**
 * Unjudged posts past the engagement cooldown. The cooldown exists because a
 * post's metrics at T+0 are meaningless — judging immediately would score
 * every post as if it had flopped.
 */
export async function awaitingJudgement(opts: {
  cooldownHours: number
  model: string
  rubricVersion: number
  limit?: number
}): Promise<Post[]> {
  const cutoff = new Date(Date.now() - opts.cooldownHours * 3_600_000)

  return db
    .select()
    .from(posts)
    .where(
      and(
        lt(posts.createdAt, cutoff),
        notExists(
          db
            .select({ one: sql`1` })
            .from(decisions)
            .where(
              and(
                eq(decisions.postId, posts.id),
                eq(decisions.model, opts.model),
                eq(decisions.rubricVersion, opts.rubricVersion),
              ),
            ),
        ),
      ),
    )
    .orderBy(desc(posts.createdAt))
    .limit(opts.limit ?? 25)
}

/** All parts of a thread, in posting order. Used to build the entry body. */
export async function threadParts(conversationId: string): Promise<Post[]> {
  return db
    .select()
    .from(posts)
    .where(eq(posts.conversationId, conversationId))
    .orderBy(posts.createdAt)
}

/* ------------------------------------------------------------ decisions -- */

export async function saveDecision(row: typeof decisions.$inferInsert) {
  await db.insert(decisions).values(row).onConflictDoNothing()
}

/* -------------------------------------------------------------- journal -- */

export async function createEntry_journal(row: typeof journal.$inferInsert) {
  const [created] = await db.insert(journal).values(row).returning()
  return created
}

export async function journalEntry(id: string) {
  const [row] = await db.select().from(journal).where(eq(journal.id, id)).limit(1)
  return row
}

/** Newest first. The phone only ever needs a shallow window. */
export async function recentJournal(limit = 30) {
  return db
    .select()
    .from(journal)
    .orderBy(desc(journal.createdAt))
    .limit(limit)
}

export async function saveEntryVerdict(
  id: string,
  v: {
    verdict: JournalVerdict
    score: number
    reason: string
    suggested: string
  },
) {
  // Explicit field picks, never a spread: the judge's output type carries
  // extra fields (question) that are not journal columns, and callers pass
  // it whole.
  await db
    .update(journal)
    .set({
      verdict: v.verdict,
      score: v.score,
      reason: v.reason,
      suggested: v.suggested,
      status: 'judged',
      judgedAt: new Date(),
    })
    .where(eq(journal.id, id))
}

export async function setJournalStatus(id: string, status: JournalStatus) {
  await db.update(journal).set({ status }).where(eq(journal.id, id))
}

/** Persist a human-refined draft. `suggested` is the draft-to-post field;
 *  the original entry body is never touched. */
export async function saveDraft(id: string, text: string) {
  await db.update(journal).set({ suggested: text }).where(eq(journal.id, id))
}

/**
 * The essay writer's one write, and the only guarded version of saveDraft.
 * The writer pass runs in after() while the card is already on screen, so it
 * must never land on top of a head start he typed in the meantime.
 *
 * Both conditions are checked in SQL rather than read-then-written, so there
 * is no window at all: `suggested = body` is what "still the seeded
 * concatenation" means (harvest writes the two identically, and save_draft
 * only ever touches `suggested`), and `status = 'judged'` means the draft is
 * still sitting in the queue rather than published or dropped.
 *
 * Returns false when the write was skipped — his version stands.
 */
export async function writeComposedDraft(
  id: string,
  text: string,
): Promise<boolean> {
  const rows = await db
    .update(journal)
    .set({ suggested: text })
    .where(
      and(
        eq(journal.id, id),
        eq(journal.status, 'judged'),
        sql`${journal.suggested} = ${journal.body}`,
      ),
    )
    .returning({ id: journal.id })
  return rows.length > 0
}

/**
 * Claim an entry for judging. after() on capture and the sweep route both
 * process through this conditional update, so a row can never be judged
 * twice concurrently. A claim older than 5 minutes is treated as dead —
 * whatever held it was killed — so retry needs no release bookkeeping.
 */
export async function claimForJudging(id: string): Promise<boolean> {
  const claimed = await db
    .update(journal)
    .set({ judgeClaimedAt: new Date() })
    .where(
      and(
        eq(journal.id, id),
        eq(journal.status, 'unjudged'),
        sql`(${journal.judgeClaimedAt} is null or ${journal.judgeClaimedAt} < now() - interval '5 minutes')`,
      ),
    )
    .returning({ id: journal.id })
  return claimed.length > 0
}

/** Entries whose background judging died mid-flight, oldest first. */
export async function unjudgedEntries(opts: {
  limit: number
  olderThanMinutes?: number
}) {
  const conditions = [
    eq(journal.status, 'unjudged'),
    eq(journal.sealed, false),
  ]
  if (opts.olderThanMinutes) {
    conditions.push(
      sql`${journal.createdAt} < now() - make_interval(mins => ${opts.olderThanMinutes})`,
    )
  }
  return db
    .select()
    .from(journal)
    .where(and(...conditions))
    .orderBy(journal.createdAt)
    .limit(opts.limit)
}

/** Judged entries whose matcher run silently failed, oldest first. */
export async function unmatchedEntries(limit: number) {
  return db
    .select()
    .from(journal)
    .where(
      and(
        eq(journal.status, 'judged'),
        eq(journal.sealed, false),
        isNull(journal.matchedAt),
      ),
    )
    .orderBy(journal.createdAt)
    .limit(limit)
}

export async function markMatched(id: string) {
  await db
    .update(journal)
    .set({ matchedAt: new Date() })
    .where(eq(journal.id, id))
}

/** How many entries are still waiting on a verdict — the "N still
 *  processing" line in Needs you. */
export async function processingCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journal)
    .where(and(eq(journal.status, 'unjudged'), eq(journal.sealed, false)))
  return row?.count ?? 0
}

/**
 * Claim an entry for posting. The conditional update is the idempotency
 * guard — two taps on a slow phone connection must not produce two posts.
 * Returns false if it was already claimed.
 */
export async function claimForPosting(id: string): Promise<boolean> {
  const claimed = await db
    .update(journal)
    .set({ status: 'posted' })
    .where(and(eq(journal.id, id), sql`${journal.status} <> 'posted'`))
    .returning({ id: journal.id })
  return claimed.length > 0
}

export async function recordJournalPost(id: string, postId: string) {
  await db
    .update(journal)
    .set({ postId, postedAt: new Date(), status: 'posted' })
    .where(eq(journal.id, id))
}

/** Undo a failed claim so the entry can be retried. */
export async function releasePostingClaim(id: string) {
  await db
    .update(journal)
    .set({ status: 'judged' })
    .where(and(eq(journal.id, id), isNull(journal.postId)))
}

/* --------------------------------------------------------- syndications -- */

/**
 * Record a syndication decision. `onConflictDoNothing` on (postId, target) is
 * the guard that makes double-posting impossible — the row is claimed before
 * anything is sent, so a retry finds it already taken.
 */
export async function claimSyndication(
  row: typeof syndications.$inferInsert,
): Promise<boolean> {
  const inserted = await db
    .insert(syndications)
    .values(row)
    .onConflictDoNothing()
    .returning()
  return inserted.length > 0
}

export async function markSyndicated(
  postId: string,
  target: string,
  result: { remoteId?: string; error?: string; body?: string },
) {
  await db
    .update(syndications)
    .set({
      status: result.error ? 'failed' : 'posted',
      remoteId: result.remoteId ?? null,
      error: result.error ?? null,
      postedAt: result.error ? null : new Date(),
      // Record what was actually sent — the text may have been edited in
      // /admin before posting, and the ledger should match reality.
      ...(result.body ? { body: result.body } : {}),
    })
    .where(
      and(eq(syndications.postId, postId), eq(syndications.target, target)),
    )
}

export async function setSyndicationStatus(
  postId: string,
  target: string,
  status: SyndicationStatus,
) {
  await db
    .update(syndications)
    .set({ status })
    .where(
      and(eq(syndications.postId, postId), eq(syndications.target, target)),
    )
}

export async function alreadySyndicated(postId: string, target: string) {
  const [row] = await db
    .select({ postId: syndications.postId })
    .from(syndications)
    .where(
      and(eq(syndications.postId, postId), eq(syndications.target, target)),
    )
    .limit(1)
  return Boolean(row)
}

/** Approved-and-waiting cross-posts, for the publish step. */
export async function pendingSyndications(target: string) {
  return db
    .select()
    .from(syndications)
    .where(
      and(eq(syndications.target, target), eq(syndications.status, 'pending')),
    )
}

/** Cross-post queue with the post it came from, for the admin view. */
export async function syndicationQueue(target: string) {
  return db
    .select({ syndication: syndications, post: posts })
    .from(syndications)
    .innerJoin(posts, eq(posts.id, syndications.postId))
    .where(
      and(eq(syndications.target, target), eq(syndications.status, 'pending')),
    )
    .orderBy(desc(posts.createdAt))
}

/* -------------------------------------------------------------- entries -- */

/** Slugs collide — Grok will happily title two churn posts the same way. */
export async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  for (let n = 2; ; n++) {
    const [hit] = await db
      .select({ slug: entries.slug })
      .from(entries)
      .where(eq(entries.slug, slug))
      .limit(1)
    if (!hit) return slug
    slug = `${base}-${n}`
  }
}

export async function createEntry(row: typeof entries.$inferInsert) {
  await db.insert(entries).values(row).onConflictDoNothing()
}

/**
 * A pending blog entry for a harvested essay. No posts row backs it — postId
 * stays null and `source: 'harvest'` marks the origin — so it enters the same
 * pending → approved → published machine as everything else, just without the
 * X detour. `postedAt` is "when shipped": the publish tap, since an essay was
 * never tweeted. Returns the slug so the caller can point at the entry.
 */
export async function createEssayEntry(input: {
  title: string
  body: string
}): Promise<string> {
  const slug = await uniqueSlug(slugify(input.title) || 'essay')
  await db.insert(entries).values({
    slug,
    postId: null,
    source: 'harvest',
    title: input.title,
    body: input.body,
    status: 'pending',
    postedAt: new Date(),
  })
  return slug
}

export async function entriesByStatus(status: EntryStatus): Promise<Entry[]> {
  return db
    .select()
    .from(entries)
    .where(eq(entries.status, status))
    .orderBy(desc(entries.postedAt))
}

export async function publishedEntries(): Promise<Entry[]> {
  return db
    .select()
    .from(entries)
    .where(eq(entries.status, 'published'))
    .orderBy(desc(entries.postedAt))
}

/** Confirmed, still-subscribed count. Used as social proof on the home page. */
export async function subscriberCount(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscribers)
    .where(
      and(
        isNull(subscribers.unsubscribedAt),
        sql`${subscribers.confirmedAt} is not null`,
      ),
    )
  return row?.n ?? 0
}

/** Newest published entries, for the home page section. */
export async function recentEntries(limit = 3): Promise<Entry[]> {
  return db
    .select()
    .from(entries)
    .where(eq(entries.status, 'published'))
    .orderBy(desc(entries.postedAt))
    .limit(limit)
}

export async function entryBySlug(slug: string): Promise<Entry | undefined> {
  const [row] = await db
    .select()
    .from(entries)
    .where(eq(entries.slug, slug))
    .limit(1)
  return row
}

export async function setEntryStatus(slug: string, status: EntryStatus) {
  await db
    .update(entries)
    .set({
      status,
      publishedAt: status === 'published' ? new Date() : null,
    })
    .where(eq(entries.slug, slug))
}

/**
 * The review queue: entries awaiting a call, each with the verdict that put it
 * there. Seeing `score` and `reason` next to the post is how the rubric gets
 * tuned — that's the point of surfacing them.
 */
export async function reviewQueue() {
  return db
    .select({
      entry: entries,
      score: decisions.score,
      reason: decisions.reason,
      model: decisions.model,
      metrics: posts.metrics,
    })
    .from(entries)
    .innerJoin(posts, eq(posts.id, entries.postId))
    .leftJoin(decisions, eq(decisions.postId, entries.postId))
    .where(eq(entries.status, 'pending'))
    .orderBy(desc(entries.postedAt))
}

/** Approved but not yet live — what the publish cron promotes. */
export async function approvedEntries(): Promise<Entry[]> {
  return entriesByStatus('approved')
}

/**
 * Published entries never included in a sent issue of this cadence. Driven off
 * the issues ledger so a cron retry can't mail the same post twice.
 */
export async function unsentEntries(cadence: Cadence): Promise<Entry[]> {
  const sent = await db
    .select({ slugs: issues.slugs })
    .from(issues)
    .where(eq(issues.cadence, cadence))

  const already = new Set(sent.flatMap((r) => r.slugs))
  const live = await publishedEntries()
  return live.filter((e) => !already.has(e.slug))
}

/* ---------------------------------------------------------- subscribers -- */

export async function addSubscriber(row: typeof subscribers.$inferInsert) {
  await db
    .insert(subscribers)
    .values(row)
    .onConflictDoUpdate({
      target: subscribers.email,
      // Re-subscribing after an unsubscribe should just work.
      set: { cadence: row.cadence, unsubscribedAt: null },
    })
}

export async function confirmSubscriber(token: string) {
  const [row] = await db
    .update(subscribers)
    .set({ confirmedAt: new Date() })
    .where(eq(subscribers.token, token))
    .returning()
  return row
}

export async function unsubscribe(token: string) {
  const [row] = await db
    .update(subscribers)
    .set({ unsubscribedAt: new Date() })
    .where(eq(subscribers.token, token))
    .returning()
  return row
}

export async function activeSubscribers(cadence: Cadence) {
  return db
    .select()
    .from(subscribers)
    .where(
      and(
        eq(subscribers.cadence, cadence),
        isNull(subscribers.unsubscribedAt),
        sql`${subscribers.confirmedAt} is not null`,
      ),
    )
}

/* --------------------------------------------------------------- issues -- */

export async function recordIssue(row: typeof issues.$inferInsert) {
  const inserted = await db
    .insert(issues)
    .values(row)
    .onConflictDoNothing()
    .returning()
  return inserted.length > 0 // false => this issue already went out
}

export async function issueExists(id: string) {
  const [row] = await db
    .select({ id: issues.id })
    .from(issues)
    .where(eq(issues.id, id))
    .limit(1)
  return Boolean(row)
}
