#!/usr/bin/env node
/**
 * One-time: obtain an X OAuth 2.0 refresh token and seed the `oauth` row.
 *
 *   node scripts/x-auth.mjs
 *
 * X rotates the refresh token on every exchange, so it lives in the database,
 * not in an env var. Run this once — after that lib/x.ts keeps it fresh.
 *
 * In the X developer portal, set the app's callback to
 * http://127.0.0.1:8787/callback and enable OAuth 2.0 with PKCE.
 */
import { createServer } from 'node:http'
import { createHash, randomBytes } from 'node:crypto'
import { neon } from '@neondatabase/serverless'

const { X_CLIENT_ID, X_CLIENT_SECRET, DATABASE_URL } = process.env
const REDIRECT = 'http://127.0.0.1:8787/callback'
// tweet.write is needed to publish from the journal; offline.access is what
// returns the refresh token, without which this dies after ~2 hours.
const SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'offline.access',
].join(' ')

if (!X_CLIENT_ID || !X_CLIENT_SECRET || !DATABASE_URL) {
  console.error('Set X_CLIENT_ID, X_CLIENT_SECRET and DATABASE_URL first.')
  process.exit(1)
}

const verifier = randomBytes(32).toString('base64url')
const challenge = createHash('sha256').update(verifier).digest('base64url')
const state = randomBytes(16).toString('base64url')

const authUrl = `https://x.com/i/oauth2/authorize?${new URLSearchParams({
  response_type: 'code',
  client_id: X_CLIENT_ID,
  redirect_uri: REDIRECT,
  scope: SCOPES,
  state,
  code_challenge: challenge,
  code_challenge_method: 'S256',
})}`

console.log('\nOpen this and authorize:\n')
console.log(authUrl, '\n')

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8787')
  if (url.pathname !== '/callback') return res.end()

  if (url.searchParams.get('state') !== state) {
    res.writeHead(400).end('state mismatch')
    return
  }

  const basic = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString(
    'base64',
  )
  const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: url.searchParams.get('code'),
      redirect_uri: REDIRECT,
      code_verifier: verifier,
    }),
  })

  const token = await tokenRes.json()
  if (!tokenRes.ok) {
    console.error('Token exchange failed:', token)
    res.writeHead(500).end('failed — see terminal')
    return server.close()
  }

  const me = await fetch('https://api.x.com/2/users/me', {
    headers: { authorization: `Bearer ${token.access_token}` },
  }).then((r) => r.json())

  const sql = neon(DATABASE_URL)
  await sql`
    insert into oauth (id, access_token, refresh_token, expires_at)
    values ('x', ${token.access_token}, ${token.refresh_token},
            ${new Date(Date.now() + token.expires_in * 1000).toISOString()})
    on conflict (id) do update set
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at
  `

  console.log(`\nSeeded. Add this to your env:\n`)
  console.log(`X_USER_ID=${me.data.id}   # @${me.data.username}\n`)

  res.end('Done — close this tab.')
  server.close()
})

server.listen(8787, '127.0.0.1')
