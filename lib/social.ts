import { publishPost as publishToX } from '@/lib/x'

/**
 * "Publish to social" as one output.
 *
 * Today the only provider is X, posting directly. Later this becomes a
 * scheduling / cross-posting tool (Buffer, Typefully, Postiz, an MCP server,
 * a CLI) that fans out to several networks at once. Callers ask for a post to
 * go out; they never name a network.
 *
 * `networks` and `scheduleAt` are in the request shape from the start even
 * though the X provider ignores them — every scheduler takes those two, and
 * widening the interface later would mean touching every call site.
 */
export type SocialRequest = {
  text: string
  /** Which networks to publish to. Omit for the provider's default. */
  networks?: string[]
  /** Publish later rather than now. Ignored by providers that can't schedule. */
  scheduleAt?: Date
  /** Ties a post back to the journal entry that produced it. */
  idempotencyKey?: string
}

export type SocialResult = {
  provider: string
  /** Provider-side id — an X post id today, a scheduler job id later. */
  remoteId: string
  /** Public permalink, when the provider can give one at publish time. */
  url?: string
  /** False when the provider queued it rather than posting immediately. */
  live: boolean
}

export interface SocialProvider {
  readonly name: string
  readonly capabilities: {
    schedule: boolean
    multiNetwork: boolean
  }
  publish(req: SocialRequest): Promise<SocialResult>
}

const HANDLE = 'jeremyfdudet'

/** Direct to X. No scheduling, no fan-out — it posts, immediately. */
const xProvider: SocialProvider = {
  name: 'x',
  capabilities: { schedule: false, multiNetwork: false },

  async publish(req) {
    if (req.scheduleAt) {
      throw new Error(
        'The X provider cannot schedule. Post now, or configure a scheduling provider.',
      )
    }
    if (req.networks?.some((n) => n !== 'x')) {
      throw new Error(
        `The X provider only posts to X. Requested: ${req.networks.join(', ')}. ` +
          `Cross-posting needs a scheduling provider.`,
      )
    }

    const id = await publishToX(req.text)
    return {
      provider: 'x',
      remoteId: id,
      url: `https://x.com/${HANDLE}/status/${id}`,
      live: true,
    }
  },
}

/**
 * Late (getlate.dev — docs now at docs.zernio.com). Fans out to X, LinkedIn
 * personal profiles, and others through one call, and holds the OAuth for each
 * network so there's no per-platform token to maintain here.
 *
 * Accounts come from LATE_ACCOUNTS as `platform:accountId` pairs:
 *   LATE_ACCOUNTS=twitter:acc_abc,linkedin:acc_def
 */
const lateProvider: SocialProvider = {
  name: 'late',
  capabilities: { schedule: true, multiNetwork: true },

  async publish(req) {
    const key = process.env.LATE_API_KEY
    if (!key) throw new Error('LATE_API_KEY is not set')

    const accounts = parseAccounts(process.env.LATE_ACCOUNTS)
    if (!accounts.length) {
      throw new Error(
        'LATE_ACCOUNTS is empty. Set it to e.g. "twitter:acc_abc,linkedin:acc_def".',
      )
    }

    const wanted = req.networks
      ? accounts.filter((a) => req.networks!.includes(a.platform))
      : accounts

    if (!wanted.length) {
      throw new Error(
        `No connected account matches ${req.networks?.join(', ')}. ` +
          `Configured: ${accounts.map((a) => a.platform).join(', ')}`,
      )
    }

    // Configurable because they're mid-rebrand: docs.getlate.dev now redirects
    // to docs.zernio.com, and both API hosts currently serve the same app.
    const base = process.env.LATE_API_BASE ?? 'https://getlate.dev/api/v1'

    const res = await fetch(`${base}/posts`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        // Late dedupes on this for 5 minutes, and on a content hash for 24h.
        // A retried publish returns 409 rather than posting twice.
        ...(req.idempotencyKey ? { 'x-request-id': req.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        content: req.text,
        platforms: wanted.map((a) => ({
          platform: a.platform,
          accountId: a.accountId,
        })),
        ...(req.scheduleAt
          ? { scheduledFor: req.scheduleAt.toISOString() }
          : { publishNow: true }),
      }),
    })

    // 409 means Late already has this post — treat a retry as success, since
    // the caller's intent (this text is published) is satisfied.
    if (res.status === 409) {
      return {
        provider: 'late',
        remoteId: req.idempotencyKey ?? 'duplicate',
        live: true,
      }
    }

    if (!res.ok) {
      throw new Error(`Late publish failed: ${res.status} ${await res.text()}`)
    }

    const json = (await res.json()) as {
      _id?: string
      status?: string
      platforms?: { platformPostUrl?: string; status?: string }[]
    }

    return {
      provider: 'late',
      remoteId: json._id ?? '',
      url: json.platforms?.find((p) => p.platformPostUrl)?.platformPostUrl,
      live: !req.scheduleAt,
    }
  },
}

function parseAccounts(raw: string | undefined) {
  return (raw ?? '')
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [platform, accountId] = pair.split(':')
      return { platform: platform?.trim(), accountId: accountId?.trim() }
    })
    .filter(
      (a): a is { platform: string; accountId: string } =>
        Boolean(a.platform) && Boolean(a.accountId),
    )
}

const PROVIDERS: Record<string, SocialProvider> = {
  x: xProvider,
  late: lateProvider,
}

export function socialProvider(): SocialProvider {
  const name = process.env.SOCIAL_PROVIDER ?? 'x'
  const provider = PROVIDERS[name]
  if (!provider) {
    throw new Error(
      `Unknown SOCIAL_PROVIDER "${name}". Available: ${Object.keys(PROVIDERS).join(', ')}`,
    )
  }
  return provider
}

/** The single output. Call this; don't reach for a network directly. */
export function publish(req: SocialRequest): Promise<SocialResult> {
  return socialProvider().publish(req)
}
