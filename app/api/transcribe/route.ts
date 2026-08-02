import { NextResponse } from 'next/server'
import { assertCanCapture } from '@/lib/admin-auth'
import { transcribe } from '@/lib/transcribe'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_BYTES = 20 * 1024 * 1024 // ~20 minutes of compressed speech

export async function POST(req: Request) {
  try {
    await assertCanCapture()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const form = await req.formData().catch(() => null)
  const audio = form?.get('audio')

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'no audio' }, { status: 400 })
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: 'empty recording' }, { status: 400 })
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: 'recording too long' }, { status: 413 })
  }

  try {
    const text = await transcribe(audio)
    if (!text) {
      return NextResponse.json({ error: 'nothing audible' }, { status: 422 })
    }
    // The audio is never written anywhere — it exists only for this request.
    return NextResponse.json({ text })
  } catch (err) {
    console.error('[transcribe]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'transcription failed' },
      { status: 502 },
    )
  }
}
