'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Recommendation } from '@/lib/db/schema'
import { FeedbackInput, UndoBar } from './FeedbackInput'

/**
 * One curator pick with its case made in the open. The mechanics are honest
 * about mode: a draft can be adopted ("Refine & post" turns it into an
 * ordinary ready-to-post entry on the one true publish path); a template has
 * gaps only he can fill, so it opens the composer instead. Dismissing offers
 * natural-language feedback and a six-second undo.
 */
export function RecommendationCard({
  rec,
  canRecord,
}: {
  rec: Recommendation
  canRecord: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [dismissed, setDismissed] = useState<{ feedbackId?: string } | null>(
    null,
  )
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current)
    },
    [],
  )

  async function call(payload: object): Promise<Record<string, unknown> | null> {
    const res = await fetch(`/api/recommendations/${rec.id}`, {
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

  async function adopt() {
    setBusy(true)
    setError(null)
    const result = await call({ action: 'adopt' })
    if (result) router.refresh()
    setBusy(false)
  }

  async function dismiss(feedback: { text: string; spoken: boolean } | null) {
    setBusy(true)
    setError(null)
    const result = await call({
      action: 'dismiss',
      feedback: feedback?.text,
      spoken: feedback?.spoken,
    })
    setBusy(false)
    if (!result) return

    setDismissed({ feedbackId: result.feedbackId as string | undefined })
    undoTimer.current = setTimeout(() => router.refresh(), 6000)
  }

  async function undo() {
    if (undoTimer.current) clearTimeout(undoTimer.current)
    setBusy(true)
    await call({ action: 'reopen' })
    router.refresh()
  }

  if (dismissed) {
    return <UndoBar label="Dismissed." busy={busy} onUndo={undo} />
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

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {rejecting ? (
        <FeedbackInput
          busy={busy}
          canRecord={canRecord}
          onSubmit={dismiss}
          submitLabel="Dismiss with this"
          skipLabel="Just dismiss"
        />
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {rec.mode === 'draft' ? (
            <button
              onClick={adopt}
              disabled={busy}
              className="rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-30 dark:bg-white dark:text-zinc-950"
            >
              Refine &amp; post
            </button>
          ) : (
            <a
              href={`/journal?rec=${rec.id}`}
              className="rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-950"
            >
              Write it
            </a>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            disabled={busy}
            className="rounded-full px-4 py-2.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 disabled:opacity-30 dark:text-zinc-400 dark:ring-white/15"
          >
            {open ? 'Hide' : 'Preview'} {rec.mode}
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={busy}
            className="rounded-full px-4 py-2.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 disabled:opacity-30 dark:text-zinc-400 dark:ring-white/15"
          >
            Not this
          </button>
        </div>
      )}
    </article>
  )
}
