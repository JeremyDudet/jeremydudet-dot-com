'use client'

import { useRef, useState } from 'react'
import { useRecorder } from '@/components/useRecorder'

/**
 * The reject-with-feedback panel. Speaking or typing why teaches the system;
 * "Just reject" keeps one-tap rejection legal — feedback is always optional,
 * never friction.
 */
export function FeedbackInput({
  busy,
  canRecord,
  onSubmit,
  submitLabel = 'Reject with this',
  skipLabel = 'Just reject',
}: {
  busy: boolean
  canRecord: boolean
  onSubmit: (feedback: { text: string; spoken: boolean } | null) => void
  submitLabel?: string
  skipLabel?: string
}) {
  const [text, setText] = useState('')
  const [spoken, setSpoken] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const box = useRef<HTMLTextAreaElement>(null)

  const recorder = useRecorder({
    onText: (t) => {
      setSpoken(true)
      setText((b) => (b ? `${b.trim()}\n\n${t}` : t))
      box.current?.focus()
    },
    onError: setNote,
  })

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-end gap-2">
        <textarea
          ref={box}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Why not? Say it in your own words — it tunes future proposals."
          autoFocus
          className="w-full resize-none rounded-xl bg-zinc-50 p-3 text-sm text-zinc-950 ring-1 ring-zinc-950/10 outline-none placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-white dark:ring-white/15 dark:placeholder:text-zinc-600"
        />
        {canRecord && recorder.state === 'idle' && (
          <button
            type="button"
            onClick={recorder.toggle}
            disabled={busy}
            aria-label="Dictate feedback"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white transition-transform active:scale-95 disabled:opacity-40 dark:bg-white dark:text-zinc-950"
          >
            <MicIcon className="size-5" />
          </button>
        )}
        {canRecord && recorder.state === 'recording' && (
          <button
            type="button"
            onClick={recorder.toggle}
            aria-label="Stop recording"
            className="flex shrink-0 items-center gap-2 rounded-full bg-red-600 px-4 py-3 text-white transition-transform active:scale-95"
          >
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-white" />
            </span>
            <span className="text-sm font-medium tabular-nums">
              {recorder.elapsed}
            </span>
          </button>
        )}
        {canRecord && recorder.state === 'transcribing' && (
          <div className="flex shrink-0 items-center gap-2 rounded-full bg-zinc-100 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            <span className="size-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          </div>
        )}
      </div>

      {note && (
        <p className="text-sm text-amber-600 dark:text-amber-400">{note}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy || !text.trim()}
          onClick={() => onSubmit({ text: text.trim(), spoken })}
          className="rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-30 dark:bg-white dark:text-zinc-950"
        >
          {submitLabel}
        </button>
        <button
          disabled={busy}
          onClick={() => onSubmit(null)}
          className="rounded-full px-4 py-2.5 text-sm text-zinc-600 ring-1 ring-zinc-950/10 disabled:opacity-30 dark:text-zinc-400 dark:ring-white/15"
        >
          {skipLabel}
        </button>
      </div>
    </div>
  )
}

/** The collapsed card after a reject: six seconds to take it back. */
export function UndoBar({
  label,
  busy,
  onUndo,
}: {
  label: string
  busy: boolean
  onUndo: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl p-4 ring-1 ring-zinc-950/5 dark:ring-white/10">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <button
        disabled={busy}
        onClick={onUndo}
        className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-zinc-950 ring-1 ring-zinc-950/10 disabled:opacity-30 dark:text-white dark:ring-white/15"
      >
        Undo
      </button>
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
