import type { Metadata } from 'next'
import Link from 'next/link'
import clsx from 'clsx'
import { assertAdmin } from '@/lib/admin-auth'
import { allThreads, entryCounts } from '@/lib/db/zettel'
import { ideasReview } from '@/lib/db/review'
import { ProposalCard } from '../admin/ProposalCard'
import type { Thread, ThreadState } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Ideas' }

const STATE_ORDER: ThreadState[] = [
  'ripe',
  'ripening',
  'forming',
  'harvested',
  'abandoned',
]

const STATE_STYLE: Record<ThreadState, string> = {
  ripe: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  ripening: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400',
  forming: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  harvested: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
  abandoned: 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600',
}

/**
 * The shape of the thinking, at a glance. A list, deliberately — the fancy
 * graph can come when there are enough threads that a list stops working.
 */
export default async function IdeasPage() {
  await assertAdmin()
  const [threads, counts, { suggestions, ripe }] = await Promise.all([
    allThreads(),
    entryCounts(),
    ideasReview().catch(() => ({ suggestions: [], ripe: [] })),
  ])

  const structure = threads.filter((t) => t.kind === 'structure')
  const active = threads.filter(
    (t) => t.kind === 'idea' && !['harvested', 'abandoned'].includes(t.state),
  )
  const done = threads.filter(
    (t) => t.kind === 'idea' && ['harvested', 'abandoned'].includes(t.state),
  )

  active.sort(
    (a, b) =>
      STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) ||
      b.updatedAt.getTime() - a.updatedAt.getTime(),
  )

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-lg font-semibold text-zinc-950 dark:text-white">
          Ideas
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {active.length === 0
            ? 'Nothing ripening yet — ideas appear here as you journal.'
            : `${active.length} ripening from your journal.`}
        </p>
      </header>

      {ripe.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            Ready to harvest
          </h2>
          <div className="space-y-3">
            {ripe.map((t) => (
              <Link
                key={t.id}
                href={`/ideas/${t.id}`}
                className="block rounded-2xl p-4 ring-1 ring-zinc-950/5 transition-colors hover:bg-zinc-100 dark:ring-white/10 dark:hover:bg-zinc-900"
              >
                <div className="text-xs font-semibold text-[#047857] dark:text-[#4ade80]">
                  Ready to harvest · {t.entryCount} entries
                </div>
                <p className="mt-1 text-[15px]/6 font-medium text-zinc-950 dark:text-white">
                  {t.name}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {t.summary}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {suggestions.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            Suggestions ({suggestions.length})
          </h2>
          <div className="space-y-4">
            {suggestions.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        </section>
      )}

      {structure.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            Maps of content
          </h2>
          <div className="space-y-3">
            {structure.map((t) => (
              <Row key={t.id} thread={t} count={counts.get(t.id) ?? 0} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        {active.map((t) => (
          <Row key={t.id} thread={t} count={counts.get(t.id) ?? 0} />
        ))}
      </section>

      {done.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            Harvested &amp; abandoned ({done.length})
          </summary>
          <div className="mt-3 space-y-3">
            {done.map((t) => (
              <Row key={t.id} thread={t} count={counts.get(t.id) ?? 0} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function Row({ thread, count }: { thread: Thread; count: number }) {
  const days = Math.max(
    0,
    Math.round((Date.now() - thread.updatedAt.getTime()) / 86_400_000),
  )
  return (
    <Link
      href={`/ideas/${thread.id}`}
      className="block rounded-2xl p-4 ring-1 ring-zinc-950/5 transition-colors hover:bg-zinc-100 dark:ring-white/10 dark:hover:bg-zinc-900"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        <span
          className={clsx(
            'rounded-full px-2 py-0.5 font-medium',
            STATE_STYLE[thread.state],
          )}
        >
          {thread.kind === 'structure' ? 'map' : thread.state}
        </span>
        <span className="tabular-nums text-zinc-400 dark:text-zinc-500">
          {count} {count === 1 ? 'entry' : 'entries'}
        </span>
        <span className="text-zinc-400 dark:text-zinc-500">
          {days === 0 ? 'today' : `${days}d quiet`}
        </span>
      </div>
      <p className="mt-1.5 text-[15px]/6 font-medium text-zinc-950 dark:text-white">
        {thread.name}
      </p>
      <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
        {thread.summary}
      </p>
    </Link>
  )
}
