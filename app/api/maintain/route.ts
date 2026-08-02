import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { authorize } from '@/lib/cron'
import { runMaintenance } from '@/lib/librarian'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Run the librarian. Two callers: the Settings button (session cookie) and
 * the Sunday cron (CRON_SECRET) — accept either, reject everything else.
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

  try {
    const result = await runMaintenance()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[maintain]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'maintenance failed' },
      { status: 502 },
    )
  }
}
