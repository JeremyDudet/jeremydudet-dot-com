'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * "N still processing" — and the second sweep trigger: opening Needs you
 * while entries are unjudged fires the sweep (session auth) and refreshes
 * once it has had time to work. By the time you're looking, it's judging.
 */
export function ProcessingNotice({ count }: { count: number }) {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/journal/process', { method: 'POST' }).catch(() => null)
    const timer = setTimeout(() => router.refresh(), 15_000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <p className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
      <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
      {count === 1
        ? 'One thought still processing — its verdict lands here shortly.'
        : `${count} thoughts still processing — their verdicts land here shortly.`}
    </p>
  )
}
