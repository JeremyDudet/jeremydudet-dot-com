import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { MODEL, xai } from '@/lib/judge'
import {
  entryCounts,
  hasPendingLike,
  insertProposal,
  openThreads,
  threadEntries,
  unthreadedEntries,
} from '@/lib/db/zettel'
import type { JournalEntry, ProposalPayload, ProposalType, Thread } from '@/lib/db/schema'

/**
 * The two agents that maintain the Zettelkasten. Both only *propose* — every
 * suggestion lands in agent_proposals and nothing touches the graph until a
 * human accepts it. Sealed entries never reach either of them.
 */

/* ---------------------------------------------------------------- matcher -- */

// Flat on purpose — xAI supports a practical subset of JSON Schema. Unused
// fields come back empty rather than absent.
const ThreadMatch = z.object({
  decision: z.enum(['join', 'create', 'none', 'split']),
  threadId: z.string(),
  threadName: z.string(),
  threadSummary: z.string(),
  updatedSummary: z.string(),
  parts: z.array(z.string()),
  reasoning: z.string(),
  confidence: z.number(),
})

const MATCHER_RUBRIC = `
You maintain Jeremy Dudet's Zettelkasten. He brain-dumps raw thoughts; ideas
live as THREADS, each with a living summary that evolves as entries join it.
You see the open threads and one new journal entry. Decide how the entry
relates to what he has already been thinking.

Decisions:

"join" — the entry feeds an existing thread. Bias toward this: an idea
  rephrased weeks later in different words is the same idea, and scattered
  near-duplicate threads are the failure mode of this whole system. When
  joining, write updatedSummary: the thread's living summary rewritten to
  absorb what this entry adds. Keep it under 120 words, plain prose, no
  bullet points — it should read as "what this idea currently is".

"create" — a genuinely new idea worth tracking. Set threadName (short, no
  punctuation flourishes) and threadSummary (the idea as it stands, under 80
  words). Not every entry deserves a thread: a one-off observation with no
  future is "none".

"none" — complete in itself, relates to nothing open, unlikely to recur.
  Fine and common. Posted fragments often live happily unthreaded.

"split" — the dump contains two or more genuinely distinct ideas that would
  thread differently. Return the pieces in parts, each self-contained, his
  wording preserved. Do not split a single idea into aspects — only split
  what he would file in different places.

confidence: 0-1, how sure you are of the decision.
reasoning: one sentence to Jeremy. He accepts or rejects every suggestion by
  hand, so say what actually decided it.
`.trim()

function threadDigest(threads: Thread[], counts: Map<string, number>) {
  if (!threads.length) return 'No open threads yet.'
  return threads
    .map((t) => {
      const age = Math.round(
        (Date.now() - t.createdAt.getTime()) / 86_400_000,
      )
      return `[${t.id}] "${t.name}" (${t.state}, ${counts.get(t.id) ?? 0} entries, ${age}d old)\n  ${t.summary}`
    })
    .join('\n\n')
}

/**
 * Judge the new entry against the open threads. Returns the number of
 * proposals queued (0–1). Caller guarantees the entry is not sealed.
 */
export async function matchEntry(entry: {
  id: string
  body: string
}): Promise<number> {
  const threads = await openThreads()
  const counts = await entryCounts()

  const completion = await xai().chat.completions.parse({
    model: MODEL,
    messages: [
      { role: 'system', content: MATCHER_RUBRIC },
      {
        role: 'user',
        content: `OPEN THREADS:\n\n${threadDigest(threads, counts)}\n\nNEW ENTRY:\n\n${entry.body}`,
      },
    ],
    response_format: zodResponseFormat(ThreadMatch, 'thread_match'),
  })

  const m = completion.choices[0]?.message.parsed
  if (!m || m.decision === 'none') return 0

  // The model can only join what it was shown.
  if (m.decision === 'join' && !threads.some((t) => t.id === m.threadId)) return 0

  const proposal =
    m.decision === 'join'
      ? {
          type: 'join_thread' as const,
          payload: {
            entryId: entry.id,
            threadId: m.threadId,
            updatedSummary: m.updatedSummary,
          },
        }
      : m.decision === 'create'
        ? {
            type: 'create_thread' as const,
            payload: {
              entryId: entry.id,
              name: m.threadName,
              summary: m.threadSummary,
            },
          }
        : {
            type: 'split_entry' as const,
            payload: { entryId: entry.id, parts: m.parts },
          }

  await insertProposal({
    ...proposal,
    reasoning: m.reasoning,
    confidence: clamp01(m.confidence),
    source: 'matcher',
  })
  return 1
}

/* -------------------------------------------------------------- librarian -- */

const LibrarianItem = z.object({
  type: z.enum([
    'join_thread',
    'create_thread',
    'merge_threads',
    'link_threads',
    'update_summary',
    'mark_ripe',
    'create_structure_note',
    'archive_orphan',
  ]),
  threadId: z.string(),
  otherThreadId: z.string(),
  threadIds: z.array(z.string()),
  entryId: z.string(),
  name: z.string(),
  text: z.string(),
  reasoning: z.string(),
  confidence: z.number(),
})

const LibrarianReport = z.object({
  proposals: z.array(LibrarianItem),
})

