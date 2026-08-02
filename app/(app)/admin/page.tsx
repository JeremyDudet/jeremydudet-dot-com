import type { Metadata } from 'next'
import Link from 'next/link'
import { assertAdmin } from '@/lib/admin-auth'
import { review } from '@/lib/db/review'
import { AttentionCard } from './AttentionCard'
import { ProposalCard } from './ProposalCard'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Review' }

/**
 * Everything blocking on a decision, then everything moving without one, then
 * where the rest sits.
 *
 * The previous version interleaved statistics with actions, so "what needs me"
 * had to be worked out by scanning. Statistics live in Settings now; this page
 * is a queue.
 */
export default async function ReviewPage() {
  await assertAdmin()
  const { attention, suggestions, ripe, moving, stages } = await review()

  const total = attention.length + suggestions.length + ripe.length

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-lg font-semibold text-zinc-950 dark:text-white">
          Review
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {total === 0
            ? 'Nothing needs you.'
            : `${total} ${total === 1 ? 'thing needs' : 'things need'} you.`}
        </p>
      </header>

      {ripe.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            Ripe ideas
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

      {attention.length > 0 && (
        <section className="space-y-4">
          {attention.map((item) => (
            <AttentionCard key={`${item.kind}-${item.id}`} item={item} />
          ))}
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

      {moving.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            Moving on its own
          </h2>
          <ul className="space-y-2">
            {moving.map((m) => (
              <li
                key={m.label}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-zinc-700 dark:text-zinc-300">
                  <span className="tabular-nums">{m.count}</span> {m.label}
                </span>
                <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                  {m.note}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
          Where everything is
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {stages.map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-3 ring-1 ring-zinc-950/5 dark:ring-white/10"
            >
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {s.label}
              </div>
              <div className="mt-0.5 text-xl font-semibold tabular-nums text-zinc-950 dark:text-white">
                {s.count}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {s.note}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
