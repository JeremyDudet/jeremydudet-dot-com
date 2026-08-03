import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { setSetting } from '@/lib/settings'

export const dynamic = 'force-dynamic'

/** Allowlist, not free-form KV over HTTP: each key names its legal values. */
const ALLOWED: Record<string, unknown[]> = {
  sharing_mode: ['template', 'draft'],
}

export async function POST(req: Request) {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as {
    key?: string
    value?: unknown
  } | null

  if (!body?.key || !(body.key in ALLOWED)) {
    return NextResponse.json({ error: 'unknown setting' }, { status: 400 })
  }
  if (!ALLOWED[body.key].includes(body.value)) {
    return NextResponse.json({ error: 'bad value' }, { status: 400 })
  }

  await setSetting(body.key, body.value)
  return NextResponse.json({ ok: true })
}
