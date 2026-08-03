import type { Metadata } from 'next'
import { assertAdmin } from '@/lib/admin-auth'
import { currentCuration, recommendationById } from '@/lib/curator'
import { transcriptionConfigured } from '@/lib/transcribe'
import { AgentStrip } from './AgentStrip'
import { Composer } from './Composer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Write',
  robots: { index: false, follow: false, nocache: true },
}

export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ rec?: string }>
}) {
  await assertAdmin()
  const { rec } = await searchParams

  // Writing from a recommendation: prefill the artifact (template or draft)
  // and hide the strip — the composer is the one thing on screen.
  if (rec) {
    const recommendation = await recommendationById(rec)
    if (recommendation && recommendation.status === 'open') {
      return (
        <Composer
          canRecord={transcriptionConfigured()}
          initialBody={recommendation.artifact}
          recId={recommendation.id}
        />
      )
    }
  }

  const curation = await currentCuration().catch(() => null)

  return (
    <>
      {curation && (
        <AgentStrip
          greeting={curation.batch.greeting}
          recs={curation.recommendations.map((r) => ({
            id: r.id,
            title: r.title,
            whyNow: r.whyNow,
            mode: r.mode,
            score: r.score,
          }))}
        />
      )}
      <Composer canRecord={transcriptionConfigured()} />
    </>
  )
}
