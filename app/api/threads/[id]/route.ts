import { NextResponse, after } from 'next/server'
import { randomUUID } from 'node:crypto'
import { assertAdmin } from '@/lib/admin-auth'
import { db, journal } from '@/lib/db'
import {
  claimForHarvest,
  detachEntry,
  threadById,
  threadEntries,
  updateThread,
} from '@/lib/db/zettel'
import { composeEssay } from '@/lib/essay-writer'
import type { ThreadState } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'
// Harvest schedules the writer pass in after(), which runs on this same
// invocation — without the raised cap the model call is killed mid-sentence
// and every harvest degrades to the concatenation.
export const maxDuration = 60

type Action =
  | { action: 'update_summary'; summary: string }
  | { action: 'rename'; name: string }
  | { action: 'set_state'; state: ThreadState }
  | { action: 'detach'; entryId: string }
  | { action: 'harvest' }

/**
 * Human actions on a thread. These skip the proposal queue on purpose — the
 * queue gates the agents; you are the authority it defers to.
 */
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
  const thread = await threadById(id)
  if (!thread) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const body = (await req.json().catch(() => null)) as Action | null
  if (!body) return NextResponse.json({ error: 'bad body' }, { status: 400 })

  switch (body.action) {
    case 'update_summary': {
      if (!body.summary?.trim())
        return NextResponse.json({ error: 'empty summary' }, { status: 400 })
      await updateThread(id, { summary: body.summary.trim() })
      return NextResponse.json({ ok: true })
    }

    case 'rename': {
      if (!body.name?.trim())
        return NextResponse.json({ error: 'empty name' }, { status: 400 })
      await updateThread(id, { name: body.name.trim() })
      return NextResponse.json({ ok: true })
    }

    case 'set_state': {
      const valid: ThreadState[] = [
        'forming',
        'ripening',
        'ripe',
        'harvested',
        'abandoned',
      ]
      if (!valid.includes(body.state))
        return NextResponse.json({ error: 'bad state' }, { status: 400 })
      await updateThread(id, { state: body.state })
      return NextResponse.json({ ok: true })
    }

    case 'detach': {
      if (!body.entryId)
        return NextResponse.json({ error: 'missing entryId' }, { status: 400 })
      await detachEntry(body.entryId)
      return NextResponse.json({ ok: true })
    }

    case 'harvest': {
      // The state flip is the claim, taken before any work: harvesting now
      // costs a model call, so a double-tap must not buy two essays.
      if (!(await claimForHarvest(id))) {
        return NextResponse.json(
          { error: 'already harvested' },
          { status: 409 },
        )
      }

      // Assemble the raw material into a durable draft, seeded synchronously
      // as an 'essay' — a verdict only this action assigns, never a model —
      // so it surfaces on Needs-you as a reviewable essay card instead of
      // skipping the queue: long-form still deserves the same gates as
      // everything else.
      const members = await threadEntries(id)
      const draft = [
        thread.summary,
        '',
        '---',
        '',
        ...members.map((m) => m.body.trim()),
      ].join('\n')

      const draftId = randomUUID()
      try {
        await db.insert(journal).values({
          id: draftId,
          body: draft,
          sealed: false,
          status: 'judged',
          verdict: 'essay',
          score: 5,
          reason: `Harvested from thread "${thread.name}" — ${members.length} entries. Turn this into the long-form piece.`,
          suggested: draft,
          judgedAt: new Date(),
          // Born in a thread — nothing to match. Without this the matcher
          // sweep picks up the draft and can file the whole essay into
          // another thread.
          matchedAt: new Date(),
          threadId: id,
        })
      } catch (err) {
        // Give the claim back: a thread left 'harvested' with no draft is a
        // ripe idea with nowhere to go and no button to press.
        await updateThread(id, { state: thread.state })
        throw err
      }

      // The draft is durable now, so the response owes the model nothing.
      // composeEssay upgrades the concatenation into an essay in the
      // background; on failure the concatenation stands — visible in the
      // logs, invisible to him.
      after(async () => {
        try {
          await composeEssay(draftId)
        } catch (err) {
          console.error('[threads] essay compose failed', err)
        }
      })

      return NextResponse.json({ ok: true, draftId })
    }

    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }
}
