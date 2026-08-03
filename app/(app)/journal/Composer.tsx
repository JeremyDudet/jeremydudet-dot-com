'use client'

import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { useRecorder } from '@/components/useRecorder'
import { uuid } from '@/lib/uuid'
import type { JournalVerdict } from '@/lib/db/schema'

type Verdict = {
  verdict: JournalVerdict
  score: number
  reason: string
  suggested: string
}

const OUTBOX = 'journal.outbox'
type Pending = { clientId: string; body: string; sealed: boolean; spoken?: boolean }

const VERDICT_COPY: Record<JournalVerdict, { label: string; tone: string }> = {
  post: { label: 'Worth posting', tone: 'text-[#047857] dark:text-[#4ade80]' },
  develop: {
    label: 'Needs developing',
    tone: 'text-[#b45309] dark:text-[#fbbf24]',
  },
  private: { label: 'Keep private', tone: 'text-zinc-500 dark:text-zinc-400' },
}

/**
 * The whole Write tab: one box.
 *
 * Save lives in the top bar, not the bottom — the bottom of the screen is
 * where the iOS keyboard sits while you type, so a bottom Save was unreachable
 * at exactly the moment you'd want it. The mic floats bottom-right as the one
 * big affordance on an empty page; while recording it grows into a timer chip.
 */
