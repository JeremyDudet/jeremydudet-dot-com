import { render } from '@react-email/render'
import { NextResponse } from 'next/server'
import { PostEmail } from '@/emails/PostEmail'
import { SAMPLE_ENTRIES } from '@/lib/samples'

export const dynamic = 'force-dynamic'

/**
 * Renders the newsletter exactly as Resend will send it, so the email design
 * can be checked in a browser (and on a phone) without a send. Dev only.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 })
  }

  // Serve assets from whatever origin the preview was actually opened on
  // (localhost, or the Tailscale IP from a phone). Must come from the Host
  // header: req.url reports the bind address, which is 0.0.0.0 here and
  // resolves nowhere from another device.
  const host = req.headers.get('host') ?? 'localhost:3000'
  const proto = req.headers.get('x-forwarded-proto') ?? 'http'
  const origin = `${proto}://${host}`

  const html = await render(
    PostEmail({
      entries: SAMPLE_ENTRIES,
      unsubscribeUrl: `${origin}/api/unsubscribe?token=sample`,
      baseUrl: origin,
    }),
  )

  return new NextResponse(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
