'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import type { Attention } from '@/lib/db/review'
import { decide } from './actions'

const KIND = {
  blog: { label: 'Blog post', tone: 'text-[#047857] dark:text-[#4ade80]' },
  'ready-to-post': {
    label: 'Ready to post',
    tone: 'text-[#2a78d6] dark:text-[#3987e5]',
  },
  develop: {
    label: 'Needs developing',
    tone: 'text-[#b45309] dark:text-[#fbbf24]',
  },
  stalled: { label: 'Never judged', tone: 'text-zinc-500 dark:text-zinc-400' },
} as const

/**
 * One card per decision, with the action inline. Each kind gets only the
 * buttons that apply to it — a generic card with every possible action was
 * what made the old page hard to scan.
 */
export function AttentionCard({ item }: { item: Attention }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState(item.body)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const kind = KIND[item.kind]

  async function journalAction(payload: object) {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/journal/${item.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
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

  async function blogAction(status: 'approved' | 'rejected') {
    setBusy(true)
    const form = new FormData()
    form.set('slug', item.id)
    form.set('status', status)
    await decide(form)
    router.refresh()
    setBusy(false)
  }

  return (
    <article className="rounded-2xl p-4 ring-1 ring-zinc-950/5 dark:ring-white/10">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        <span className={clsx('font-semibold', kind.tone)}>{kind.label}</span>
        {item.score != null && (
          <span className="tabular-nums text-zinc-400 dark:text-zinc-500">
            {item.score}/10
          </span>
        )}
        {item.meta && (
          <span className="text-zinc-400 dark:text-zinc-500">{item.meta}</span>
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

      {open && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="mt-3 w-full resize-none rounded-xl bg-zinc-50 p-3 text-sm text-zinc-950 ring-1 ring-zinc-950/10 outline-none dark:bg-zinc-900 dark:text-white dark:ring-white/15"
        />
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {item.kind === 'blog' && (
          <>
            <Primary disabled={busy} onClick={() => blogAction('approved')}>
              Publish
            </Primary>
            <Ghost disabled={busy} onClick={() => blogAction('rejected')}>
              Reject
            </Ghost>
          </>
        )}

        {item.kind === 'ready-to-post' &&
          (open ? (
            <>
              <Primary
                disabled={busy || !text.trim()}
                onClick={() => journalAction({ action: 'post', text })}
              >
                Post it
              </Primary>
              <Ghost disabled={busy} onClick={() => setOpen(false)}>
                Cancel
              </Ghost>
            </>
          ) : (
            <>
              <Primary disabled={busy} onClick={() => setOpen(true)}>
                Review &amp; post
              </Primary>
              <Ghost
                disabled={busy}
                onClick={() => journalAction({ action: 'archive' })}
              >
                Not now
              </Ghost>
            </>
          ))}

        {item.kind === 'develop' && (
          <>
            <Primary disabled={busy} onClick={() => setOpen((o) => !o)}>
              {open ? 'Hide' : 'Work on it'}
            </Primary>
            {open && (
              <Primary
                disabled={busy || text.trim() === item.body}
                onClick={() => journalAction({ action: 'judge' })}
              >
                Re-judge
              </Primary>
            )}
            <Ghost
              disabled={busy}
              onClick={() => journalAction({ action: 'archive' })}
            >
              Drop it
            </Ghost>
          </>
        )}

        {item.kind === 'stalled' && (
          <Primary
            disabled={busy}
            onClick={() => journalAction({ action: 'judge' })}
          >
            Judge it
          </Primary>
        )}
      </div>
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
