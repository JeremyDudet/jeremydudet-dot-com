import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

/**
 * Raw posts pulled from X. One row per post, keyed by the X post id.
 * Thread members share a `conversationId`; only the root is ever published.
 */
export const posts = pgTable(
  'posts',
  {
    id: text('id').primaryKey(), // X post id
    conversationId: text('conversation_id').notNull(),
    text: text('text').notNull(), // note_tweet.text when long-form, else text
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),

    // Shape — set at ingest, drives the cheap gate before we spend a token
    isReply: boolean('is_reply').notNull().default(false),
    isQuote: boolean('is_quote').notNull().default(false),
    isRepost: boolean('is_repost').notNull().default(false),
    isThreadRoot: boolean('is_thread_root').notNull().default(false),
    threadLength: integer('thread_length').notNull().default(1),

    media: jsonb('media').$type<Media[]>().notNull().default([]),
    metrics: jsonb('metrics').$type<Metrics>().notNull(),
    metricsUpdatedAt: timestamp('metrics_updated_at', { withTimezone: true }),

    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('posts_created_at_idx').on(t.createdAt),
    index('posts_conversation_idx').on(t.conversationId),
  ],
)

export type Metrics = {
  like_count: number
  reply_count: number
  retweet_count: number
  quote_count: number
  impression_count: number
  bookmark_count: number
}

export type Media = {
  key: string
  type: 'photo' | 'video' | 'animated_gif'
  url: string // rehosted on Blob, not the X CDN
  width: number
  height: number
  alt: string | null
}

/**
 * One verdict per (post, model). Kept separate from `entries` so re-judging
 * with a new rubric never touches published content, and so a cron re-run
 * never re-spends a token on a post already decided.
 */
export const decisions = pgTable(
  'decisions',
  {
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    model: text('model').notNull(),
    rubricVersion: integer('rubric_version').notNull(),

    publish: boolean('publish').notNull(),
    score: real('score').notNull(),
    reason: text('reason').notNull(),
    title: text('title'),
    slug: text('slug'),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),

    judgedAt: timestamp('judged_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.model, t.rubricVersion] })],
)

export type EntryStatus = 'pending' | 'approved' | 'rejected' | 'published'

/**
 * A blog entry. Created when a verdict says publish; only reaches the site
 * once a human flips it to `published`. `body` is the post text verbatim —
 * threads joined — so the page and the email can render it exactly as tweeted.
 */
export const entries = pgTable(
  'entries',
  {
    slug: text('slug').primaryKey(),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),

    title: text('title').notNull(),
    body: text('body').notNull(),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    media: jsonb('media').$type<Media[]>().notNull().default([]),

    status: text('status').$type<EntryStatus>().notNull().default('pending'),
    postedAt: timestamp('posted_at', { withTimezone: true }).notNull(), // when tweeted
    publishedAt: timestamp('published_at', { withTimezone: true }), // when it hit the site

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('entries_post_id_idx').on(t.postId),
    index('entries_status_idx').on(t.status),
  ],
)

export type Cadence = 'daily' | 'weekly' | 'monthly'

export const subscribers = pgTable(
  'subscribers',
  {
    email: text('email').primaryKey(),
    cadence: text('cadence').$type<Cadence>().notNull().default('weekly'),
    token: text('token').notNull(), // confirm + unsubscribe, single value
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('subscribers_cadence_idx').on(t.cadence)],
)

/**
 * Send ledger. Prevents a cron retry from mailing the same entry twice and
 * records what each issue contained.
 */
export const issues = pgTable(
  'issues',
  {
    id: text('id').primaryKey(), // `${cadence}-${ISO date}` — idempotency key
    cadence: text('cadence').$type<Cadence>().notNull(),
    slugs: jsonb('slugs').$type<string[]>().notNull(),
    recipientCount: integer('recipient_count').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('issues_cadence_idx').on(t.cadence)],
)

/**
 * Provider tokens. One row per provider: 'x', 'linkedin'.
 *
 * X rotates its refresh token on every exchange, so it cannot live in an env
 * var. LinkedIn self-serve apps get no refresh token at all (those are MDP
 * partners only) — refreshToken is null there and the access token simply
 * expires after 60 days, at which point a human must re-authorize.
 */
