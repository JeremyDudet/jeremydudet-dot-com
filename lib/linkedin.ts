import { eq } from 'drizzle-orm'
import { db, oauth } from '@/lib/db'

const API = 'https://api.linkedin.com'

/**
 * The versioned REST surface requires an explicit month. Bump deliberately —
 * LinkedIn sunsets versions on a schedule and a stale value starts 426ing.
 */
const VERSION = '202606'

export class LinkedInAuthExpired extends Error {
  constructor(public expiredAt: Date) {
    super(
      `LinkedIn token expired ${expiredAt.toISOString()}. ` +
        `Re-authorize with: npm run linkedin:auth`,
    )
    this.name = 'LinkedInAuthExpired'
  }
}

type Token = { accessToken: string; personUrn: string; expiresAt: Date }

/**
 * Self-serve apps (`w_member_social`) get a 60-day access token and **no
 * refresh token** — programmatic refresh is limited to approved Marketing
 * Developer Platform partners. So there is nothing to refresh here: when it
 * expires a human must re-run the auth flow. Failing loudly is the whole point.
 */
async function token(): Promise<Token> {
  const [row] = await db
    .select()
    .from(oauth)
    .where(eq(oauth.id, 'linkedin'))
    .limit(1)

  if (!row) {
    throw new Error('No LinkedIn oauth row. Run: npm run linkedin:auth')
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    throw new LinkedInAuthExpired(row.expiresAt)
  }
  if (!row.subject) {
    throw new Error('LinkedIn oauth row is missing the person URN. Re-run auth.')
  }

  return {
    accessToken: row.accessToken,
    personUrn: row.subject,
    expiresAt: row.expiresAt,
  }
}

/** Days until re-authorization is required. Surfaced in /admin. */
export async function daysUntilExpiry(): Promise<number | null> {
  const [row] = await db
    .select({ expiresAt: oauth.expiresAt })
    .from(oauth)
    .where(eq(oauth.id, 'linkedin'))
    .limit(1)

  if (!row) return null
  return Math.floor((row.expiresAt.getTime() - Date.now()) / 86_400_000)
}

/**
 * Publish a text post to the authenticated member's feed.
 * Returns the post URN (urn:li:share:... or urn:li:ugcPost:...).
 */
export async function postToFeed(body: string): Promise<string> {
  const { accessToken, personUrn } = await token()

  const res = await fetch(`${API}/rest/posts`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': VERSION,
    },
    body: JSON.stringify({
      author: personUrn,
      commentary: escapeCommentary(body),
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    if (res.status === 401) {
      throw new LinkedInAuthExpired(new Date())
    }
    throw new Error(`LinkedIn post failed: ${res.status} ${detail}`)
  }

  // The created post's URN comes back in a header, not the body.
  const urn = res.headers.get('x-restli-id')
  if (!urn) throw new Error('LinkedIn returned no x-restli-id')
  return urn
}

/**
 * LinkedIn's "little text format" treats these as markup. An unescaped `(` in
 * a normal sentence is enough to get the whole post rejected, so escape them
 * all rather than trying to be clever about which are safe.
 */
export function escapeCommentary(text: string) {
  return text.replace(/[\\<>@[\]()|{}~_*#]/g, (ch) => `\\${ch}`)
}

/**
 * Adapt post text for LinkedIn. Grok rewrites the substance; this handles the
 * mechanical things it shouldn't have to think about.
 */
export function sanitizeForLinkedIn(text: string) {
  return text
    // X handles don't resolve on LinkedIn — "@levelsio" renders as dead text.
    .replace(/@([A-Za-z0-9_]{1,15})\b/g, '$1')
    // A trailing t.co link is nearly always the self-quote of the post itself.
    .replace(/\s*https?:\/\/t\.co\/\S+\s*$/g, '')
    .trim()
}
