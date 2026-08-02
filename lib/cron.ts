import { NextResponse } from 'next/server'

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
