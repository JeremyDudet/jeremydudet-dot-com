import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { decideRecommendation } from '@/lib/curator'

export const dynamic = 'force-dynamic'

/** Dismiss or mark-used one recommendation. The user's override is final. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = (await req.json().catch(() => null)) as {
    action?: 'dismiss' | 'use'
  } | null

  if (body?.action !== 'dismiss' && body?.action !== 'use') {
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }

  await decideRecommendation(id, body.action === 'dismiss' ? 'dismissed' : 'used')
  return NextResponse.json({ ok: true })
}
