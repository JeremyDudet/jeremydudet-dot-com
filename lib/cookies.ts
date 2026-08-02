/**
 * Deliberately dependency-free.
 *
 * `middleware.ts` runs on the edge runtime, where `node:crypto` cannot be
 * bundled. Importing `lib/session.ts` from middleware for this one string
 * drags crypto in and fails the build, so the shared constants live here and
 * both sides import from this file.
 */
export const SESSION_COOKIE = 'journal_session'

const MAX_AGE_DAYS = 90
export const SESSION_MAX_AGE = MAX_AGE_DAYS * 86_400
