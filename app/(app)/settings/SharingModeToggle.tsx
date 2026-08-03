'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import type { SharingMode } from '@/lib/db/schema'

const MODES: { value: SharingMode; label: string; blurb: string }[] = [
  {
    value: 'template',
    label: 'Templates',
    blurb: 'Outlines with gaps — you write every sentence.',
  },
  {
    value: 'draft',
    blurb: 'Editable drafts from your own material — you rework them.',
    label: 'Drafts',
  },
]

export function SharingModeToggle({ current }: { current: SharingMode }) {
  const router = useRouter()
  const [mode, setMode] = useState<SharingMode>(current)
  const [busy, setBusy] = useState(false)

  async function choose(value: SharingMode) {
    if (busy || value === mode) return
    setBusy(true)
    setMode(value)
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'sharing_mode', value }),
    }).catch(() => null)
    if (!res?.ok) setMode(mode) // revert on failure
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {MODES.map((m) => (
        <button
          key={m.value}
          onClick={() => choose(m.value)}
          disabled={busy}
          aria-pressed={mode === m.value}
          className={clsx(
            'block w-full rounded-xl p-3 text-left transition-colors',
            mode === m.value
              ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
              : 'ring-1 ring-zinc-950/10 dark:ring-white/15',
          )}
        >
          <span className="text-sm font-medium">{m.label}</span>
          <span
            className={clsx(
              'block text-xs',
              mode === m.value
                ? 'text-zinc-300 dark:text-zinc-600'
                : 'text-zinc-500 dark:text-zinc-400',
            )}
          >
            {m.blurb}
          </span>
        </button>
      ))}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Applies to the curator&apos;s next run. Either way, nothing publishes
        without your explicit steps — this only changes how much scaffolding
        you start from.
      </p>
    </div>
  )
}
