#!/usr/bin/env node
/**
 * Authorize LinkedIn posting. Run this now, and again every ~60 days.
 *
 *   npm run linkedin:auth
 *
 * Self-serve apps get a 60-day access token and NO refresh token — programmatic
 * refresh is limited to approved Marketing Developer Platform partners. There
 * is no way to automate this step; re-running it is the maintenance cost.
 *
 * In the LinkedIn developer portal:
 *   - Products tab → add "Share on LinkedIn" (grants w_member_social)
 *                  → add "Sign In with LinkedIn using OpenID Connect"
 *   - Auth tab → Authorized redirect URL: http://localhost:8788/callback
 */
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { neon } from '@neondatabase/serverless'

const { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, DATABASE_URL } = process.env
const REDIRECT = 'http://localhost:8788/callback'
const SCOPES = ['openid', 'profile', 'w_member_social'].join(' ')

if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET || !DATABASE_URL) {
  console.error(
    'Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET and DATABASE_URL first.',
  )
  process.exit(1)
}

const state = randomBytes(16).toString('base64url')

const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${new URLSearchParams(
  {
    response_type: 'code',
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: REDIRECT,
    state,
    scope: SCOPES,
  },
)}`

console.log('\nOpen this and authorize:\n')
console.log(authUrl, '\n')

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:8788')
  if (url.pathname !== '/callback') return res.end()

  if (url.searchParams.get('error')) {
    console.error('Denied:', url.searchParams.get('error_description'))
    res.writeHead(400).end('denied — see terminal')
    return server.close()
  }
  if (url.searchParams.get('state') !== state) {
    res.writeHead(400).end('state mismatch')
    return
  }

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: url.searchParams.get('code'),
      redirect_uri: REDIRECT,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
    }),
  })

  const token = await tokenRes.json()
  if (!tokenRes.ok) {
    console.error('Token exchange failed:', token)
    res.writeHead(500).end('failed — see terminal')
    return server.close()
  }

  // OpenID Connect userinfo gives `sub`, which is the person id.
  const me = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { authorization: `Bearer ${token.access_token}` },
  }).then((r) => r.json())

  if (!me.sub) {
    console.error('Could not read person id from /v2/userinfo:', me)
    res.writeHead(500).end('failed — see terminal')
    return server.close()
  }

  const personUrn = `urn:li:person:${me.sub}`
  const expiresAt = new Date(Date.now() + token.expires_in * 1000)

  const sql = neon(DATABASE_URL)
  await sql`
    insert into oauth (id, access_token, refresh_token, expires_at, subject)
    values ('linkedin', ${token.access_token}, ${token.refresh_token ?? null},
            ${expiresAt.toISOString()}, ${personUrn})
    on conflict (id) do update set
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      subject = excluded.subject
  `

  const days = Math.round(token.expires_in / 86400)
  console.log(`\nAuthorized as ${me.name ?? personUrn}`)
  console.log(`Person URN: ${personUrn}`)
  console.log(`Token valid ${days} days — expires ${expiresAt.toDateString()}`)
  if (!token.refresh_token) {
    console.log('\nNo refresh token (expected for self-serve apps).')
    console.log('Re-run this command before the expiry date above.\n')
  }

  res.end('Done — close this tab.')
  server.close()
})

server.listen(8788, 'localhost')
