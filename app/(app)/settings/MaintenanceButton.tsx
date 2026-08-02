'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function MaintenanceButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setNote(null)
    const res = await fetch('/api/maintain', { method: 'POST' }).catch(
      () => null,
    )
    const json = res ? await res.json().catch(() => null) : null

    if (!res?.ok) {
      setNote(json?.error ?? 'Maintenance failed.')
    } else if (json.proposed === 0) {
      setNote('Librarian found nothing to suggest.')
    } else {
      setNote(
        `${json.proposed} suggestion${json.proposed === 1 ? '' : 's'} queued — they are waiting in Review.`,
      )
    }
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
        {busy ? 'Sweeping…' : 'Run maintenance now'}
      </button>
      {note && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{note}</p>
      )}
    </div>
  )
}
