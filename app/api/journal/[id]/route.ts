import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { judgeEntry } from '@/lib/judge'
import { publish } from '@/lib/social'
import {
  claimForPosting,
  journalEntry,
  recordJournalPost,
  releasePostingClaim,
  saveEntryVerdict,
  setJournalStatus,
  upsertPosts,
} from '@/lib/db/queries'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Action =
  | { action: 'judge' }
  | { action: 'archive' }
  | { action: 'post'; text: string }

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const entry = await journalEntry(id)
  if (!entry) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const payload = (await req.json().catch(() => null)) as Action | null
  if (!payload) return NextResponse.json({ error: 'bad body' }, { status: 400 })

  switch (payload.action) {
    case 'judge': {
      if (entry.sealed) {
        return NextResponse.json(
          { error: 'entry is sealed and will not be sent to xAI' },
          { status: 400 },
        )
      }
      const verdict = await judgeEntry(entry.body)
      await saveEntryVerdict(id, verdict)
      return NextResponse.json({ entry: { ...entry, ...verdict, status: 'judged' } })
    }

    case 'archive': {
      await setJournalStatus(id, 'archived')
      return NextResponse.json({ ok: true })
    }

    case 'post': {
      const text = payload.text?.trim()
      if (!text) {
        return NextResponse.json({ error: 'empty text' }, { status: 400 })
      }
      if (entry.postId) {
        return NextResponse.json(
          { error: 'already posted', postId: entry.postId },
          { status: 409 },
        )
      }

      // Claim before sending. Two taps on a slow connection would otherwise
      // publish twice, and a duplicate post cannot be taken back.
      if (!(await claimForPosting(id))) {
        return NextResponse.json({ error: 'already in flight' }, { status: 409 })
      }

      try {
        const result = await publish({ text, idempotencyKey: id })
        const postId = result.remoteId
        await recordJournalPost(id, postId)

        // Seed the posts row directly. The entry originated here, so there's
        // nothing to ingest — this is what lets the blog judge pick it up on
        // the next run without a round trip to the X read API.
        await upsertPosts([
          {
            id: postId,
            conversationId: postId,
            text,
            createdAt: new Date(),
            isReply: false,
            isQuote: false,
            isRepost: false,
            isThreadRoot: false,
            threadLength: 1,
            media: [],
            metrics: {
              like_count: 0,
              reply_count: 0,
              retweet_count: 0,
              quote_count: 0,
              impression_count: 0,
              bookmark_count: 0,
            },
            metricsUpdatedAt: new Date(),
          },
        ])

        return NextResponse.json({ ok: true, postId })
      } catch (err) {
        await releasePostingClaim(id)
        const message = err instanceof Error ? err.message : String(err)
        return NextResponse.json({ error: message }, { status: 502 })
      }
    }

    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }
}
