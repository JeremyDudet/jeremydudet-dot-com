'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CurateButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setNote(null)
    const res = await fetch('/api/curate', { method: 'POST' }).catch(() => null)
    const json = res ? await res.json().catch(() => null) : null

    if (!res?.ok) setNote(json?.error ?? 'Curation failed.')
    else
      setNote(
        json.count === 0
          ? 'Nothing worth pushing today — the greeting explains.'
          : `${json.count} candidate${json.count === 1 ? '' : 's'} — see Write or Review.`,
      )
    setBusy(false)
    router.refresh()
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={busy}
        className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950"
      >
        {busy ? 'Re-reading everything…' : 'Re-evaluate now'}
      </button>
      {note && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{note}</p>
      )}
    </div>
  )
}
