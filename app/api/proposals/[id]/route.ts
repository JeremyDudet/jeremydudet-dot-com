import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { acceptProposal, rejectProposal } from '@/lib/db/zettel'
import type { ProposalPayload } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

/**
 * Decide one agent proposal. `edits` lets an accept carry a correction —
 * a reworded summary, a different target thread — which the spec calls
 * "accept with modification".
 */
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
    action?: 'accept' | 'reject'
    edits?: Partial<ProposalPayload>
  } | null

  if (body?.action === 'reject') {
    await rejectProposal(id)
    return NextResponse.json({ ok: true })
  }

  if (body?.action === 'accept') {
    const result = await acceptProposal(id, body.edits ?? {})
    if (!result.ok) {
      return NextResponse.json(
        { error: `proposal expired: ${result.expired}` },
        { status: 409 },
      )
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
