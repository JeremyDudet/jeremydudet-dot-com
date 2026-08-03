import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { deleteFeedback } from '@/lib/feedback'

export const dynamic = 'force-dynamic'

/** Kill one learned line. A bad generalization dies in one tap — the next
 *  judge and curator runs never see it again. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await deleteFeedback(id)
  return NextResponse.json({ ok: true })
}
