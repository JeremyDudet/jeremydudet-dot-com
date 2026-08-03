import { NextResponse, after } from 'next/server'
import { randomUUID } from 'node:crypto'
import { assertAdmin } from '@/lib/admin-auth'
import {
  decideRecommendation,
  recommendationById,
  reopenRecommendation,
} from '@/lib/curator'
import { distillFeedback, recordFeedback } from '@/lib/feedback'
import { createEntry_journal } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Action =
  | { action: 'dismiss'; feedback?: string; spoken?: boolean }
  | { action: 'use' }
  | { action: 'reopen' }
  | { action: 'adopt' }

/** Decide one recommendation. The user's override is final. */
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
  const body = (await req.json().catch(() => null)) as Action | null
  if (!body?.action) {
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }

  switch (body.action) {
    case 'use': {
      await decideRecommendation(id, 'used')
      return NextResponse.json({ ok: true })
    }

    case 'dismiss': {
      const rec = await recommendationById(id)
      if (!rec) {
        return NextResponse.json({ error: 'not found' }, { status: 404 })
      }
      await decideRecommendation(id, 'dismissed')

      const raw = body.feedback?.trim()
      if (!raw) return NextResponse.json({ ok: true })

      const feedbackId = await recordFeedback({
        subjectKind: 'recommendation',
        subjectId: id,
        entryId: rec.entryId,
        threadId: rec.threadId,
        raw,
        spoken: body.spoken === true,
      })
      after(async () => {
        try {
          await distillFeedback(feedbackId, `${rec.title}\n\n${rec.artifact}`)
        } catch (err) {
          console.error('[recommendations] distill failed', err)
        }
      })
      return NextResponse.json({ ok: true, feedbackId })
    }

    case 'reopen': {
      await reopenRecommendation(id)
      return NextResponse.json({ ok: true })
    }

    // Turn a draft-mode pick into an ordinary ready-to-post journal entry.
    // From here it flows through the one true publish path — claim, post,
    // record — instead of growing a parallel one.
    case 'adopt': {
      const rec = await recommendationById(id)
      if (!rec) {
        return NextResponse.json({ error: 'not found' }, { status: 404 })
      }
      if (rec.mode !== 'draft') {
        return NextResponse.json(
          { error: 'only drafts can be adopted — templates are yours to write' },
          { status: 400 },
        )
      }
      if (rec.status !== 'open') {
        return NextResponse.json({ error: 'no longer open' }, { status: 409 })
      }

      const entry = await createEntry_journal({
        id: randomUUID(),
        body: rec.artifact,
        sealed: false,
        status: 'judged',
        threadId: rec.threadId,
        verdict: 'post',
        score: Math.round(rec.score * 100) / 10,
        reason: `Adopted from the curator's pick: "${rec.title}"`,
        suggested: rec.artifact,
        judgedAt: new Date(),
        // Derived material — the matcher has nothing new to file.
        matchedAt: new Date(),
      })
      await decideRecommendation(id, 'used')
      return NextResponse.json({ ok: true, entryId: entry.id })
    }

    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }
}
