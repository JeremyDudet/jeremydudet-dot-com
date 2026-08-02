import { NextResponse } from 'next/server'
import { authorize, failed } from '@/lib/cron'
import {
  LinkedInAuthExpired,
  daysUntilExpiry,
  postToFeed,
} from '@/lib/linkedin'
import { markSyndicated, pendingSyndications } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Sends approved cross-posts to LinkedIn.
 *
 * Gated by LINKEDIN_AUTO_POST. Unset, this route posts nothing and reports
 * what is waiting — approval happens in /admin. A LinkedIn post is public and
 * permanent, so full automation is opt-in rather than the default.
 */
export async function GET(req: Request) {
  const denied = authorize(req)
  if (denied) return denied

  // Dormant until cross-posting is programmatic. Social publishing is a single
  // output (lib/social.ts); LinkedIn is manual for now.
  if (process.env.CROSSPOST_LINKEDIN !== 'true') {
    return NextResponse.json({ mode: 'disabled' })
  }

  const auto = process.env.LINKEDIN_AUTO_POST === 'true'

  try {
    const days = await daysUntilExpiry()

    // Warn well before the 60-day token dies, since there is no refresh and
    // the failure mode is otherwise silent.
    if (days !== null && days <= 7) {
      console.warn(
        `[syndicate] LinkedIn token expires in ${days} day(s) — ` +
          `re-authorize with: npm run linkedin:auth`,
      )
    }

    const queue = await pendingSyndications('linkedin')

    if (!auto) {
      return NextResponse.json({
        mode: 'manual',
        waiting: queue.length,
        tokenExpiresInDays: days,
        note: 'Set LINKEDIN_AUTO_POST=true to send without approval.',
      })
    }

    const sent: object[] = []
    for (const item of queue) {
      try {
        const remoteId = await postToFeed(item.body)
        await markSyndicated(item.postId, 'linkedin', { remoteId })
        sent.push({ postId: item.postId, remoteId })
      } catch (err) {
        // An expired token fails every remaining item — stop rather than
        // burn through the queue marking everything failed.
        if (err instanceof LinkedInAuthExpired) {
          await markSyndicated(item.postId, 'linkedin', { error: err.message })
          return NextResponse.json(
            {
              error: 'linkedin_auth_expired',
              message: err.message,
              sent,
              remaining: queue.length - sent.length,
            },
            { status: 503 },
          )
        }

        const message = err instanceof Error ? err.message : String(err)
        await markSyndicated(item.postId, 'linkedin', { error: message })
        sent.push({ postId: item.postId, error: message })
      }
    }

    return NextResponse.json({
      mode: 'auto',
      sent: sent.length,
      results: sent,
      tokenExpiresInDays: days,
    })
  } catch (err) {
    return failed('syndicate', err)
  }
}
