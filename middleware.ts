import { NextResponse, type NextRequest } from 'next/server'
// From lib/cookies, not lib/session — the latter imports node:crypto, which
// cannot be bundled for the edge runtime middleware runs on.
import { SESSION_COOKIE } from '@/lib/cookies'

export const config = {
  matcher: [
    // Bare paths listed explicitly — '/admin/:path*' alone does not match
    // '/admin' itself, which left the page ungated.
    '/admin',
    '/admin/:path*',
    '/journal',
    '/journal/:path*',
    '/settings',
    '/ideas',
    '/ideas/:path*',
    '/api/journal/:path*',
    '/api/proposals/:path*',
    '/api/threads/:path*',
    '/api/maintain',
    '/api/curate',
    '/api/settings',
    '/api/recommendations/:path*',
  ],
}

/**
 * Edge gate. Only checks that a session cookie is *present and well-formed* —
 * the HMAC is verified in `assertAdmin()` on the Node runtime, where the
 * secret and `node:crypto` are available. Middleware runs on the edge, so it
 * cannot do the real check; treating this as the only gate would be a mistake.
 */
export function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (token && token.split('.').length === 3) return NextResponse.next()

  // API callers get a status they can act on; the Shortcut authenticates with
  // a bearer token, which is verified downstream rather than here.
  if (req.nextUrl.pathname.startsWith('/api/')) {
    if (req.headers.get('authorization')?.startsWith('Bearer ')) {
      return NextResponse.next()
    }
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const login = new URL('/login', req.url)
  login.searchParams.set('next', req.nextUrl.pathname)
  return NextResponse.redirect(login)
}
