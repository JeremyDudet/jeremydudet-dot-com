#!/usr/bin/env node
/**
 * List the social accounts connected to Late/Zernio and print the
 * LATE_ACCOUNTS line to paste into .env.local.
 *
 *   npm run late:accounts
 *
 * Connect accounts in their dashboard first — this only reads them back.
 */
const key = process.env.LATE_API_KEY
const base = process.env.LATE_API_BASE ?? 'https://getlate.dev/api/v1'

if (!key) {
  console.error('LATE_API_KEY is not set in .env.local')
  process.exit(1)
}

const res = await fetch(`${base}/accounts`, {
  headers: { authorization: `Bearer ${key}` },
})

if (!res.ok) {
  console.error(`Failed: ${res.status} ${await res.text()}`)
  process.exit(1)
}

const { accounts = [], hasAnalyticsAccess } = await res.json()

if (!accounts.length) {
  console.log('No accounts connected yet.\n')
  console.log('Connect X and LinkedIn in the Late/Zernio dashboard, then')
  console.log('re-run this command.\n')
  console.log('LinkedIn note: pick your PERSONAL PROFILE, not a Company Page —')
  console.log('the pipeline posts as you, and pages are a different connection.')
  process.exit(0)
}

console.log(`Connected accounts (analytics access: ${hasAnalyticsAccess}):\n`)
for (const a of accounts) {
  const id = a._id ?? a.id
  const who = a.username ?? a.displayName ?? '(unnamed)'
  const active = a.isActive === false ? '  [INACTIVE]' : ''
  console.log(`  ${String(a.platform).padEnd(12)} ${who.padEnd(24)} ${id}${active}`)
}

const pairs = accounts
  .filter((a) => a.isActive !== false)
  .map((a) => `${a.platform}:${a._id ?? a.id}`)
  .join(',')

console.log(`\nPaste into .env.local:\n\nLATE_ACCOUNTS=${pairs}\n`)
console.log('Then set SOCIAL_PROVIDER=late to switch publishing over.')
