import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { inArray } from 'drizzle-orm'
import { assertAdmin } from '@/lib/admin-auth'
import { db, proposals as proposalsTable, threads } from '@/lib/db'
import { and, eq } from 'drizzle-orm'
import { threadById, threadEntries } from '@/lib/db/zettel'
import { ThreadActions } from './ThreadActions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Idea' }

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await assertAdmin()
  const { id } = await params

  const thread = await threadById(id)
  if (!thread) notFound()

  const [entries, related, pending] = await Promise.all([
    threadEntries(id),
    thread.relatedThreadIds.length
      ? db
          .select({ id: threads.id, name: threads.name, state: threads.state })
          .from(threads)
          .where(inArray(threads.id, thread.relatedThreadIds))
      : Promise.resolve([]),
    db
      .select()
      .from(proposalsTable)
      .where(
        and(
          eq(proposalsTable.threadId, id),
          eq(proposalsTable.status, 'pending'),
        ),
      ),
  ])

  const days = Math.round(
    (Date.now() - thread.createdAt.getTime()) / 86_400_000,
  )

  return (
    <div className="space-y-8">
      <nav>
        <Link
          href="/ideas"
          className="text-sm text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        >
          ← Ideas
        </Link>
      </nav>

      <header>
        <div className="mb-2 text-xs text-zinc-400 dark:text-zinc-500">
          {thread.kind === 'structure' ? 'map of content' : thread.state} ·{' '}
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'} ·{' '}
          {days === 0 ? 'born today' : `${days}d old`}
        </div>
        <h1 className="text-lg font-semibold text-zinc-950 dark:text-white">
          {thread.name}
        </h1>
      </header>

      <ThreadActions thread={thread} />

      {pending.length > 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          {pending.length} pending{' '}
          {pending.length === 1 ? 'suggestion touches' : 'suggestions touch'}{' '}
          this idea —{' '}
          <Link href="/ideas" className="underline underline-offset-2">
            decide under Suggestions
          </Link>
          .
        </p>
      )}

      {thread.summaryHistory.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            How the summary evolved ({thread.summaryHistory.length} versions)
          </summary>
          <div className="mt-3 space-y-3">
            {[...thread.summaryHistory].reverse().map((v, i) => (
              <div key={i}>
                <div className="mb-1 text-xs text-zinc-400 dark:text-zinc-500">
                  {new Date(v.at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <p className="rounded-xl bg-zinc-50 p-3 text-sm whitespace-pre-wrap text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                  {v.summary}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

      {related.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            Related ideas
          </h2>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/ideas/${r.id}`}
                className="rounded-full px-3 py-1.5 text-sm text-zinc-700 ring-1 ring-zinc-950/10 hover:bg-zinc-100 dark:text-zinc-300 dark:ring-white/15 dark:hover:bg-zinc-900"
              >
                {r.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
          The evidence, oldest first
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No entries yet.
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => (
              <div
                key={e.id}
                className="rounded-2xl p-4 ring-1 ring-zinc-950/5 dark:ring-white/10"
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                  <span>
                    {e.createdAt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {e.verdict && ` · ${e.verdict}`}
                    {e.postId && ' · posted to X'}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                  {e.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
