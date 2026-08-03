'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ShareEntry } from '@/lib/db/review'
import { FeedbackInput, UndoBar } from './FeedbackInput'

/**
 * A share proposal backed by a journal entry: the draft is `suggested`, the
 * publish path is the existing claim → post → record chain.
 *
 * The draft persists as you type (debounced save_draft), so refining survives
 * the app being backgrounded — mobile Safari kills pages without asking.
 * Reject offers natural-language feedback and a six-second undo.
 */
export function ShareCard({
  item,
  canRecord,
}: {
  item: ShareEntry
  canRecord: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panel, setPanel] = useState<'none' | 'edit' | 'reject'>('none')
  const [text, setText] = useState(item.body)
  const [rejected, setRejected] = useState<{ feedbackId?: string } | null>(null)

  const lastSaved = useRef(item.body)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (undoTimer.current) clearTimeout(undoTimer.current)
    },
    [],
  )

  async function call(payload: object): Promise<Record<string, unknown> | null> {
    const res = await fetch(`/api/journal/${item.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null)

    if (!res?.ok) {
      const detail = res ? (await res.json().catch(() => null))?.error : null
      setError(detail ?? 'That failed.')
      return null
    }
    return (await res.json().catch(() => null)) ?? {}
  }

  /** Debounced draft persistence — fires 2s after the last keystroke and on
   *  blur. Failures are silent; the next edit or the post itself retries. */
  function scheduleSave(next: string) {
    setText(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void persistDraft(next), 2000)
  }

  async function persistDraft(value: string) {
    const draft = value.trim()
    if (!draft || draft === lastSaved.current) return
    const ok = await fetch(`/api/journal/${item.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'save_draft', text: draft }),
    }).catch(() => null)
    if (ok?.ok) lastSaved.current = draft
  }

  async function post() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setBusy(true)
    setError(null)
    const result = await call({ action: 'post', text })
    if (result) router.refresh()
    setBusy(false)
  }

  async function reject(feedback: { text: string; spoken: boolean } | null) {
    setBusy(true)
    setError(null)
    const result = await call({
      action: 'reject',
      feedback: feedback?.text,
      spoken: feedback?.spoken,
    })
    setBusy(false)
    if (!result) return

    setRejected({ feedbackId: result.feedbackId as string | undefined })
    undoTimer.current = setTimeout(() => router.refresh(), 6000)
  }

  async function undo() {
    if (undoTimer.current) clearTimeout(undoTimer.current)
    setBusy(true)
    await call({ action: 'restore', feedbackId: rejected?.feedbackId })
    router.refresh()
  }

  if (rejected) {
    return <UndoBar label="Rejected." busy={busy} onUndo={undo} />
  }

  return (
    <article className="rounded-2xl p-4 ring-1 ring-zinc-950/5 dark:ring-white/10">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        <span className="font-semibold text-[#2a78d6] dark:text-[#3987e5]">
          Ready to post
        </span>
        {item.score != null && (
          <span className="tabular-nums text-zinc-400 dark:text-zinc-500">
            {item.score}/10
          </span>
        )}
      </div>

      <p className="text-[15px]/6 font-medium text-zinc-950 dark:text-white">
        {item.title}
      </p>

      {item.reason && (
        <p className="mt-2 border-l-2 border-zinc-200 pl-3 text-sm text-zinc-600 italic dark:border-zinc-700 dark:text-zinc-400">
          {item.reason}
        </p>
      )}

      {panel === 'edit' && (
        <textarea
          value={text}
          onChange={(e) => scheduleSave(e.target.value)}
          onBlur={() => void persistDraft(text)}
          rows={8}
          className="mt-3 w-full resize-none rounded-xl bg-zinc-50 p-3 text-sm text-zinc-950 ring-1 ring-zinc-950/10 outline-none dark:bg-zinc-900 dark:text-white dark:ring-white/15"
        />
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {panel === 'reject' ? (
        <FeedbackInput busy={busy} canRecord={canRecord} onSubmit={reject} />
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {panel === 'edit' ? (
            <>
              <Primary disabled={busy || !text.trim()} onClick={post}>
                Post it
              </Primary>
              <Ghost disabled={busy} onClick={() => setPanel('none')}>
                Close
              </Ghost>
            </>
          ) : (
            <>
              <Primary disabled={busy} onClick={() => setPanel('edit')}>
                Review &amp; post
              </Primary>
              <Ghost disabled={busy} onClick={() => setPanel('reject')}>
                Reject
              </Ghost>
            </>
          )}
        </div>
      )}
    </article>
  )
}

function Primary({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-30 dark:bg-white dark:text-zinc-950"
    >
      {children}
    </button>
  )
}

function Ghost({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-full px-4 py-2.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 disabled:opacity-30 dark:text-zinc-400 dark:ring-white/15"
    >
      {children}
    </button>
  )
}
