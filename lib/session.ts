import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { SESSION_MAX_AGE } from '@/lib/cookies'

export { SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/cookies'

/**
 * Signed session tokens. `ADMIN_PASSWORD` doubles as the HMAC secret, so
 * changing it invalidates every outstanding session — that is the revoke-all
 * button, and it's why there's no session table to maintain.
 */
function secret() {
  const value = process.env.ADMIN_PASSWORD
  if (!value) throw new Error('ADMIN_PASSWORD is not set')
  return value
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function issueSession(): string {
  // issuedAt lets a token expire server-side even though the cookie carries
  // its own Max-Age — a copied cookie value can't outlive the window.
  const payload = `${Date.now()}.${randomBytes(12).toString('base64url')}`
  return `${payload}.${sign(payload)}`
}

export function verifySession(token: string | undefined): boolean {
  if (!token) return false

  const cut = token.lastIndexOf('.')
  if (cut < 1) return false

  const payload = token.slice(0, cut)
  const provided = token.slice(cut + 1)

  let expected: string
  try {
    expected = sign(payload)
  } catch {
    return false
  }

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false

  const issuedAt = Number(payload.split('.')[0])
  if (!Number.isFinite(issuedAt)) return false

  return Date.now() - issuedAt < SESSION_MAX_AGE * 1000
}

/**
 * Constant-time compare for the passcode itself. A plain `===` leaks length
 * and position through timing, which matters more here than usual: the
 * keyspace is only a million.
 */
export function passcodeMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSCODE
  if (!expected) throw new Error('ADMIN_PASSCODE is not set')

  const a = Buffer.from(input)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Bearer token for the iOS Shortcut. Shortcuts cannot hold a cookie, so voice
 * capture needs its own credential — deliberately write-only in scope: it
 * posts entries and nothing else.
 */
export function bearerTokenMatches(header: string | null): boolean {
  const expected = process.env.JOURNAL_API_TOKEN
  if (!expected || !header?.startsWith('Bearer ')) return false

  const a = Buffer.from(header.slice(7).trim())
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
