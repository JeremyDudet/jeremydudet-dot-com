import { NextResponse, after } from 'next/server'
import { runCurator } from '@/lib/curator'
import { randomUUID } from 'node:crypto'
import { assertAdmin, assertCanCapture } from '@/lib/admin-auth'
import { judgeEntry } from '@/lib/judge'
import { matchEntry } from '@/lib/librarian'
import {
  createEntry_journal,
  recentJournal,
  saveEntryVerdict,
} from '@/lib/db/queries'

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
 * Capture an entry, and judge it unless sealed.
 *
 * `clientId` makes the write idempotent: a flaky phone connection that retries
 * must not create two entries. The client generates a UUID once per compose.
 */
export async function POST(req: Request) {
  // Capture accepts the Shortcut's bearer token as well as a session, so
  // "Hey Siri, journal" works from the car. GET above still requires a full
  // session — the token can write but never read the archive back.
  try {
    await assertCanCapture()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const payload = (await req.json().catch(() => null)) as {
    body?: string
    sealed?: boolean
    clientId?: string
    spoken?: boolean
  } | null

  const body = payload?.body?.trim()
  if (!body) {
    return NextResponse.json({ error: 'empty entry' }, { status: 400 })
  }

  const sealed = payload?.sealed === true
  const id = payload?.clientId || randomUUID()

  const entry = await createEntry_journal({
    id,
    body,
    sealed,
    status: sealed ? 'archived' : 'unjudged',
  })

  // A sealed entry never touches the xAI API. That's the whole guarantee —
  // judging a thought requires sending it to a third party.
  if (sealed) {
    return NextResponse.json({ entry, judged: false })
  }

  try {
    const verdict = await judgeEntry(body, { spoken: payload?.spoken === true })
    await saveEntryVerdict(id, verdict)

    // Zettelkasten matcher: does this thought feed an existing idea? Only
    // ever *proposes* — the graph moves when a human accepts, in Review.
    // A matcher failure must not break capture; the entry is already saved.
    try {
      await matchEntry({ id, body })
    } catch (err) {
      console.error('[journal] matcher failed', err)
    }

    // The curator re-reads the whole corpus after every entry — but after the
    // response, so capture stays fast. Recommendations land in Review and on
    // the Write tab moments later.
    after(async () => {
      try {
        await runCurator('entry')
      } catch (err) {
        console.error('[journal] curator failed', err)
      }
    })
    return NextResponse.json({ entry: { ...entry, ...verdict, status: 'judged' } })
  } catch (err) {
    // The entry is already saved — a judge failure must never lose writing.
    console.error('[journal] judge failed', err)
    return NextResponse.json({
      entry,
      judged: false,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
