'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { Text } from '@/components/ui/text'

const CADENCES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const

export function SubscribeForm({
  /** Off where surrounding copy already makes the pitch. */
  showBlurb = true,
  /** Always stack — the sidebar is ~14rem, too narrow for a side-by-side row. */
  compact = false,
}: {
  showBlurb?: boolean
  compact?: boolean
} = {}) {
  const [cadence, setCadence] = useState<string>('weekly')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  )

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('sending')

    const res = await fetch('/api/subscribe', {
      method: 'POST',
      body: new FormData(e.currentTarget),
    }).catch(() => null)

    setState(res?.ok ? 'sent' : 'error')
  }

  if (state === 'sent') {
    return (
      <div className="rounded-2xl bg-zinc-50 p-5 ring-1 ring-zinc-950/5 dark:bg-zinc-800/50 dark:ring-white/10">
        <Text>Check your inbox — confirm the link and you&apos;re in.</Text>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className={clsx(
        'rounded-2xl bg-zinc-50 ring-1 ring-zinc-950/5 dark:bg-zinc-800/50 dark:ring-white/10',
        compact ? 'p-4' : 'p-5',
      )}
    >
      {showBlurb && (
        <Text className="mb-4">
          Full posts in your inbox. No click-through, no summary.
        </Text>
      )}

      <div className="flex flex-wrap gap-2">
        {CADENCES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCadence(c.value)}
            aria-pressed={cadence === c.value}
            className={clsx(
              'rounded-full px-3 py-1 text-sm transition-colors',
              cadence === c.value
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                : 'text-zinc-600 ring-1 ring-zinc-950/10 hover:bg-white dark:text-zinc-400 dark:ring-white/15 dark:hover:bg-zinc-800',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="cadence" value={cadence} />

      <div
        className={clsx(
          'mt-4 flex flex-col gap-2',
          !compact && 'sm:flex-row',
        )}
      >
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="min-w-0 grow rounded-lg bg-white px-3 py-2 text-sm text-zinc-950 ring-1 ring-zinc-950/10 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-950 dark:bg-zinc-900 dark:text-white dark:ring-white/15 dark:focus:ring-white"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="shrink-0 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-zinc-950"
        >
          {state === 'sending' ? 'Sending…' : 'Subscribe'}
        </button>
      </div>

      {state === 'error' && (
        <Text className="mt-3 text-red-600 dark:text-red-400">
          That didn&apos;t work. Check the address and try again.
        </Text>
      )}
    </form>
  )
}