export function Composer({
  canRecord,
  initialBody,
  recId,
}: {
  canRecord: boolean
  /** Prefill from a curator recommendation — a template or draft to write into. */
  initialBody?: string
  /** When set, a successful save marks the recommendation used. */
  recId?: string
}) {
  const [body, setBody] = useState(initialBody ?? '')
  const [sealed, setSealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [spoken, setSpoken] = useState(false)
  const box = useRef<HTMLTextAreaElement>(null)

  const recorder = useRecorder({
    onText: (text) => {
      setSpoken(true)
      setBody((b) => (b ? `${b.trim()}\n\n${text}` : text))
      box.current?.focus()
    },
    onError: setNote,
  })

  // Grow with the text so the caret never hides below the fold.
  useEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 260)}px`
  }, [body])

  useEffect(() => {
    const queued = readOutbox()
    if (!queued.length) return
    const flush = async () => {
      for (const item of readOutbox()) {
        if (!(await send(item))) break
        removeFromOutbox(item.clientId)
      }
    }
    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])

  async function save() {
    const text = body.trim()
    if (!text || busy) return

    setBusy(true)
    setNote(null)

    const item: Pending = { clientId: uuid(), body: text, sealed, spoken }

    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(item),
    }).catch(() => null)

    if (!res?.ok) {
      addToOutbox(item)
      reset()
      setNote('Saved on this device — it will send when you reconnect.')
      setBusy(false)
      return
    }

    const json = await res.json()
    reset()

    // Writing-from-a-recommendation completed — record that it was taken up.
    // Fire-and-forget: a failed marker never blocks the save that mattered.
    if (recId) {
      fetch(`/api/recommendations/${recId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'use' }),
      }).catch(() => null)
    }

    if (json.entry?.verdict) setVerdict(json.entry as Verdict)
    else setNote(sealed ? 'Sealed. Not sent to Grok.' : 'Saved.')

    setBusy(false)
  }

  function reset() {
    setBody('')
    setSealed(false)
    setSpoken(false)
  }

  if (verdict) {
    const copy = VERDICT_COPY[verdict.verdict]
    return (
      <div className="flex min-h-[70dvh] flex-col justify-center gap-6">
        <div>
          <p className={clsx('text-sm font-semibold', copy.tone)}>
            {copy.label}
          </p>
          <p className="mt-2 text-base/7 text-zinc-700 dark:text-zinc-300">
            {verdict.reason}
          </p>
        </div>

        {verdict.verdict === 'post' && (
          <p className="rounded-2xl bg-zinc-100 p-4 text-[15px]/6 whitespace-pre-wrap text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            {verdict.suggested}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setVerdict(null)}
            className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-950"
          >
            Write another
          </button>
          {verdict.verdict !== 'private' && (
            <a
              href="/admin"
              className="rounded-full px-5 py-2.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 dark:text-zinc-400 dark:ring-white/15"
            >
              Review
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[78dvh] flex-col">
      {/* Top bar: date grounds the page; Save stays reachable above the
          keyboard. Sealed is a mode you set before writing, so it lives here
          too rather than hiding at the bottom. */}
      <header className="flex items-center justify-between gap-3 pb-4">
        <span className="text-sm text-zinc-400 dark:text-zinc-500">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSealed((s) => !s)}
            aria-pressed={sealed}
            title="Sealed entries are never sent to Grok"
            className={clsx(
              'flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors',
              sealed
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                : 'text-zinc-500 ring-1 ring-zinc-950/10 dark:text-zinc-400 dark:ring-white/15',
            )}
          >
            <LockIcon className="size-3.5" />
            {sealed ? 'Sealed' : 'Seal'}
          </button>
          <button
            onClick={save}
            disabled={busy || !body.trim()}
            className={clsx(
              'rounded-full px-5 py-2 text-sm font-medium transition-colors',
              busy || !body.trim()
                ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600'
                : 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950',
            )}
          >
            {busy ? 'Thinking…' : 'Save'}
          </button>
        </div>
      </header>

      <textarea
        ref={box}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What are you thinking?"
        autoFocus
        className="w-full grow resize-none border-0 bg-transparent text-[18px]/8 text-zinc-950 outline-none placeholder:text-zinc-300 dark:text-white dark:placeholder:text-zinc-700"
      />

      {note && (
        <p className="pb-3 text-center text-sm text-amber-600 dark:text-amber-400">
          {note}
        </p>
      )}

      {/* The one floating action. Recording swells it into a live chip. */}
      {canRecord && (
        <div className="pointer-events-none sticky bottom-4 flex justify-end">
          {recorder.state === 'idle' && (
            <button
              type="button"
              onClick={recorder.toggle}
              disabled={busy}
              aria-label="Record a voice note"
              className="pointer-events-auto flex size-16 items-center justify-center rounded-full bg-zinc-950 text-white shadow-lg shadow-zinc-950/20 transition-transform active:scale-95 disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:shadow-black/40"
            >
              <MicIcon className="size-7" />
            </button>
          )}
          {recorder.state === 'recording' && (
            <button
              type="button"
              onClick={recorder.toggle}
              aria-label="Stop recording"
              className="pointer-events-auto flex items-center gap-3 rounded-full bg-red-600 py-4 pr-6 pl-5 text-white shadow-lg shadow-red-600/30 transition-transform active:scale-95"
            >
              <span className="relative flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
                <span className="relative inline-flex size-3 rounded-full bg-white" />
              </span>
              <span className="text-base font-medium tabular-nums">
                {recorder.elapsed}
              </span>
              <span className="size-4 rounded-[3px] bg-white" />
            </button>
          )}
          {recorder.state === 'transcribing' && (
            <div className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-zinc-100 px-5 py-4 text-sm text-zinc-600 shadow-lg dark:bg-zinc-900 dark:text-zinc-300">
              <span className="size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
              Transcribing…
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
    </svg>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

async function send(item: Pending) {
  const res = await fetch('/api/journal', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(item),
  }).catch(() => null)
  return Boolean(res?.ok)
}

function readOutbox(): Pending[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(OUTBOX) ?? '[]')
  } catch {
    return []
  }
}

function addToOutbox(item: Pending) {
  localStorage.setItem(OUTBOX, JSON.stringify([...readOutbox(), item]))
}

function removeFromOutbox(clientId: string) {
  localStorage.setItem(
    OUTBOX,
    JSON.stringify(readOutbox().filter((i) => i.clientId !== clientId)),
  )
}
