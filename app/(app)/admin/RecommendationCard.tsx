'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Recommendation } from '@/lib/db/schema'

/**
 * One share candidate with its case made in the open: which Show Your Work
 * principles it serves, why now, and the artifact — a template with gaps or
 * an editable draft. "Write it" opens the composer prefilled; the user's
 * voice does the rest, and every existing publish gate still applies.
 */
export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  async function dismiss() {
    setBusy(true)
    await fetch(`/api/recommendations/${rec.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss' }),
    }).catch(() => null)
    router.refresh()
  }

  return (
    <article className="rounded-2xl bg-zinc-100/60 p-4 ring-1 ring-zinc-950/5 dark:bg-zinc-900/60 dark:ring-white/10">
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        <span className="font-semibold text-[#2a78d6] dark:text-[#3987e5]">
          Worth sharing · {Math.round(rec.score * 100)}%
        </span>
        <span className="text-zinc-400 dark:text-zinc-500">
          {rec.mode === 'template' ? 'template — you write it' : 'draft — yours to rework'}
        </span>
      </div>

      <p className="text-[15px]/6 font-medium text-zinc-950 dark:text-white">
        {rec.title}
      </p>

      <dl className="mt-2 space-y-1.5 text-sm">
        <div>
          <dt className="text-xs font-medium text-zinc-400 uppercase dark:text-zinc-500">
            Meets the standard
          </dt>
          <dd className="text-zinc-600 dark:text-zinc-400">
            {rec.meetsStandards}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-zinc-400 uppercase dark:text-zinc-500">
            Why now
          </dt>
          <dd className="text-zinc-600 dark:text-zinc-400">{rec.whyNow}</dd>
        </div>
      </dl>

      {open && (
        <pre className="mt-3 rounded-xl bg-white p-3 text-sm whitespace-pre-wrap text-zinc-800 ring-1 ring-zinc-950/5 dark:bg-zinc-950 dark:text-zinc-200 dark:ring-white/10">
          {rec.artifact}
        </pre>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`/journal?rec=${rec.id}`}
          className="rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-950"
        >
          Write it
        </a>
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={busy}
          className="rounded-full px-4 py-2.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 disabled:opacity-30 dark:text-zinc-400 dark:ring-white/15"
        >
          {open ? 'Hide' : 'Preview'} {rec.mode}
        </button>
        <button
          onClick={dismiss}
          disabled={busy}
          className="rounded-full px-4 py-2.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 disabled:opacity-30 dark:text-zinc-400 dark:ring-white/15"
        >
          Not this
        </button>
      </div>
    </article>
  )
}
