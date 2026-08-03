import { NextResponse } from 'next/server'
import { authorize, failed } from '@/lib/cron'
import { SITE } from '@/lib/metadata'
import type { Cadence } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Runs the whole pipeline in one invocation: ingest → judge → publish →
 * whichever newsletters are due today.
 *
 * Exists because Vercel's Hobby plan allows two cron jobs at daily
 * granularity. On Pro, schedule the individual routes instead and delete this.
 */
export async function GET(req: Request) {
  const denied = authorize(req)
  if (denied) return denied

  // Always the public domain, never VERCEL_URL: deployment URLs sit behind
  // Vercel's SSO deployment protection, so tick's internal step calls were
  // 302'd to an auth wall and silently did nothing — the cron "ran" while
  // the pipeline stood still. The custom domain is the one open front door.
  const base = SITE.url

  try {
    const steps: Record<string, unknown> = {}

    for (const step of ['ingest', 'judge', 'publish', 'syndicate'] as const) {
      steps[step] = await run(`${base}/api/cron/${step}`)
    }

    for (const cadence of due(new Date())) {
      steps[`newsletter:${cadence}`] = await run(
        `${base}/api/cron/newsletter?cadence=${cadence}`,
      )
    }

    // Sunday: the librarian sweeps the Zettelkasten. Proposals only — the
    // review queue fills, the graph waits for taps.
    if (new Date().getUTCDay() === 0) {
      steps.maintain = await run(`${base}/api/maintain`, 'POST')
    }

    return NextResponse.json({ ok: true, steps })
  } catch (err) {
    return failed('tick', err)
  }
}

/** Which cadences fire today. Monday for weekly, the 1st for monthly. */
function due(now: Date): Cadence[] {
  const out: Cadence[] = ['daily']
  if (now.getUTCDay() === 1) out.push('weekly')
  if (now.getUTCDate() === 1) out.push('monthly')
  return out
}

/**
 * A failed step must not abort the ones after it — a Grok hiccup shouldn't
 * stop the newsletter going out.
 */
async function run(url: string, method: 'GET' | 'POST' = 'GET') {
  try {
    const res = await fetch(url, {
      method,
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    return { status: res.status, body: await res.json().catch(() => null) }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
