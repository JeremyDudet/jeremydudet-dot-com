'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Thread } from '@/lib/db/schema'

/**
 * The living summary plus human controls. Edits here skip the proposal queue —
 * that queue gates the agents, and you are who it defers to.
 */
export function ThreadActions({ thread }: { thread: Thread }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [summary, setSummary] = useState(thread.summary)
  const [note, setNote] = useState<string | null>(null)

  async function act(payload: object, done?: string) {
    setBusy(true)
    setNote(null)
    const res = await fetch(`/api/threads/${thread.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null)

    if (!res?.ok) {
      const detail = res ? (await res.json().catch(() => null))?.error : null
      setNote(detail ?? 'That failed.')
      setBusy(false)
      return
    }
    if (done) setNote(done)
    setEditing(false)
    setBusy(false)
    router.refresh()
  }

  const terminal = thread.state === 'harvested' || thread.state === 'abandoned'

  return (
    <section>
      {editing ? (
        <>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={6}
            className="w-full resize-none rounded-xl bg-white p-3 text-[15px]/6 text-zinc-950 ring-1 ring-zinc-950/10 outline-none dark:bg-zinc-900 dark:text-white dark:ring-white/15"
          />
          <div className="mt-2 flex gap-2">
            <button
              disabled={busy || !summary.trim()}
              onClick={() =>
                act({ action: 'update_summary', summary }, 'Summary saved.')
              }
              className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-30 dark:bg-white dark:text-zinc-950"
            >
              Save
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setSummary(thread.summary)
                setEditing(false)
              }}
              className="rounded-full px-4 py-2 text-sm text-zinc-600 ring-1 ring-zinc-950/10 dark:text-zinc-400 dark:ring-white/15"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <p className="rounded-2xl bg-zinc-100 p-4 text-[15px]/6 whitespace-pre-wrap text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {thread.summary}
        </p>
      )}

      {note && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{note}</p>
      )}

      {!editing && (
        <div className="mt-3 flex flex-wrap gap-2">
          {thread.state === 'ripe' && (
            <button
              disabled={busy}
              onClick={() =>
                act(
                  { action: 'harvest' },
                  'Draft created — it is waiting on Needs you. The essay is being written now; give it a minute and refresh.',
                )
              }
              className="rounded-full bg-[#047857] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-30 dark:bg-[#4ade80] dark:text-zinc-950"
            >
              Harvest → draft
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => setEditing(true)}
            className="rounded-full px-4 py-2.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 disabled:opacity-30 dark:text-zinc-400 dark:ring-white/15"
          >
            Edit summary
          </button>
          {!terminal && thread.state !== 'ripe' && (
            <button
              disabled={busy}
              onClick={() => act({ action: 'set_state', state: 'ripe' })}
              className="rounded-full px-4 py-2.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 disabled:opacity-30 dark:text-zinc-400 dark:ring-white/15"
            >
              Force ripe
            </button>
          )}
          {!terminal && (
            <button
              disabled={busy}
              onClick={() => act({ action: 'set_state', state: 'abandoned' })}
              className="rounded-full px-4 py-2.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 disabled:opacity-30 dark:text-zinc-400 dark:ring-white/15"
            >
              Abandon
            </button>
          )}
        </div>
      )}
    </section>
  )
}
