import { NextResponse } from 'next/server'
import type { Cadence } from '@/lib/db/schema'

/**
 * Which newsletter cadences fire today. Monday for weekly, the 1st for
 * monthly. Pure — lives here rather than in the tick route so it can be
 * tested without pulling in the route module.
 */
export function due(now: Date): Cadence[] {
  const out: Cadence[] = ['daily']
  if (now.getUTCDay() === 1) out.push('weekly')
  if (now.getUTCDate() === 1) out.push('monthly')
  return out
}

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without this check
 * every route here is a public button that spends money.
 */
export function authorize(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) throw new Error('CRON_SECRET is not set')

  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return null
}

export function failed(where: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`[cron:${where}]`, err)
  return NextResponse.json({ error: message, where }, { status: 500 })
}
