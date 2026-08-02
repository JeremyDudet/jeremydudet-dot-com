'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function logout() {
    setBusy(true)
    await fetch('/api/auth', { method: 'DELETE' }).catch(() => null)
    // refresh() so the server components re-run and the middleware redirect
    // fires — a plain push would render a cached authed shell first.
    router.replace('/login')
    router.refresh()
  }

  return (
    <button
      onClick={logout}
      disabled={busy}
      className="rounded-full px-4 py-2 text-sm font-medium text-red-600 ring-1 ring-red-600/20 disabled:opacity-40 dark:text-red-400 dark:ring-red-400/25"
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
