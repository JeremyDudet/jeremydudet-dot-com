import { cookies, headers } from 'next/headers'
import { SESSION_COOKIE, bearerTokenMatches, verifySession } from '@/lib/session'

/**
 * Defence in depth. `middleware.ts` gates these routes, but Next has a
 * recurring class of middleware-bypass advisories and server actions are POST
 * endpoints reachable on their own — so anything that reads or mutates private
 * state verifies the credential itself rather than trusting the edge.
 */
export async function assertAdmin() {
  const jar = await cookies()
  if (verifySession(jar.get(SESSION_COOKIE)?.value)) return

  throw new Error('unauthorized')
}

/**
 * Looser gate for entry *capture* only: a full session, or the Shortcut's
 * bearer token. Never use this for anything that reads the journal back —
 * a phone lost with the Shortcut installed should leak write access, not the
 * archive.
 */
export async function assertCanCapture() {
  const jar = await cookies()
  if (verifySession(jar.get(SESSION_COOKIE)?.value)) return

  const auth = (await headers()).get('authorization')
  if (bearerTokenMatches(auth)) return

  throw new Error('unauthorized')
}
