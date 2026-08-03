import { NextResponse, after } from 'next/server'
import { randomUUID } from 'node:crypto'
import { assertAdmin, assertCanCapture } from '@/lib/admin-auth'
import {
  drainStragglers,
  processAnswer,
  processEntry,
} from '@/lib/process-entry'
import { markAnswered, questionById } from '@/lib/db/questions'
import { createEntry_journal, journalEntry, recentJournal } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const entries = await recentJournal(30)
  return NextResponse.json({ entries })
}

/**
 * Capture an entry. The app gets an instant "submitted" — judging and
 * matching run after the response. The Shortcut waits (briefly) because Siri
 * speaks the verdict back.
 *
 * `clientId` makes the write idempotent: a flaky phone connection that retries
 * must not create two entries. The client generates a UUID once per compose.
 */
export async function POST(req: Request) {
  // Capture accepts the Shortcut's bearer token as well as a session, so
  // "Hey Siri, journal" works from the car. GET above still requires a full
  // session — the token can write but never read the archive back.
  let cred: 'session' | 'token'
  try {
    cred = await assertCanCapture()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const payload = (await req.json().catch(() => null)) as {
    body?: string
    sealed?: boolean
    clientId?: string
    spoken?: boolean
    questionId?: string
  } | null

  const body = payload?.body?.trim()
  if (!body) {
    return NextResponse.json({ error: 'empty entry' }, { status: 400 })
  }

  const sealed = payload?.sealed === true
  const spoken = payload?.spoken === true
  const id = payload?.clientId || randomUUID()

  // Answering a follow-up question? A stale or already-closed question must
  // never lose the writing — the dump degrades to an ordinary entry instead.
  const question = payload?.questionId
    ? await questionById(payload.questionId)
    : undefined
  if (question?.status === 'open') {
    const root = await journalEntry(question.entryId)
    const entry = await createEntry_journal({
      id,
      body,
      sealed,
      spoken,
      // Filed, not queued: the action lives on the re-judged root, so the
      // answer must never become its own card.
      status: 'archived',
      threadId: question.threadId ?? root?.threadId ?? null,
      // Derived material — the matcher has nothing separate to file.
      matchedAt: new Date(),
    })
    await markAnswered(question.id, entry.id)

    // Sealed answers still resolve the question, but the content can't go to
    // the model — the root simply stays where it was.
    if (!sealed) {
      after(async () => {
        try {
          await processAnswer(question.id)
        } catch (err) {
          console.error('[journal] answer processing failed', err)
        }
      })
    }
    return NextResponse.json({ entry, submitted: true, answered: true })
  }

  const entry = await createEntry_journal({
    id,
    body,
    sealed,
    spoken,
    status: sealed ? 'archived' : 'unjudged',
  })

  // A sealed entry never touches the xAI API. That's the whole guarantee —
  // judging a thought requires sending it to a third party.
  if (sealed) {
    return NextResponse.json({ entry, judged: false })
  }

  // Shortcut path: Siri speaks entry.reason back, so wait for the verdict —
  // but never past 20s. On timeout the response carries a holding line while
  // processing finishes in after(); the entry is safe either way.
  if (cred === 'token') {
    const processing = processEntry(entry, { spoken }).catch((err) => {
      console.error('[journal] processing failed', err)
      return null
    })
    after(() => processing)

    const verdict = await Promise.race([processing, wait(20_000)])
    if (verdict) {
      return NextResponse.json({
        entry: { ...entry, ...verdict, status: 'judged' },
      })
    }
    return NextResponse.json({
      entry: { ...entry, reason: 'Saved — still thinking it over.' },
      judged: false,
    })
  }

  // App path: respond now, process after. Each capture also drains earlier
  // entries whose after() died, so a bursty session heals itself.
  after(async () => {
    try {
      await processEntry(entry, { spoken })
    } catch (err) {
      console.error('[journal] processing failed', err)
    }
    await drainStragglers(entry.id).catch((err) =>
      console.error('[journal] drain failed', err),
    )
  })

  return NextResponse.json({ entry, submitted: true })
}

function wait(ms: number): Promise<null> {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms))
}
