import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { dismissQuestion, questionById } from '@/lib/db/questions'
import { setJournalStatus } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Action = { action: 'dismiss' } | { action: 'drop' }

/**
 * Decide one follow-up question. Dismiss kills only the question — the root
 * idea keeps ripening. Drop is the explicit kill: question and root both.
 * Killing a thought is never a side effect.
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
  const question = await questionById(id)
  if (!question) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const body = (await req.json().catch(() => null)) as Action | null

  switch (body?.action) {
    case 'dismiss': {
      await dismissQuestion(id)
      return NextResponse.json({ ok: true })
    }

    case 'drop': {
      await dismissQuestion(id)
      await setJournalStatus(question.entryId, 'archived')
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }
}
