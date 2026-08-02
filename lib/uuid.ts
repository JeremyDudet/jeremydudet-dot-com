/**
 * UUID v4 that works outside a secure context.
 *
 * `crypto.randomUUID()` is secure-context-only, so over plain HTTP (a
 * Tailscale IP, a LAN address) it is undefined and throws on call.
 * `crypto.getRandomValues()` has no such restriction, so derive the UUID from
 * that instead and keep the last resort for environments with neither.
 */
export function uuid(): string {
  const c = globalThis.crypto

  if (typeof c?.randomUUID === 'function') return c.randomUUID()

  if (typeof c?.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join('-')
  }

  // Not a UUID and not unguessable — but this only ever feeds an idempotency
  // key, so uniqueness is all that matters and collisions are the only risk.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`
}
