'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'

const LENGTH = 6
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

/**
 * On-screen keypad rather than a text input — a numeric input would raise the
 * iOS keyboard over half the screen. Keys are true circles (cells in the grid
 * stretch, so the circle must size itself, not inherit the cell), the pad sits
 * in the lower half where thumbs are, and a wrong code shakes the dots the way
 * the iOS lock screen does.
 */
export function Keypad() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/journal'

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)

  const submit = useCallback(
    async (passcode: string) => {
      setBusy(true)
      setError(null)

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passcode }),
      }).catch(() => null)

      if (res?.ok) {
        // replace() so Back doesn't land on a login that redirects away.
        router.replace(next)
        return
      }

      const detail = res ? (await res.json().catch(() => null))?.error : null
      setError(detail ?? 'Could not reach the server')
      setShake((s) => s + 1)
      setCode('')
      setBusy(false)
    },
    [next, router],
  )

  useEffect(() => {
    if (code.length === LENGTH && !busy) submit(code)
  }, [code, busy, submit])

  // Physical keyboard, for desktop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (busy) return
      if (/^[0-9]$/.test(e.key)) setCode((c) => (c + e.key).slice(0, LENGTH))
      else if (e.key === 'Backspace') setCode((c) => c.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy])

  function press(key: string) {
    if (busy || !key) return
    setError(null)
    if (key === '⌫') setCode((c) => c.slice(0, -1))
    else setCode((c) => (c + key).slice(0, LENGTH))
  }

  return (
    <div className="flex min-h-[88dvh] flex-col items-center">
      {/* Identity + progress, upper third */}
      <div className="mt-[14dvh] flex flex-col items-center">
        <h1 className="text-xl font-semibold text-zinc-950 dark:text-white">
          Journal
        </h1>
        <p className="mt-1.5 text-sm text-zinc-400 dark:text-zinc-500">
          Enter passcode
        </p>

        <div
          key={shake}
          className={clsx(
            'mt-7 flex gap-4',
            shake > 0 && 'animate-[keypad-shake_0.4s_ease-in-out]',
            busy && 'animate-pulse',
          )}
          aria-label={`${code.length} of ${LENGTH} digits entered`}
        >
          {Array.from({ length: LENGTH }, (_, i) => (
            <span
              key={i}
              className={clsx(
                'size-3.5 rounded-full transition-colors duration-150',
                i < code.length
                  ? 'bg-zinc-950 dark:bg-white'
                  : 'bg-zinc-200 dark:bg-zinc-700',
              )}
            />
          ))}
        </div>

        <p
          role="status"
          className={clsx(
            'mt-4 h-5 text-sm',
            error ? 'text-red-600 dark:text-red-400' : 'text-transparent',
          )}
        >
          {error ?? '·'}
        </p>
      </div>

      {/* Keypad, lower half — thumb territory */}
      <div className="mt-auto mb-4 grid grid-cols-3 place-items-center gap-x-7 gap-y-4">
        {KEYS.map((key, i) =>
          key === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(key)}
              disabled={busy}
              className={clsx(
                'flex size-[74px] items-center justify-center rounded-full transition-all duration-100 select-none active:scale-95 disabled:opacity-40',
                key === '⌫'
                  ? 'text-xl text-zinc-400 active:text-zinc-600 dark:text-zinc-500 dark:active:text-zinc-300'
                  : 'bg-zinc-100 text-[28px] font-light tabular-nums text-zinc-950 active:bg-zinc-300 dark:bg-zinc-900 dark:text-white dark:active:bg-zinc-700',
              )}
            >
              {key}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