export const oauth = pgTable('oauth', {
  id: text('id').primaryKey(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  // urn:li:person:xxxx for LinkedIn; the numeric user id for X
  subject: text('subject'),
})

export type SyndicationStatus = 'pending' | 'posted' | 'failed' | 'skipped'

/**
 * Cross-posting ledger. The (postId, target) primary key is the idempotency
 * guarantee — a cron retry, a double-fire, or a redeploy cannot post the same
 * thing to LinkedIn twice. Public double-posts are not undoable, so this is
 * enforced by the database rather than by application care.
 */
export const syndications = pgTable(
  'syndications',
  {
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    target: text('target').notNull(), // 'linkedin'

    status: text('status').$type<SyndicationStatus>().notNull(),
    body: text('body').notNull(), // adapted text, exactly as sent
    reason: text('reason').notNull(),
    remoteId: text('remote_id'), // urn:li:share:... once posted
    error: text('error'),

    decidedAt: timestamp('decided_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    postedAt: timestamp('posted_at', { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.target] }),
    index('syndications_status_idx').on(t.status),
  ],
)

export type Syndication = typeof syndications.$inferSelect

/* ------------------------------------------------------------ zettelkasten -- */

export type ThreadState =
  | 'forming' // one entry, just born
  | 'ripening' // evidence accruing
  | 'ripe' // ready to become a longer piece
  | 'harvested' // became one
  | 'abandoned' // dead end, kept for the record

export type ThreadKind = 'idea' | 'structure'

/**
 * A thread is an idea that ripens as entries accumulate. Membership lives on
 * journal.threadId (single source of truth), not on an array here — ordering
 * is the entries' own createdAt. `structure` threads are Maps of Content:
 * hubs that link other threads and never take entries directly.
 */
export const threads = pgTable(
  'threads',
  {
    id: text('id').primaryKey(),
    kind: text('kind').$type<ThreadKind>().notNull().default('idea'),
    name: text('name').notNull(),
    /** Living summary — what the idea currently is. Rewritten as it ripens. */
    summary: text('summary').notNull(),
    state: text('state').$type<ThreadState>().notNull().default('forming'),
    relatedThreadIds: jsonb('related_thread_ids')
      .$type<string[]>()
      .notNull()
      .default([]),
    /** Prior summaries, oldest first — a bad join is always reversible. */
    summaryHistory: jsonb('summary_history')
      .$type<{ summary: string; at: string }[]>()
      .notNull()
      .default([]),
    lastAgentTouchAt: timestamp('last_agent_touch_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('threads_state_idx').on(t.state)],
)

export type ProposalType =
  | 'join_thread'
  | 'create_thread'
  | 'merge_threads'
  | 'link_threads'
  | 'detach_entry'
  | 'update_summary'
  | 'mark_ripe'
  | 'create_structure_note'
  | 'archive_orphan'
  | 'split_entry'

export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

/**
 * Payload shapes by type (all optional fields absent unless noted):
 *  join_thread            { entryId, threadId, updatedSummary }
 *  create_thread          { entryId, name, summary }
 *  merge_threads          { sourceThreadId, targetThreadId, mergedSummary }
 *  link_threads           { threadIds: [a, b] }
 *  detach_entry           { entryId, threadId }
 *  update_summary         { threadId, newSummary }
 *  mark_ripe              { threadId }
 *  create_structure_note  { name, noteText, threadIds }
 *  archive_orphan         { threadId? , entryId? }  — exactly one set
 *  split_entry            { entryId, parts: string[] }
 */
export type ProposalPayload = {
  entryId?: string
  threadId?: string
  sourceThreadId?: string
  targetThreadId?: string
  threadIds?: string[]
  name?: string
  summary?: string
  updatedSummary?: string
  mergedSummary?: string
  newSummary?: string
  noteText?: string
  parts?: string[]
}

/**
 * The agents never mutate the graph. Every structural change is a row here,
 * and nothing happens until a human accepts it. Verdicts (private/post/
 * develop) stay automatic — they were already reviewed as a design and are
 * not graph structure.
 */
export const proposals = pgTable(
  'agent_proposals',
  {
    id: text('id').primaryKey(),
    type: text('type').$type<ProposalType>().notNull(),
    status: text('status').$type<ProposalStatus>().notNull().default('pending'),
    /** Denormalised for inbox filtering; authoritative copies in payload. */
    entryId: text('entry_id'),
    threadId: text('thread_id'),
    payload: jsonb('payload').$type<ProposalPayload>().notNull(),
    reasoning: text('reasoning').notNull(),
    confidence: real('confidence').notNull(),
    /** 'matcher' (on-ingest) or 'librarian' (maintenance). */
    source: text('source').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (t) => [index('proposals_status_idx').on(t.status)],
)

export type Thread = typeof threads.$inferSelect
export type Proposal = typeof proposals.$inferSelect

/** What Grok decides a raw entry is. */
export type JournalVerdict = 'private' | 'post' | 'develop'

/** Where the entry is in its life, independent of the verdict. */
export type JournalStatus =
  | 'unjudged' // written, not yet sent to Grok
  | 'judged' // has a verdict, awaiting your call
  | 'posted' // published to X
  | 'archived' // filed away, no further action

/**
 * The journal. Source of truth for everything downstream — X, blog, LinkedIn
 * are all outputs of entries that started here.
 *
 * Entries with `sealed = true` are never sent to the xAI API. That's the only
 * way to keep a thought genuinely private, since judging one requires sending
 * it to a third party.
 */
export const journal = pgTable(
  'journal',
  {
    id: text('id').primaryKey(),
    body: text('body').notNull(),

    sealed: boolean('sealed').notNull().default(false),
    status: text('status').$type<JournalStatus>().notNull().default('unjudged'),

    /** The idea this entry feeds. Null = not yet threaded. */
    threadId: text('thread_id'),
    /** Set on children created by an accepted split_entry proposal. */
    parentId: text('parent_id'),

    verdict: text('verdict').$type<JournalVerdict>(),
    score: real('score'),
    reason: text('reason'),
    // Grok's tightened version, ready to post. Editable before sending.
    suggested: text('suggested'),
    judgedAt: timestamp('judged_at', { withTimezone: true }),

    postId: text('post_id'), // X post id once published
    postedAt: timestamp('posted_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('journal_status_idx').on(t.status),
    index('journal_created_at_idx').on(t.createdAt),
  ],
)

export type JournalEntry = typeof journal.$inferSelect

export type Post = typeof posts.$inferSelect
export type Decision = typeof decisions.$inferSelect
export type Entry = typeof entries.$inferSelect
export type Subscriber = typeof subscribers.$inferSelect
