'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { QuestionItem } from '@/lib/db/review'

/**
 * The judge wants more before this thought can travel. Answer opens the
 * composer in answer mode — another voice or text dump, linked to the same
 * idea. Dismiss kills only the question; Drop idea is the explicit kill.
 */
export function QuestionCard({ item }: { item: QuestionItem }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function act(action: 'dismiss' | 'drop') {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/questions/${item.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    }).catch(() => null)

    if (!res?.ok) {
      const detail = res ? (await res.json().catch(() => null))?.error : null
      setError(detail ?? 'That failed.')
      setBusy(false)
      return
    }
    router.refresh()
    setBusy(false)
  }

  return (
    <article className="rounded-2xl p-4 ring-1 ring-zinc-950/5 dark:ring-white/10">
      <div className="mb-2 text-xs font-semibold text-[#4a3aa7] dark:text-[#9085e9]">
        Wants to know
      </div>

      <p className="text-[15px]/6 font-medium text-zinc-950 dark:text-white">
        {item.question}
      </p>

      <p className="mt-2 border-l-2 border-zinc-200 pl-3 text-sm text-zinc-600 italic dark:border-zinc-700 dark:text-zinc-400">
        About: {item.rootTitle}
      </p>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`/journal?q=${item.id}`}
          className="rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-950"
        >
          Answer
        </a>
        <button
          onClick={() => act('dismiss')}
          disabled={busy}
          className="rounded-full px-4 py-2.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 disabled:opacity-30 dark:text-zinc-400 dark:ring-white/15"
        >
          Dismiss
        </button>
        <button
          onClick={() => act('drop')}
          disabled={busy}
          className="rounded-full px-4 py-2.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 disabled:opacity-30 dark:text-zinc-400 dark:ring-white/15"
        >
          Drop idea
        </button>
      </div>
    </article>
  )
}
