import type { Metadata } from 'next'
import { assertAdmin } from '@/lib/admin-auth'
import { transcriptionConfigured } from '@/lib/transcribe'
import { Composer } from './Composer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Write',
  robots: { index: false, follow: false, nocache: true },
}

export default async function WritePage() {
  await assertAdmin()

  // Hide the mic rather than show a button that errors, when no transcription
  // key is configured.
  return <Composer canRecord={transcriptionConfigured()} />
}
