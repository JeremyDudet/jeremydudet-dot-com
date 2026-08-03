import type { Metadata } from 'next'
import { assertAdmin } from '@/lib/admin-auth'
import { needsYou } from '@/lib/db/review'
import { transcriptionConfigured } from '@/lib/transcribe'
import { AttentionCard } from './AttentionCard'
import { ProcessingNotice } from './ProcessingNotice'
import { QuestionCard } from './QuestionCard'
import { RecommendationCard } from './RecommendationCard'
import { ShareCard } from './ShareCard'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Needs you' }

/**
 * The one decision queue. Blog-gate calls first (they block publication),
 * then share proposals from both agents in one score-ordered list, then
 * ideas that need another pass. Zettelkasten maintenance and statistics live
 * on Ideas and Settings — this page never mixes bookkeeping with decisions.
 */
export default async function NeedsYouPage() {
  await assertAdmin()
  const { blog, shares, questions, develop, resolved, processingCount, considered } =
    await needsYou()
  const canRecord = transcriptionConfigured()

  const total =
    blog.length + shares.length + questions.length + develop.length

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-lg font-semibold text-zinc-950 dark:text-white">
          Needs you
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {total === 0
            ? processingCount > 0
              ? 'Nothing yet.'
              : 'Nothing needs you.'
            : `${total} ${total === 1 ? 'thing needs' : 'things need'} you.`}
        </p>
        {processingCount > 0 && <ProcessingNotice count={processingCount} />}
      </header>

      {blog.length > 0 && (
        <section className="space-y-4">
          {blog.map((item) => (
            <AttentionCard key={`blog-${item.id}`} item={item} />
          ))}
        </section>
      )}

      {shares.length > 0 && (
        <section>
          <h2 className="mb-1 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            Worth sharing
          </h2>
          {considered && (
            <p className="mb-3 text-xs text-zinc-400 dark:text-zinc-500">
              The curator re-read {considered} to pick its candidates.
            </p>
          )}
          <div className="mt-3 space-y-4">
            {shares.map((s) =>
              s.kind === 'entry' ? (
                <ShareCard
                  key={`entry-${s.entry.id}`}
                  item={s.entry}
                  canRecord={canRecord}
                />
              ) : (
                <RecommendationCard
                  key={`rec-${s.rec.id}`}
                  rec={s.rec}
                  canRecord={canRecord}
                />
              ),
            )}
          </div>
        </section>
      )}

      {questions.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            Wants to know
          </h2>
          <div className="space-y-4">
            {questions.map((q) => (
              <QuestionCard key={`q-${q.id}`} item={q} />
            ))}
          </div>
        </section>
      )}

      {develop.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            Needs developing
          </h2>
          <div className="space-y-4">
            {develop.map((item) => (
              <AttentionCard key={`develop-${item.id}`} item={item} />
            ))}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section className="space-y-1.5">
          {resolved.map((line) => (
            <p key={line} className="text-xs text-zinc-400 dark:text-zinc-500">
              {line}
            </p>
          ))}
        </section>
      )}
    </div>
  )
}
