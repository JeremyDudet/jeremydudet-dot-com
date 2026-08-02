#!/usr/bin/env node
/**
 * Reconcile the LinkedIn cross-post queue against what you've *already* posted
 * there by hand.
 *
 *   1. linkedin.com/mypreferences/d/download-my-data → pick "Posts"
 *   2. unzip; find Shares.csv
 *   3. npm run linkedin:import -- ~/Downloads/Shares.csv          # dry run
 *   4. npm run linkedin:import -- ~/Downloads/Shares.csv --apply  # commit
 *
 * Exists because LinkedIn's read scope (r_member_social) is closed — there is
 * no API that can answer "what have I already posted?", so the export is the
 * only source of truth.
 *
 * Dry run by default: it prints what it would mark and changes nothing.
 */
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const [file, ...flags] = process.argv.slice(2)
const apply = flags.includes('--apply')
const THRESHOLD = 0.55 // token overlap above which two posts are "the same"

if (!file) {
  console.error('Usage: npm run linkedin:import -- <Shares.csv> [--apply]')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

/** Minimal RFC-4180 parser — LinkedIn quotes fields containing newlines. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

/** Strip everything that differs between an X post and its LinkedIn retelling. */
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(s) {
  return new Set(normalize(s).split(' ').filter((w) => w.length > 3))
}

/** Containment, not Jaccard: a LinkedIn expansion of an X post is still a match. */
function overlap(a, b) {
  const A = tokens(a)
  const B = tokens(b)
  if (!A.size || !B.size) return 0
  let hits = 0
  for (const t of A) if (B.has(t)) hits++
  return hits / Math.min(A.size, B.size)
}

const rows = parseCsv(readFileSync(file, 'utf8'))
const header = rows[0].map((h) => h.trim().toLowerCase())
const idx = {
  date: header.findIndex((h) => h.includes('date')),
  text: header.findIndex((h) => h.includes('commentary') || h.includes('sharecommentary')),
  link: header.findIndex((h) => h.includes('sharelink') || h.includes('url')),
}
if (idx.text === -1) {
  console.error('No commentary column found. Columns were:', header.join(', '))
  process.exit(1)
}

const shares = rows
  .slice(1)
  .map((r) => ({ date: r[idx.date], text: r[idx.text], link: r[idx.link] }))
  .filter((s) => s.text && s.text.trim())

console.log(`Read ${shares.length} LinkedIn posts from the export.\n`)

const sql = neon(process.env.DATABASE_URL)
const queued = await sql`
  select s.post_id, s.body, s.status, p.text as original, p.created_at
  from syndications s join posts p on p.id = s.post_id
  where s.target = 'linkedin' and s.status = 'pending'
  order by p.created_at desc
`

if (!queued.length) {
  console.log('Nothing pending. Nothing to reconcile.')
  process.exit(0)
}

const matched = []
const clean = []

for (const item of queued) {
  let best = { score: 0, share: null }
  for (const share of shares) {
    // Compare against both the original post and Grok's rewrite.
    const score = Math.max(
      overlap(item.original, share.text),
      overlap(item.body, share.text),
    )
    if (score > best.score) best = { score, share }
  }
  ;(best.score >= THRESHOLD ? matched : clean).push({ item, ...best })
}

console.log(`ALREADY ON LINKEDIN — would mark skipped (${matched.length}):`)
for (const m of matched) {
  console.log(`  ${(m.score * 100).toFixed(0)}%  ${m.item.original.replace(/\n/g, ' ').slice(0, 70)}…`)
}

console.log(`\nNOT FOUND — would stay queued (${clean.length}):`)
for (const c of clean) {
  const near = c.score > 0.3 ? ` (closest ${(c.score * 100).toFixed(0)}%)` : ''
  console.log(`  ${c.item.original.replace(/\n/g, ' ').slice(0, 70)}…${near}`)
}

if (!apply) {
  console.log('\nDry run — nothing changed. Re-run with --apply to commit.')
  process.exit(0)
}

for (const m of matched) {
  await sql`
    update syndications
       set status = 'skipped',
           reason = ${'already posted to LinkedIn manually (' + (m.score * 100).toFixed(0) + '% match)'}
     where post_id = ${m.item.post_id} and target = 'linkedin'
  `
}
console.log(`\nMarked ${matched.length} as already posted.`)
