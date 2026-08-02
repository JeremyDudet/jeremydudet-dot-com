import { eq } from 'drizzle-orm'
import { db, oauth } from '@/lib/db'
import type { Media, Metrics } from '@/lib/db/schema'

const API = 'https://api.x.com/2'
const TOKEN_URL = 'https://api.x.com/2/oauth2/token'

/**
 * X rotates the refresh token on every exchange, so the live one has to be
 * persisted. Seed the row once with `pnpm x:auth`, then this keeps it fresh.
 */
async function accessToken(): Promise<string> {
  const [row] = await db.select().from(oauth).where(eq(oauth.id, 'x')).limit(1)
  if (!row) {
    throw new Error('No X oauth row. Run the auth script to seed it.')
  }

  // 60s of slack so a token never expires mid-run
  if (row.expiresAt.getTime() - 60_000 > Date.now()) {
    return row.accessToken
  }

  // The column is nullable because LinkedIn self-serve apps have no refresh
  // token; X always does, so a null here means the row was seeded wrong.
  if (!row.refreshToken) {
    throw new Error('X oauth row has no refresh token. Re-run: npm run x:auth')
  }

  const basic = Buffer.from(
    `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`,
  ).toString('base64')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: row.refreshToken,
    }),
  })

  if (!res.ok) {
    throw new Error(`X token refresh failed: ${res.status} ${await res.text()}`)
  }

  const json = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  await db
    .update(oauth)
    .set({
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: new Date(Date.now() + json.expires_in * 1000),
    })
    .where(eq(oauth.id, 'x'))

  return json.access_token
}

async function get<T>(path: string, params: Record<string, string>) {
  const token = await accessToken()
  const url = `${API}${path}?${new URLSearchParams(params)}`
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    throw new Error(`X ${path} failed: ${res.status} ${await res.text()}`)
  }
  return (await res.json()) as T
}

type RawPost = {
  id: string
  text: string
  created_at: string
  conversation_id: string
  public_metrics: Metrics
  note_tweet?: { text: string }
  referenced_tweets?: { type: 'replied_to' | 'quoted' | 'retweeted'; id: string }[]
  attachments?: { media_keys: string[] }
  in_reply_to_user_id?: string
}

type RawMedia = {
  media_key: string
  type: Media['type']
  url?: string
  preview_image_url?: string
  width: number
  height: number
  alt_text?: string
}

export type IngestedPost = {
  id: string
  conversationId: string
  text: string
  createdAt: Date
  isReply: boolean
  isQuote: boolean
  isRepost: boolean
  media: (Omit<Media, 'url'> & { sourceUrl: string })[]
  metrics: Metrics
}

/**
 * Fetch my own recent posts. These bill as "owned reads" ($0.001/resource)
 * rather than standard post reads ($0.005) because the authenticated user is
 * the app owner — verify that in the console on the first real run.
 */
export async function fetchMyPosts(opts: {
  sinceId?: string
  max?: number
}): Promise<IngestedPost[]> {
  const userId = process.env.X_USER_ID
  if (!userId) throw new Error('X_USER_ID is not set')

  const params: Record<string, string> = {
    max_results: String(Math.min(opts.max ?? 100, 100)),
    'tweet.fields':
      'created_at,conversation_id,public_metrics,note_tweet,referenced_tweets,attachments,in_reply_to_user_id',
    'media.fields': 'url,preview_image_url,width,height,alt_text,type',
    expansions: 'attachments.media_keys',
  }
  if (opts.sinceId) params.since_id = opts.sinceId

  const json = await get<{
    data?: RawPost[]
    includes?: { media?: RawMedia[] }
  }>(`/users/${userId}/tweets`, params)

  const mediaByKey = new Map(
    (json.includes?.media ?? []).map((m) => [m.media_key, m]),
  )

  return (json.data ?? []).map((raw) => {
    const refs = raw.referenced_tweets ?? []
    return {
      id: raw.id,
      conversationId: raw.conversation_id,
      // Long-form posts truncate `text` at 280 chars and put the real body in
      // note_tweet. Missing this silently guts every post worth publishing.
      text: raw.note_tweet?.text ?? raw.text,
      createdAt: new Date(raw.created_at),
      isReply: refs.some((r) => r.type === 'replied_to'),
      isQuote: refs.some((r) => r.type === 'quoted'),
      isRepost: refs.some((r) => r.type === 'retweeted'),
      metrics: raw.public_metrics,
      media: (raw.attachments?.media_keys ?? [])
        .map((k) => mediaByKey.get(k))
        .filter((m): m is RawMedia => Boolean(m))
        .map((m) => ({
          key: m.media_key,
          type: m.type,
          sourceUrl: m.url ?? m.preview_image_url ?? '',
          width: m.width,
          height: m.height,
          alt: m.alt_text ?? null,
        })),
    } as IngestedPost
  })
}

/**
 * Publish a post. Requires the `tweet.write` scope — if x:auth was run before
 * that scope was added, this 403s and the fix is re-running it.
 *
 * Billing: $0.015 per post, or $0.200 if the text contains a URL. That 13x
 * jump is worth designing around, not discovering later.
 */
export async function publishPost(text: string): Promise<string> {
  const token = await accessToken()

  const res = await fetch(`${API}/tweets`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  const json = (await res.json()) as {
    data?: { id: string }
    detail?: string
    title?: string
  }

  if (!res.ok || !json.data?.id) {
    const why = json.detail ?? json.title ?? JSON.stringify(json)
    if (res.status === 403) {
      throw new Error(
        `X rejected the post (403): ${why}. ` +
          `If this mentions scope, re-run: npm run x:auth`,
      )
    }
    throw new Error(`X post failed: ${res.status} ${why}`)
  }

  return json.data.id
}

/** Refresh metrics for specific posts — the T+24h/T+72h engagement re-read. */
export async function fetchMetrics(
  ids: string[],
): Promise<Map<string, Metrics>> {
  const out = new Map<string, Metrics>()

  // /2/tweets caps at 100 ids per call
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100)
    const json = await get<{ data?: RawPost[] }>('/tweets', {
      ids: batch.join(','),
      'tweet.fields': 'public_metrics',
    })
    for (const p of json.data ?? []) out.set(p.id, p.public_metrics)
  }

  return out
}