const LIBRARIAN_RUBRIC = `
You are the weekly librarian for Jeremy Dudet's Zettelkasten. You see every
open thread (with its living summary, entry count, and age) and the entries
that belong to no thread. Propose maintenance. He reviews every proposal by
hand, so quality beats quantity — propose at most 12 items, most-important
first, and skip anything you are unsure of.

Look for, in priority order:

1. RIPENESS ("mark_ripe") — a ripening thread whose summary now contains a
   complete arc: a pattern with evidence, a hypothesis with data points, a
   position he could defend at length. Three or more entries pointing the
   same way is a strong signal. This is the highest-value call you can make.
2. NEAR-DUPLICATES ("merge_threads") — two threads that are the same idea in
   different words. threadId = the one to fold away, otherThreadId = the
   survivor, text = the merged living summary.
3. UNTHREADED ENTRIES ("join_thread" with entryId + threadId + text as the
   updated summary, or "create_thread" with entryId + name + text as the
   summary) — sweep entries that arrived before threading existed or were
   left unmatched.
4. STALE SUMMARIES ("update_summary", text = rewrite) — a summary that no
   longer reflects what its entries collectively say.
5. CLUSTERS ("create_structure_note") — three or more threads orbiting one
   theme deserve a Map of Content: name + text (the note, linking the ideas
   in prose) + threadIds.
6. REAL LINKS ("link_threads", threadId + otherThreadId) — two ideas that
   inform each other without being the same. Propose sparingly; weak links
   are noise.
7. DEAD ENDS ("archive_orphan", threadId or entryId) — a thread untouched
   for weeks whose idea went nowhere, or a stray entry worth filing away.
   Be conservative: dormant is not dead.

Set only the fields the type needs; leave the rest as empty strings or empty
arrays. confidence 0-1. reasoning: one sentence to Jeremy per item.
`.trim()

export async function runMaintenance(): Promise<{
  proposed: number
  skippedDuplicates: number
}> {
  const [threads, counts, loose] = await Promise.all([
    openThreads(),
    entryCounts(),
    unthreadedEntries(),
  ])

  if (!threads.length && !loose.length) {
    return { proposed: 0, skippedDuplicates: 0 }
  }

  // Give the librarian the actual entries per thread, not just summaries —
  // drift detection is impossible without what the members really say.
  const expanded = await Promise.all(
    threads.map(async (t) => {
      const entries = await threadEntries(t.id)
      const bodies = entries
        .map((e) => `  - ${truncate(e.body, 200)}`)
        .join('\n')
      return `${threadDigest([t], counts)}\n  MEMBers:\n${bodies || '  (none)'}`
    }),
  )

  const looseDigest = loose.length
    ? loose
        .map((e: JournalEntry) => `[${e.id}] ${truncate(e.body, 200)}`)
        .join('\n')
    : '(none)'

  const completion = await xai().chat.completions.parse({
    model: MODEL,
    messages: [
      { role: 'system', content: LIBRARIAN_RUBRIC },
      {
        role: 'user',
        content: `THREADS:\n\n${expanded.join('\n\n') || '(none)'}\n\nUNTHREADED ENTRIES:\n\n${looseDigest}`,
      },
    ],
    response_format: zodResponseFormat(LibrarianReport, 'librarian_report'),
  })

  const items = completion.choices[0]?.message.parsed?.proposals ?? []
  let proposed = 0
  let skippedDuplicates = 0

  for (const item of items.slice(0, 12)) {
    const mapped = toPayload(item)
    if (!mapped) continue

    if (await hasPendingLike(item.type, mapped)) {
      skippedDuplicates++
      continue
    }

    await insertProposal({
      type: item.type,
      payload: mapped,
      reasoning: item.reasoning,
      confidence: clamp01(item.confidence),
      source: 'librarian',
    })
    proposed++
  }

  return { proposed, skippedDuplicates }
}

function toPayload(item: z.infer<typeof LibrarianItem>): ProposalPayload | null {
  const t: ProposalType = item.type
  switch (t) {
    case 'join_thread':
      if (!item.entryId || !item.threadId) return null
      return {
        entryId: item.entryId,
        threadId: item.threadId,
        updatedSummary: item.text || undefined,
      }
    case 'create_thread':
      if (!item.entryId || !item.name || !item.text) return null
      return { entryId: item.entryId, name: item.name, summary: item.text }
    case 'merge_threads':
      if (!item.threadId || !item.otherThreadId) return null
      return {
        sourceThreadId: item.threadId,
        targetThreadId: item.otherThreadId,
        mergedSummary: item.text || undefined,
      }
    case 'link_threads':
      if (!item.threadId || !item.otherThreadId) return null
      return { threadIds: [item.threadId, item.otherThreadId] }
    case 'update_summary':
      if (!item.threadId || !item.text) return null
      return { threadId: item.threadId, newSummary: item.text }
    case 'mark_ripe':
      if (!item.threadId) return null
      return { threadId: item.threadId }
    case 'create_structure_note':
      if (!item.name || !item.text || item.threadIds.length < 2) return null
      return { name: item.name, noteText: item.text, threadIds: item.threadIds }
    case 'archive_orphan':
      if (item.threadId) return { threadId: item.threadId }
      if (item.entryId) return { entryId: item.entryId }
      return null
    default:
      return null
  }
}

function truncate(s: string, n: number) {
  const clean = s.replace(/\s+/g, ' ').trim()
  return clean.length > n ? `${clean.slice(0, n - 1)}…` : clean
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0.5))
}
