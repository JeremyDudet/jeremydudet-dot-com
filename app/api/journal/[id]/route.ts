import { NextResponse, after } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { judgeEntry } from '@/lib/judge'
import { extractTitle } from '@/lib/markdown'
import { maybeAskQuestion } from '@/lib/process-entry'
import { publish } from '@/lib/social'
import { threadById } from '@/lib/db/zettel'
import {
  deleteFeedback,
  distillFeedback,
  feedbackFor,
  recordFeedback,
} from '@/lib/feedback'
import {
  claimForPosting,
  createEssayEntry,
  journalEntry,
  recordJournalPost,
  releasePostingClaim,
  saveDraft,
  saveEntryVerdict,
  setJournalStatus,
  upsertPosts,
} from '@/lib/db/queries'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Action =
  | { action: 'judge' }
  | { action: 'archive' }
  | { action: 'reject'; feedback?: string; spoken?: boolean }
  | { action: 'restore'; feedbackId?: string }
  | { action: 'save_draft'; text: string }
  | { action: 'post'; text: string }
  | { action: 'publish_essay'; text: string }

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
      // The 'essay' verdict is assigned by the harvest action alone — the
      // judge's output enum can't produce it, so a re-judge here would
      // silently overwrite the marker and drop the draft from its queue.
      if (entry.verdict === 'essay') {
        return NextResponse.json(
          { error: 'essay drafts are not re-judged' },
          { status: 400 },
        )
      }
      const feedback = await feedbackFor('judge').catch(() => [])
      const verdict = await judgeEntry(entry.body, {
        spoken: entry.spoken,
        feedback,
      })
      await saveEntryVerdict(id, verdict)
      await maybeAskQuestion(entry, verdict)
      return NextResponse.json({ entry: { ...entry, ...verdict, status: 'judged' } })
    }

    case 'archive': {
      await setJournalStatus(id, 'archived')
      return NextResponse.json({ ok: true })
    }

    // Reject a share proposal, optionally teaching the system why. The raw
    // feedback lands synchronously; distillation runs after the response so
    // rejecting feels like submitting.
    case 'reject': {
      await setJournalStatus(id, 'archived')

      const raw = payload.feedback?.trim()
      if (!raw) return NextResponse.json({ ok: true })

      const feedbackId = await recordFeedback({
        subjectKind: 'entry',
        subjectId: id,
        entryId: id,
        threadId: entry.threadId,
        raw,
        spoken: payload.spoken === true,
      })
      after(async () => {
        try {
          await distillFeedback(feedbackId, entry.suggested ?? entry.body)
        } catch (err) {
          console.error('[journal] distill failed', err)
        }
      })
      return NextResponse.json({ ok: true, feedbackId })
    }

    // Undo a reject. The retracted feedback row goes with it — an oops must
    // not teach the system anything.
    case 'restore': {
      if (entry.postId) {
        return NextResponse.json({ error: 'already posted' }, { status: 409 })
      }
      await setJournalStatus(id, 'judged')
      if (payload.feedbackId) {
        await deleteFeedback(payload.feedbackId).catch(() => null)
      }
      return NextResponse.json({ ok: true })
    }

    // Persist a refined draft so editing survives the app being backgrounded.
    // `suggested` is the draft-to-post field; the original body is untouched.
    case 'save_draft': {
      const text = payload.text?.trim()
      if (!text) {
        return NextResponse.json({ error: 'empty text' }, { status: 400 })
      }
      if (entry.postId) {
        return NextResponse.json({ error: 'already posted' }, { status: 409 })
      }
      await saveDraft(id, text)
      return NextResponse.json({ ok: true })
    }

    case 'post': {
      // Essay drafts publish to the blog, never to X — tweeting a multi-week
      // markdown draft would be a category error. After publish the claim's
      // status flip already 409s this; the guard blocks a hand-crafted call
      // before publish too.
      if (entry.verdict === 'essay') {
        return NextResponse.json(
          { error: 'essay drafts publish to the blog, not X' },
          { status: 400 },
        )
      }
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

        // The positive half of the taste loop: what he changed before
        // publishing reveals taste the way a rejection does. Publishing
        // as-is records nothing — that would just be noise.
        const draft = (entry.suggested ?? entry.body).trim()
        if (text !== draft) {
          after(async () => {
            try {
              const feedbackId = await recordFeedback({
                subjectKind: 'entry',
                subjectId: id,
                entryId: id,
                threadId: entry.threadId,
                raw: text,
                sentiment: 'positive',
              })
              await distillFeedback(feedbackId, draft)
            } catch (err) {
              console.error('[journal] edit-delta feedback failed', err)
            }
          })
        }

        return NextResponse.json({ ok: true, postId })
      } catch (err) {
        await releasePostingClaim(id)
        const message = err instanceof Error ? err.message : String(err)
        return NextResponse.json({ error: message }, { status: 502 })
      }
    }

    // Publish a harvested essay straight to the blog's pending queue. No X
    // round-trip and no blog judge (a filter for tweets) — but never past the
    // human: the entry still rides the existing pending → approved → cron
    // `published` promotion, so this tap is not the tap that ships it.
    case 'publish_essay': {
      if (entry.verdict !== 'essay') {
        return NextResponse.json(
          { error: 'only essay drafts publish to the blog' },
          { status: 400 },
        )
      }
      const text = payload.text?.trim()
      if (!text) {
        return NextResponse.json({ error: 'empty text' }, { status: 400 })
      }

      // Claim before creating the entry. Two taps on a slow connection must
      // not seed two pending blog entries — same idiom as posting to X.
      if (!(await claimForPosting(id))) {
        return NextResponse.json({ error: 'already in flight' }, { status: 409 })
      }

      try {
        // The title lives in the draft itself: its first `# ` heading, with
        // the thread name as the fallback the writer pass also uses.
        const thread = entry.threadId
          ? await threadById(entry.threadId)
          : undefined
        const title = extractTitle(text) ?? thread?.name ?? 'Untitled essay'
        const slug = await createEssayEntry({ title, body: text })

        // The journal row stays status 'posted' with postId null — "posted"
        // stretches to mean "shipped"; the entries row is the real record.

        // The positive half of the taste loop, same as the X post path: what
        // he changed before publishing reveals taste the way a rejection does.
        const draft = (entry.suggested ?? entry.body).trim()
        if (text !== draft) {
          after(async () => {
            try {
              const feedbackId = await recordFeedback({
                subjectKind: 'entry',
                subjectId: id,
                entryId: id,
                threadId: entry.threadId,
                raw: text,
                sentiment: 'positive',
              })
              await distillFeedback(feedbackId, draft)
            } catch (err) {
              console.error('[journal] edit-delta feedback failed', err)
            }
          })
        }

        return NextResponse.json({ ok: true, slug })
      } catch (err) {
        await releasePostingClaim(id)
        const message = err instanceof Error ? err.message : String(err)
        return NextResponse.json({ error: message }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }
}
