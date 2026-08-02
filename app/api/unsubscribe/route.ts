import { NextResponse } from 'next/server'
import { unsubscribe } from '@/lib/db/queries'
import { SITE } from '@/lib/metadata'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.redirect(`${SITE.url}/blog?subscribe=invalid`)

  const row = await unsubscribe(token)
  return NextResponse.redirect(
    `${SITE.url}/blog?subscribe=${row ? 'unsubscribed' : 'invalid'}`,
  )
}

/** RFC 8058 one-click unsubscribe — Gmail POSTs here from its UI. */
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (token) await unsubscribe(token)
  return new NextResponse(null, { status: 200 })
}
