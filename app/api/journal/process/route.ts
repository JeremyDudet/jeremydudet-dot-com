import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { authorize } from '@/lib/cron'
import { matchAndMaybeJoin, processEntry } from '@/lib/process-entry'
import { unjudgedEntries, unmatchedEntries } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * The sweep: judge entries whose background processing died, then re-run
 * matches that silently failed. Normally finds nothing — capture's after()
 * handles the happy path and each capture drains stragglers itself.
 *
 * Three callers, same dual-auth pattern as /api/curate: the nightly tick
 * (CRON_SECRET), the Needs-you page when entries are still processing
 * (session), and a hand-run curl when debugging.
 *
 * Limits keep worst case inside the 60s Hobby cap: 3 judge+match runs plus
 * 2 match-only retries at ~5s per model call.
 */
export async function POST(req: Request) {
  const cronDenied = authorize(req)
  if (cronDenied) {
    try {
      await assertAdmin()
    } catch {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  let judged = 0
  let matched = 0
  let failed = 0

  for (const row of await unjudgedEntries({ limit: 3 })) {
    try {
      if (await processEntry(row, { spoken: row.spoken })) judged++
    } catch (err) {
      failed++
      console.error('[journal:process] judge failed', row.id, err)
    }
  }

  for (const row of await unmatchedEntries(2)) {
    try {
      await matchAndMaybeJoin({ id: row.id, body: row.body })
      matched++
    } catch (err) {
      failed++
      console.error('[journal:process] match failed', row.id, err)
    }
  }

  return NextResponse.json({ judged, matched, failed })
}
