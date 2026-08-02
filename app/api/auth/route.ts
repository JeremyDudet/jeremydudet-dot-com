import { NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  issueSession,
  passcodeMatches,
} from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * A 6-digit passcode is only a million combinations, so it needs throttling to
 * be worth anything. In-memory is adequate here: this runs as a single-user
 * app, and a serverless cold start resetting the counter still leaves the
 * fixed delay below, which is what actually bounds the attempt rate.
 */
const attempts = new Map<string, { count: number; first: number }>()
const WINDOW_MS = 15 * 60_000
const MAX_ATTEMPTS = 10

function throttled(ip: string) {
  const now = Date.now()
  const rec = attempts.get(ip)

  if (!rec || now - rec.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: now })
    return false
  }

  rec.count++
  return rec.count > MAX_ATTEMPTS
}

export async function POST(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'

  if (throttled(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Wait 15 minutes.' },
      { status: 429 },
    )
  }

  const { passcode } = ((await req.json().catch(() => null)) ?? {}) as {
    passcode?: string
  }

  // Fixed delay on every attempt, not just failures — a fast success followed
  // by slow failures would otherwise be an oracle in itself.
  await new Promise((r) => setTimeout(r, 700))

  if (!passcode || !passcodeMatches(passcode)) {
    return NextResponse.json({ error: 'Wrong passcode' }, { status: 401 })
  }

  attempts.delete(ip)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, issueSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
