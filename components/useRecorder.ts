'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { uuid } from '@/lib/uuid'
import {
  deleteRecording,
  listRecordings,
  saveRecording,
} from '@/lib/audio-outbox'

type State = 'idle' | 'recording' | 'transcribing'

/**
 * Tap to start, tap to stop — never press-and-hold. Holding a button is fine
 * for a two-second voice memo and wrong for thinking out loud, which is what
 * this is for.
 *
 * Durability (`durable: true`, the composer): the recording is persisted to
 * IndexedDB every few seconds WHILE being made and only deleted once its
 * transcript is delivered. A dead transcriber, a killed PWA, or iOS
 * suspending the page loses seconds, not the thought. Backgrounding the page
 * mid-recording auto-stops it — iOS halts the recorder anyway, so stopping
 * cleanly means what was said still gets transcribed. Unsent recordings are
 * recovered on the next mount and when the network returns.
 *
 * iOS caveat: `getUserMedia` is unreliable in an installed PWA (it may never
 * prompt, or work once and then fail until a device restart). The failure is
 * surfaced with a specific message rather than a generic one, because the fix
 * — open in Safari instead — is not something a user would guess.
 */
export function useRecorder({
  onText,
  onError,
  durable = false,
}: {
  onText: (text: string) => void
  onError: (message: string) => void
  durable?: boolean
}) {
  const [state, setState] = useState<State>('idle')
  const [seconds, setSeconds] = useState(0)

  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const recordingId = useRef<string | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const recovering = useRef(false)

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

  // iOS halts recording when the PWA is backgrounded or the screen locks.
  // Stopping cleanly on the way out turns "suspended mid-dictation" into
  // "what you said so far gets transcribed".
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) stop()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', stop)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', stop)
    }
  }, [stop])

  // Recover recordings whose transcription never completed. Durable only —
  // and one at a time, oldest first, so a burst can't hammer the API.
  useEffect(() => {
    if (!durable) return

    const recover = async () => {
      if (recovering.current) return
      recovering.current = true
      try {
        for (const pending of await listRecordings()) {
          if (pending.id === recordingId.current) continue // still in flight
          if (pending.blob.size < 1000) {
            await deleteRecording(pending.id) // too short to ever transcribe
            continue
          }
          const result = await transcribe(pending.blob)
          if (result.ok) {
            await deleteRecording(pending.id)
            onText(result.text)
            onError('Recovered an unsent voice note.')
          } else if (result.permanent) {
            await deleteRecording(pending.id)
          } else {
            break // transcriber unreachable — retry on the next trigger
          }
        }
      } finally {
        recovering.current = false
      }
    }

    recover()
    window.addEventListener('online', recover)
    return () => window.removeEventListener('online', recover)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durable])

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
    recordingId.current = uuid()
    setSeconds(0)

    // Let the browser choose: iOS Safari produces audio/mp4, Chrome webm.
    // Forcing a mimeType throws on Safari.
    const rec = new MediaRecorder(media)
    recorder.current = rec
    const startedAt = Date.now()

    rec.ondataavailable = (e) => {
      if (e.data.size === 0) return
      chunks.current.push(e.data)
      // Persist the whole recording so far on every chunk. Cheap at this
      // cadence, and it is what makes a mid-recording death survivable.
      if (durable && recordingId.current) {
        void saveRecording({
          id: recordingId.current,
          blob: new Blob(chunks.current, { type: rec.mimeType || 'audio/mp4' }),
          createdAt: startedAt,
        })
      }
    }

    rec.onstop = async () => {
      cleanup()
      const id = recordingId.current
      const type = rec.mimeType || 'audio/mp4'
      const blob = new Blob(chunks.current, { type })

      if (blob.size < 1000) {
        setState('idle')
        recordingId.current = null
        if (durable && id) void deleteRecording(id)
        onError('That was too short to hear.')
        return
      }

      setState('transcribing')
      const result = await transcribe(blob)
      setState('idle')
      recordingId.current = null

      if (result.ok) {
        if (durable && id) void deleteRecording(id)
        onText(result.text)
        return
      }

      if (durable && !result.permanent) {
        // The recording is safe in the outbox; recovery retries it.
        onError('Could not transcribe — the recording is saved and will retry.')
      } else {
        if (durable && id) void deleteRecording(id)
        onError(result.message)
      }
    }

    // The 5s timeslice exists for durability, but chunked delivery is
    // harmless when durable is off.
    rec.start(5000)
    setState('recording')
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000)
  }, [cleanup, durable, onError, onText])

  const toggle = useCallback(() => {
    if (state === 'recording') stop()
    else if (state === 'idle') start()
  }, [state, start, stop])

  const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  return { state, elapsed, toggle }
}

/**
 * `permanent: true` means retrying the same audio can never succeed (the
 * server rejected it), so the outbox should drop it; false means the
 * transcriber was unreachable and the audio is worth keeping.
 */
async function transcribe(
  blob: Blob,
): Promise<
  | { ok: true; text: string }
  | { ok: false; permanent: boolean; message: string }
> {
  const type = blob.type || 'audio/mp4'
  const ext = type.includes('mp4') || type.includes('mpeg') ? 'm4a' : 'webm'
  const form = new FormData()
  form.append('audio', new File([blob], `note.${ext}`, { type }))

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    body: form,
  }).catch(() => null)

  if (!res) {
    return { ok: false, permanent: false, message: 'Could not reach the transcriber.' }
  }
  if (!res.ok) {
    const detail = (await res.json().catch(() => null))?.error
    return {
      ok: false,
      // 4xx = this audio will never transcribe; 5xx = provider hiccup.
      // 401 is the session expiring, not the audio's fault — keep it.
      permanent: res.status >= 400 && res.status < 500 && res.status !== 401,
      message: detail ?? 'Could not transcribe that.',
    }
  }

  const { text } = await res.json()
  if (!text) {
    return { ok: false, permanent: true, message: 'Nothing to transcribe.' }
  }
  return { ok: true, text }
}
