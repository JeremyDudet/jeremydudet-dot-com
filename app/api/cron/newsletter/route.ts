import { NextResponse } from 'next/server'
import { authorize, failed } from '@/lib/cron'
import { PostEmail } from '@/emails/PostEmail'
import type { EmailEntry } from '@/emails/PostEmail'
import { emailProvider, sendMail } from '@/lib/email'
import { activeSubscribers, issueExists, recordIssue, unsentEntries } from '@/lib/db/queries'
import { SITE } from '@/lib/metadata'
import { excerpt } from '@/lib/tweet-text'
import type { Cadence } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CADENCES: Cadence[] = ['daily', 'weekly', 'monthly']

export async function GET(req: Request) {
  const denied = authorize(req)
  if (denied) return denied

  const cadence = new URL(req.url).searchParams.get('cadence') as Cadence | null
  if (!cadence || !CADENCES.includes(cadence)) {
    return NextResponse.json(
      { error: `cadence must be one of ${CADENCES.join(', ')}` },
      { status: 400 },
    )
  }

  try {
    // Idempotency key: one issue per cadence per day, so a cron retry or a
    // double-fire can never mail the same posts twice.
    const issueId = `${cadence}-${new Date().toISOString().slice(0, 10)}`
    if (await issueExists(issueId)) {
      return NextResponse.json({ skipped: 'already sent', issueId })
    }

    const entries = await unsentEntries(cadence)
    if (!entries.length) {
      return NextResponse.json({ skipped: 'nothing new', cadence })
    }

    const recipients = await activeSubscribers(cadence)
    if (!recipients.length) {
      // Still record the issue — these posts are "sent" for this cadence, so a
      // later subscriber doesn't get a backlog dump.
      await recordIssue({
        id: issueId,
        cadence,
        slugs: entries.map((e) => e.slug),
        recipientCount: 0,
      })
      return NextResponse.json({ skipped: 'no subscribers', cadence })
    }

    // Claim the issue before sending. If the send half-fails we'd rather drop
    // an issue than mail it twice.
    const claimed = await recordIssue({
      id: issueId,
      cadence,
      slugs: entries.map((e) => e.slug),
      recipientCount: recipients.length,
    })
    if (!claimed) {
      return NextResponse.json({ skipped: 'raced', issueId })
    }

    // An essay's body opens with its markdown title heading, so its first
    // line as a subject would literally read "# ...". Essays announce
    // themselves by title; posts still lead with their own opening line.
    const subject =
      entries.length === 1
        ? entries[0].source === 'harvest'
          ? excerpt(entries[0].title, 80)
          : excerpt(entries[0].body, 80)
        : `${entries.length} new posts`

    const payload: EmailEntry[] = entries.map((e) => ({
      slug: e.slug,
      title: e.title,
      body: e.body,
      source: e.source,
      postId: e.postId,
      postedAt: e.postedAt,
      media: e.media,
    }))

    // Chunk to whatever the configured provider can take in one call —
    // Resend batches 100, SES sends one at a time.
    const provider = emailProvider()
    let sent = 0
    for (let i = 0; i < recipients.length; i += provider.batchSize) {
      const batch = recipients.slice(i, i + provider.batchSize)
      const unsubscribe = (token: string) =>
        `${SITE.url}/api/unsubscribe?token=${token}`

      await sendMail(
        batch.map((sub) => ({
          to: sub.email,
          subject,
          react: PostEmail({
            entries: payload,
            unsubscribeUrl: unsubscribe(sub.token),
          }),
          unsubscribeUrl: unsubscribe(sub.token),
        })),
      )
      sent += batch.length
    }

    return NextResponse.json({
      issueId,
      cadence,
      sent,
      provider: provider.name,
      slugs: entries.map((e) => e.slug),
    })
  } catch (err) {
    return failed('newsletter', err)
  }
}
