import { sql } from 'drizzle-orm'
import { db } from './index'

export type Funnel = {
  ingested: number
  gated: number
  judged: number
  approvedForBlog: number
  published: number
}

export type Dashboard = {
  funnel: Funnel
  queues: { blog: number; linkedin: number; approved: number }
  journal: { post: number; develop: number; private: number; sealed: number; unjudged: number }
  subscribers: { daily: number; weekly: number; monthly: number; unconfirmed: number }
  lastRun: { ingest: Date | null; judge: Date | null; newsletter: Date | null }
  tokens: { x: Date | null; linkedin: Date | null }
  spend: { grokCalls: number; xReads: number }
  socialProvider: string
  crosspostEnabled: boolean
}

/**
 * One round trip per group rather than per number — this page is behind auth
 * and hit rarely, but Neon charges by compute-second and every query wakes it.
 */
export async function dashboard(): Promise<Dashboard> {
  const { rows: [funnel] } = await db.execute<{
    ingested: number
    gated: number
    judged: number
    approved_for_blog: number
    published: number
  }>(sql`
    select
      (select count(*) from posts)::int as ingested,
      (select count(*) from decisions where reason like 'gate:%')::int as gated,
      (select count(*) from decisions where reason not like 'gate:%')::int as judged,
      (select count(*) from decisions where publish)::int as approved_for_blog,
      (select count(*) from entries where status = 'published')::int as published
  `)

  const { rows: [queues] } = await db.execute<{
    blog: number
    linkedin: number
    approved: number
  }>(sql`
    select
      (select count(*) from entries where status = 'pending')::int as blog,
      (select count(*) from syndications where target='linkedin' and status='pending')::int as linkedin,
      (select count(*) from entries where status = 'approved')::int as approved
  `)

  const { rows: [journal] } = await db.execute<{
    post: number
    develop: number
    priv: number
    sealed: number
    unjudged: number
  }>(sql`
    select
      count(*) filter (where verdict = 'post')::int as post,
      count(*) filter (where verdict = 'develop')::int as develop,
      count(*) filter (where verdict = 'private')::int as priv,
      count(*) filter (where sealed)::int as sealed,
      count(*) filter (where verdict is null and not sealed)::int as unjudged
    from journal
  `)

  const { rows: [subs] } = await db.execute<{
    daily: number
    weekly: number
    monthly: number
    unconfirmed: number
  }>(sql`
    select
      count(*) filter (where cadence='daily' and confirmed_at is not null and unsubscribed_at is null)::int as daily,
      count(*) filter (where cadence='weekly' and confirmed_at is not null and unsubscribed_at is null)::int as weekly,
      count(*) filter (where cadence='monthly' and confirmed_at is not null and unsubscribed_at is null)::int as monthly,
      count(*) filter (where confirmed_at is null and unsubscribed_at is null)::int as unconfirmed
    from subscribers
  `)

  const { rows: [runs] } = await db.execute<{
    ingest: string | null
    judge: string | null
    newsletter: string | null
  }>(sql`
    select
      (select max(ingested_at) from posts) as ingest,
      (select max(judged_at) from decisions) as judge,
      (select max(sent_at) from issues) as newsletter
  `)

  const { rows: tokenRows } = await db.execute<{
    id: string
    expires_at: string
  }>(sql`select id, expires_at from oauth`)
  const tokens = new Map(tokenRows.map((r) => [r.id, new Date(r.expires_at)]))

  return {
    funnel: {
      ingested: funnel.ingested,
      gated: funnel.gated,
      judged: funnel.judged,
      approvedForBlog: funnel.approved_for_blog,
      published: funnel.published,
    },
    queues,
    journal: {
      post: journal.post,
      develop: journal.develop,
      private: journal.priv,
      sealed: journal.sealed,
      unjudged: journal.unjudged,
    },
    subscribers: subs,
    lastRun: {
      ingest: runs.ingest ? new Date(runs.ingest) : null,
      judge: runs.judge ? new Date(runs.judge) : null,
      newsletter: runs.newsletter ? new Date(runs.newsletter) : null,
    },
    tokens: {
      x: tokens.get('x') ?? null,
      linkedin: tokens.get('linkedin') ?? null,
    },
    // Rough, and labelled as such in the UI. Gate rejections cost nothing;
    // only posts that reached the model did.
    spend: { grokCalls: funnel.judged, xReads: funnel.ingested },
    socialProvider: process.env.SOCIAL_PROVIDER ?? 'x',
    crosspostEnabled: process.env.CROSSPOST_LINKEDIN === 'true',
  }
}

/** Recent verdicts with reasons — the surface for tuning the rubric. */
export async function recentDecisions(limit = 12) {
  const { rows } = await db.execute<{
    post_id: string
    publish: boolean
    score: number
    reason: string
    title: string | null
    judged_at: string
    preview: string
    impressions: number
  }>(sql`
    select d.post_id, d.publish, d.score, d.reason, d.title, d.judged_at,
           left(replace(p.text, E'\n', ' '), 90) as preview,
           (p.metrics->>'impression_count')::int as impressions
    from decisions d
    join posts p on p.id = d.post_id
    where d.reason not like 'gate:%'
    order by d.judged_at desc
    limit ${limit}
  `)
  return rows
}
