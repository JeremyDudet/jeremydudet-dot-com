'use client'

import { useState } from 'react'
import type { Recommendation } from '@/lib/db/schema'

/**
 * The curator's voice on the app's front door: one greeting line, and the
 * current candidates behind a tap. Collapsed by default so Write stays one
 * thing — this is a colleague saying good morning, not a dashboard.
 */
export function AgentStrip({
  greeting,
  recs,
}: {
  greeting: string
  recs: Pick<Recommendation, 'id' | 'title' | 'whyNow' | 'mode' | 'score'>[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-4 rounded-2xl bg-zinc-100/70 px-4 py-3 dark:bg-zinc-900/70">
      <button
        type="button"
        onClick={() => recs.length && setOpen((o) => !o)}
        className="flex w-full items-baseline justify-between gap-3 text-left"
      >
        <span className="text-sm/6 text-zinc-700 dark:text-zinc-300">
          {greeting}
        </span>
        {recs.length > 0 && (
          <span className="shrink-0 rounded-full bg-[#2a78d6]/10 px-2 py-0.5 text-xs font-medium text-[#2a78d6] dark:bg-[#3987e5]/15 dark:text-[#3987e5]">
            {recs.length} worth sharing
          </span>
        )}
      </button>

      {open && (
        <ul className="mt-3 space-y-2.5 border-t border-zinc-950/5 pt-3 dark:border-white/10">
          {recs.map((r) => (
            <li key={r.id}>
              <a href={`/journal?rec=${r.id}`} className="group block">
                <span className="text-sm font-medium text-zinc-950 group-active:opacity-70 dark:text-white">
                  {r.title}
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {r.whyNow}
                </span>
              </a>
            </li>
          ))}
          <li>
            <a
              href="/admin"
              className="text-xs text-zinc-400 underline underline-offset-2 dark:text-zinc-500"
            >
              Full cases in Review
            </a>
          </li>
        </ul>
      )}
    </div>
  )
}
