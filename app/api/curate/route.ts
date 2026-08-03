import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { authorize } from '@/lib/cron'
import { runCurator } from '@/lib/curator'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Run the curator on demand. Two callers, same pattern as /api/maintain:
 * the Settings button (session cookie) and the daily cron (CRON_SECRET).
 */
export async function POST(req: Request) {
  let trigger: 'manual' | 'cron' = 'cron'
  const cronDenied = authorize(req)
  if (cronDenied) {
    try {
      await assertAdmin()
      trigger = 'manual'
    } catch {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await runCurator(trigger)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[curate]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'curation failed' },
      { status: 502 },
    )
  }
}
