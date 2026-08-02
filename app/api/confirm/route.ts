import { NextResponse } from 'next/server'
import { confirmSubscriber } from '@/lib/db/queries'
import { SITE } from '@/lib/metadata'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.redirect(`${SITE.url}/blog?subscribe=invalid`)

  const row = await confirmSubscriber(token)
  return NextResponse.redirect(
    `${SITE.url}/blog?subscribe=${row ? 'confirmed' : 'invalid'}`,
  )
}
