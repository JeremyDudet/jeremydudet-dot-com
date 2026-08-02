import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Liveness probe. Deliberately touches nothing external — it answers "is this
 * process serving?", not "is the database up", so a Neon blip can't be read as
 * the app being dead.
 */
export function GET() {
  return NextResponse.json({ ok: true, uptime: Math.round(process.uptime()) })
}
