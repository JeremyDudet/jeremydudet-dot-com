import type { Metadata } from 'next'
import { assertAdmin } from '@/lib/admin-auth'
import { currentCuration, recommendationById } from '@/lib/curator'
import { questionById } from '@/lib/db/questions'
import { journalEntry } from '@/lib/db/queries'
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
  searchParams: Promise<{ rec?: string; q?: string }>
}) {
  await assertAdmin()
  const { rec, q } = await searchParams

  // Answering a follow-up question: the composer alone, in answer mode. The
  // question id travels in the URL, so backgrounding the app loses nothing.
  if (q) {
    const question = await questionById(q)
    if (question && question.status === 'open') {
      const root = await journalEntry(question.entryId)
      return (
        <Composer
          canRecord={transcriptionConfigured()}
          questionId={question.id}
          answerContext={{
            question: question.question,
            rootExcerpt: root ? excerpt(root.body) : '',
          }}
        />
      )
    }
  }

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

function excerpt(text: string, max = 240) {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}
