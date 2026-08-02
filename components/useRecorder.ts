'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type State = 'idle' | 'recording' | 'transcribing'

/**
 * Tap to start, tap to stop — never press-and-hold. Holding a button is fine
 * for a two-second voice memo and wrong for thinking out loud, which is what
 * this is for.
 *
 * iOS caveat: `getUserMedia` is unreliable in an installed PWA (it may never
 * prompt, or work once and then fail until a device restart). The failure is
 * surfaced with a specific message rather than a generic one, because the fix
 * — open in Safari instead — is not something a user would guess.
 */
export function useRecorder({
  onText,
  onError,
}: {
  onText: (text: string) => void
  onError: (message: string) => void
}) {
  const [state, setState] = useState<State>('idle')
  const [seconds, setSeconds] = useState(0)

  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    // Releases the mic — without this iOS keeps the orange indicator lit and
    // holds audio routing to the speaker.
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    recorder.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  const stop = useCallback(() => {
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }, [])

  const start = useCallback(async () => {
    // `navigator.mediaDevices` only exists in a secure context. Over plain
    // HTTP on an IP (a Tailscale address, say) it is undefined outright —
    // which looks like "no microphone" but is really "no HTTPS". Name the
    // actual cause, because the fix is not something you would guess.
    if (!window.isSecureContext) {
      onError(
        `Voice needs HTTPS. This page is on ${window.location.protocol}//${window.location.host} — open it over https, or on localhost.`,
      )
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      onError('This browser will not give the page a microphone.')
      return
    }

    let media: MediaStream
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      onError(
        'No microphone access. On iOS this often fails in an installed app — try opening in Safari.',
      )
      return
    }

    stream.current = media
    chunks.current = []
    setSeconds(0)

    // Let the browser choose: iOS Safari produces audio/mp4, Chrome webm.
    // Forcing a mimeType throws on Safari.
    const rec = new MediaRecorder(media)
    recorder.current = rec

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data)
    }

    rec.onstop = async () => {
      cleanup()
      const type = rec.mimeType || 'audio/mp4'
      const blob = new Blob(chunks.current, { type })

      if (blob.size < 1000) {
        setState('idle')
        onError('That was too short to hear.')
        return
      }

      setState('transcribing')
      const ext = type.includes('mp4') || type.includes('mpeg') ? 'm4a' : 'webm'
      const form = new FormData()
      form.append('audio', new File([blob], `note.${ext}`, { type }))

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: form,
      }).catch(() => null)

      setState('idle')

      if (!res?.ok) {
        const detail = res ? (await res.json().catch(() => null))?.error : null
        onError(detail ?? 'Could not reach the transcriber.')
        return
      }

      const { text } = await res.json()
      if (text) onText(text)
    }

    rec.start()
    setState('recording')
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000)
  }, [cleanup, onError, onText])

  const toggle = useCallback(() => {
    if (state === 'recording') stop()
    else if (state === 'idle') start()
  }, [state, start, stop])

  const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  return { state, elapsed, toggle }
}
