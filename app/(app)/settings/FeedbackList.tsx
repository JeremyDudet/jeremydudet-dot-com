'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

export type LearnedLine = {
  id: string
  line: string
  pending: boolean
  sentiment: 'negative' | 'positive'
  when: string
}

/**
 * What the system has learned from your feedback, inspectable and mortal:
 * a bad generalization dies in one tap and never reaches another prompt.
 */
export function FeedbackList({ items }: { items: LearnedLine[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function remove(id: string) {
    setBusy(id)
    await fetch(`/api/feedback/${id}`, { method: 'DELETE' }).catch(() => null)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {items.map((f) => (
        <div
          key={f.id}
          className="flex items-start justify-between gap-3 rounded-xl p-3 ring-1 ring-zinc-950/5 dark:ring-white/10"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
              <span
                className={clsx(
                  'font-semibold',
                  f.sentiment === 'positive'
                    ? 'text-[#047857] dark:text-[#4ade80]'
                    : 'text-[#b45309] dark:text-[#fbbf24]',
                )}
              >
                {f.sentiment === 'positive' ? 'more' : 'avoid'}
              </span>
              <span className="text-zinc-400 dark:text-zinc-500">{f.when}</span>
              {f.pending && (
                <span className="text-zinc-400 dark:text-zinc-500">
                  distilling…
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {f.line}
            </p>
          </div>
          <button
            onClick={() => remove(f.id)}
            disabled={busy === f.id}
            aria-label="Forget this"
            className="shrink-0 rounded-full px-3 py-1.5 text-xs text-zinc-500 ring-1 ring-zinc-950/10 disabled:opacity-30 dark:text-zinc-400 dark:ring-white/15"
          >
            Forget
          </button>
        </div>
      ))}
    </div>
  )
}
