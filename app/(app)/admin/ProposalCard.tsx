'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import type { ProposalView } from '@/lib/db/review'

/**
 * One agent suggestion, decidable on sight: what it wants to do, why, the
 * evidence, and — when a summary changes — before and after side by side.
 * Accept can carry an edited summary ("accept with modification").
 */
export function ProposalCard({ proposal }: { proposal: ProposalView }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [summary, setSummary] = useState(proposal.after ?? '')

  async function decide(action: 'accept' | 'reject') {
    setBusy(true)
    setError(null)

    const edits =
      action === 'accept' && editing && summary.trim() !== proposal.after
        ? summaryEdit(proposal.type, summary.trim())
        : undefined

    const res = await fetch(`/api/proposals/${proposal.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, edits }),
    }).catch(() => null)

    if (!res?.ok) {
      const detail = res ? (await res.json().catch(() => null))?.error : null
      setError(detail ?? 'That failed.')
      setBusy(false)
      // An expired proposal is stale, not broken — refresh clears it.
      if (res?.status === 409) router.refresh()
      return
    }
    router.refresh()
  }

  return (
    <article className="rounded-2xl p-4 ring-1 ring-zinc-950/5 dark:ring-white/10">
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        <span className="font-semibold text-[#4a3aa7] dark:text-[#9085e9]">
          {proposal.source === 'librarian' ? 'Librarian' : 'Matcher'}
        </span>
        <span className="tabular-nums text-zinc-400 dark:text-zinc-500">
          {Math.round(proposal.confidence * 100)}% sure
        </span>
      </div>

      <p className="text-[15px]/6 font-medium text-zinc-950 dark:text-white">
        {proposal.headline}
      </p>

      <p className="mt-2 border-l-2 border-zinc-200 pl-3 text-sm text-zinc-600 italic dark:border-zinc-700 dark:text-zinc-400">
        {proposal.reasoning}
      </p>

      {proposal.entryBody && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-zinc-500 dark:text-zinc-400">
            The entry
          </summary>
          <p className="mt-2 rounded-xl bg-zinc-50 p-3 text-sm whitespace-pre-wrap text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {proposal.entryBody}
          </p>
        </details>
      )}

      {proposal.parts && (
        <ol className="mt-3 space-y-2">
          {proposal.parts.map((part, i) => (
            <li
              key={i}
              className="rounded-xl bg-zinc-50 p-3 text-sm whitespace-pre-wrap text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {part}
            </li>
          ))}
        </ol>
      )}

      {(proposal.before || proposal.after) && (
        <div className="mt-3 space-y-2">
          {proposal.before && (
            <div>
              <div className="mb-1 text-xs font-medium text-zinc-400 dark:text-zinc-500">
                Now
              </div>
              <p className="rounded-xl bg-zinc-50 p-3 text-sm whitespace-pre-wrap text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                {proposal.before}
              </p>
            </div>
          )}
          {proposal.after && (
            <div>
              <div className="mb-1 text-xs font-medium text-zinc-400 dark:text-zinc-500">
                {proposal.before ? 'Would become' : 'Summary'}
              </div>
              {editing ? (
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-xl bg-white p-3 text-sm text-zinc-950 ring-1 ring-zinc-950/10 outline-none dark:bg-zinc-900 dark:text-white dark:ring-white/15"
                />
              ) : (
                <p className="rounded-xl bg-emerald-50/60 p-3 text-sm whitespace-pre-wrap text-zinc-800 dark:bg-emerald-950/30 dark:text-zinc-200">
                  {proposal.after}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={() => decide('accept')}
          className="rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-30 dark:bg-white dark:text-zinc-950"
        >
          Accept
        </button>
        {proposal.editableSummary && !editing && (
          <button
            disabled={busy}
            onClick={() => setEditing(true)}
            className="rounded-full px-4 py-2.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 disabled:opacity-30 dark:text-zinc-400 dark:ring-white/15"
          >
            Edit first
          </button>
        )}
        <button
          disabled={busy}
          onClick={() => decide('reject')}
          className={clsx(
            'rounded-full px-4 py-2.5 text-sm ring-1 disabled:opacity-30',
            'text-zinc-600 ring-zinc-950/10 dark:text-zinc-400 dark:ring-white/15',
          )}
        >
          Reject
        </button>
      </div>
    </article>
  )
}

/** Map an edited summary back onto the right payload field per type. */
function summaryEdit(type: ProposalView['type'], text: string) {
  switch (type) {
    case 'join_thread':
      return { updatedSummary: text }
    case 'create_thread':
      return { summary: text }
    case 'merge_threads':
      return { mergedSummary: text }
    case 'update_summary':
      return { newSummary: text }
    case 'create_structure_note':
      return { noteText: text }
    default:
      return undefined
  }
}
