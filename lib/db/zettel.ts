import { randomUUID } from 'node:crypto'
import { and, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm'
import { db } from './index'
import {
  journal,
  proposals,
  threads,
  type Proposal,
  type ProposalPayload,
  type ProposalType,
  type Thread,
  type ThreadState,
} from './schema'

/* ---------------------------------------------------------------- threads -- */

/** Idea threads still in play — what the matcher digest is built from. */
export async function openThreads(): Promise<Thread[]> {
  return db
    .select()
    .from(threads)
    .where(
      and(
        eq(threads.kind, 'idea'),
        inArray(threads.state, ['forming', 'ripening', 'ripe']),
      ),
    )
    .orderBy(desc(threads.updatedAt))
}

export async function allThreads(): Promise<Thread[]> {
  return db.select().from(threads).orderBy(desc(threads.updatedAt))
}

export async function threadById(id: string) {
  const [row] = await db.select().from(threads).where(eq(threads.id, id)).limit(1)
  return row
}

export async function threadEntries(threadId: string) {
  return db
    .select()
    .from(journal)
    .where(eq(journal.threadId, threadId))
    .orderBy(journal.createdAt)
}

export async function entryCounts(): Promise<Map<string, number>> {
  const rows = await db
    .select({ threadId: journal.threadId, n: sql<number>`count(*)::int` })
    .from(journal)
    .where(sql`${journal.threadId} is not null`)
    .groupBy(journal.threadId)
  return new Map(rows.map((r) => [r.threadId!, r.n]))
}

/** Non-sealed entries with no thread — the librarian sweeps these. */
export async function unthreadedEntries() {
  return db
    .select()
    .from(journal)
    .where(
      and(
        isNull(journal.threadId),
        eq(journal.sealed, false),
        ne(journal.status, 'archived'),
      ),
    )
    .orderBy(desc(journal.createdAt))
}

/** Human edits skip the proposal queue — proposals gate the agents, not you. */
export async function updateThread(
  id: string,
  patch: Partial<{
    name: string
    summary: string
    state: ThreadState
    relatedThreadIds: string[]
  }>,
) {
  const current = await threadById(id)
  if (!current) throw new Error('thread not found')

  await db
    .update(threads)
    .set({
      ...patch,
      ...(patch.summary && patch.summary !== current.summary
        ? {
            summaryHistory: [
              ...current.summaryHistory,
              { summary: current.summary, at: new Date().toISOString() },
            ],
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(threads.id, id))
}

export async function detachEntry(entryId: string) {
  await db.update(journal).set({ threadId: null }).where(eq(journal.id, entryId))
}

/* -------------------------------------------------------------- proposals -- */

export async function pendingProposals(): Promise<Proposal[]> {
  return db
    .select()
    .from(proposals)
    .where(eq(proposals.status, 'pending'))
    .orderBy(desc(proposals.confidence), desc(proposals.createdAt))
}

export async function proposalById(id: string) {
  const [row] = await db
    .select()
    .from(proposals)
    .where(eq(proposals.id, id))
    .limit(1)
  return row
}

export async function insertProposal(row: {
  type: ProposalType
  payload: ProposalPayload
  reasoning: string
  confidence: number
  source: 'matcher' | 'librarian'
}): Promise<string> {
  const id = randomUUID()
  await db.insert(proposals).values({
    id,
    ...row,
    entryId: row.payload.entryId ?? null,
    threadId:
      row.payload.threadId ??
      row.payload.targetThreadId ??
      row.payload.sourceThreadId ??
      null,
  })
  return id
}

/**
 * Don't queue a second copy of a structurally identical pending suggestion —
 * the librarian re-derives its findings every run, and a rejected-then-
 * re-proposed item is fine, but two identical pending ones is noise.
 *
 * Identity is the *targets* (type + which entry/threads), never the prose:
 * generated summaries differ on every run, so comparing full payloads let
 * reworded duplicates through — each sweep re-queued the same suggestions.
 */
function proposalIdentity(pay: ProposalPayload) {
  return JSON.stringify({
    e: pay.entryId ?? null,
    t: pay.threadId ?? null,
    s: pay.sourceThreadId ?? null,
    g: pay.targetThreadId ?? null,
    ids: [...(pay.threadIds ?? [])].sort(),
  })
}

export async function hasPendingLike(type: ProposalType, payload: ProposalPayload) {
  const rows = await db
    .select({ payload: proposals.payload })
    .from(proposals)
    .where(and(eq(proposals.status, 'pending'), eq(proposals.type, type)))
  const key = proposalIdentity(payload)
  return rows.some((r) => proposalIdentity(r.payload) === key)
}

async function setStatus(id: string, status: 'accepted' | 'rejected' | 'expired') {
  await db
    .update(proposals)
    .set({ status, decidedAt: new Date() })
    .where(eq(proposals.id, id))
}

export async function rejectProposal(id: string) {
  await setStatus(id, 'rejected')
}

/* ------------------------------------------------------------------ apply -- */

async function touch(threadId: string, summary?: string) {
  const current = await threadById(threadId)
  if (!current) return
  await db
    .update(threads)
    .set({
      ...(summary && summary !== current.summary
        ? {
            summary,
            summaryHistory: [
              ...current.summaryHistory,
              { summary: current.summary, at: new Date().toISOString() },
            ],
          }
        : {}),
      lastAgentTouchAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(threads.id, threadId))
}

async function addRelated(threadId: string, otherId: string) {
  const t = await threadById(threadId)
  if (!t || t.relatedThreadIds.includes(otherId)) return
  await db
    .update(threads)
    .set({ relatedThreadIds: [...t.relatedThreadIds, otherId] })
    .where(eq(threads.id, threadId))
}

/**
 * Accept a proposal, with optional human edits (a corrected summary, a
 * different target thread). Validates against current state first — the graph
 * may have moved since the agent looked — and marks stale ones `expired`
 * rather than applying them wrong.
 */
export async function acceptProposal(
  id: string,
  edits: Partial<ProposalPayload> = {},
): Promise<{ ok: boolean; expired?: string }> {
  const p = await proposalById(id)
  if (!p || p.status !== 'pending') return { ok: false, expired: 'not pending' }

  const pay = { ...p.payload, ...edits }

  const expire = async (why: string) => {
    await setStatus(id, 'expired')
    return { ok: false, expired: why }
  }

  switch (p.type) {
    case 'join_thread': {
      if (!pay.entryId || !pay.threadId) return expire('missing ids')
      const t = await threadById(pay.threadId)
      if (!t || t.state === 'abandoned' || t.state === 'harvested')
        return expire('thread gone')
      await db
        .update(journal)
        .set({ threadId: pay.threadId })
        .where(eq(journal.id, pay.entryId))
      await touch(pay.threadId, pay.updatedSummary)
      // Second member is what turns a lone note into an accruing idea.
      const members = await threadEntries(pay.threadId)
      if (t.state === 'forming' && members.length >= 2) {
        await db
          .update(threads)
          .set({ state: 'ripening' })
          .where(eq(threads.id, pay.threadId))
      }
      break
    }

    case 'create_thread': {
      if (!pay.entryId || !pay.name || !pay.summary) return expire('missing fields')
      const threadId = randomUUID()
      await db.insert(threads).values({
        id: threadId,
        name: pay.name,
        summary: pay.summary,
        lastAgentTouchAt: new Date(),
      })
      await db
        .update(journal)
        .set({ threadId })
        .where(eq(journal.id, pay.entryId))
      break
    }

    case 'merge_threads': {
      if (!pay.sourceThreadId || !pay.targetThreadId) return expire('missing ids')
      const target = await threadById(pay.targetThreadId)
      const source = await threadById(pay.sourceThreadId)
      if (!target || !source) return expire('thread gone')
      await db
        .update(journal)
        .set({ threadId: pay.targetThreadId })
        .where(eq(journal.threadId, pay.sourceThreadId))
      // Source survives as a tombstone pointing at where the idea went —
      // nothing in this system deletes.
      await db
        .update(threads)
        .set({
          state: 'abandoned',
          relatedThreadIds: [...source.relatedThreadIds, pay.targetThreadId],
        })
        .where(eq(threads.id, pay.sourceThreadId))
      await touch(pay.targetThreadId, pay.mergedSummary)
      break
    }

    case 'link_threads': {
      const [a, b] = pay.threadIds ?? []
      if (!a || !b) return expire('missing ids')
      await addRelated(a, b)
      await addRelated(b, a)
      break
    }

    case 'detach_entry': {
      if (!pay.entryId) return expire('missing id')
      await detachEntry(pay.entryId)
      break
    }

    case 'update_summary': {
      if (!pay.threadId || !pay.newSummary) return expire('missing fields')
      if (!(await threadById(pay.threadId))) return expire('thread gone')
      await touch(pay.threadId, pay.newSummary)
      break
    }

    case 'mark_ripe': {
      if (!pay.threadId) return expire('missing id')
      const t = await threadById(pay.threadId)
      if (!t || t.state === 'abandoned' || t.state === 'harvested')
        return expire('thread gone')
      await db
        .update(threads)
        .set({ state: 'ripe', updatedAt: new Date() })
        .where(eq(threads.id, pay.threadId))
      break
    }

    case 'create_structure_note': {
      if (!pay.name || !pay.noteText || !pay.threadIds?.length)
        return expire('missing fields')
      const hubId = randomUUID()
      await db.insert(threads).values({
        id: hubId,
        kind: 'structure',
        name: pay.name,
        summary: pay.noteText,
        state: 'ripening',
        relatedThreadIds: pay.threadIds,
        lastAgentTouchAt: new Date(),
      })
      for (const tid of pay.threadIds) await addRelated(tid, hubId)
      break
    }

    case 'archive_orphan': {
      if (pay.threadId) {
        await db
          .update(threads)
          .set({ state: 'abandoned', updatedAt: new Date() })
          .where(eq(threads.id, pay.threadId))
      } else if (pay.entryId) {
        await db
          .update(journal)
          .set({ status: 'archived' })
          .where(eq(journal.id, pay.entryId))
      } else return expire('missing id')
      break
    }

    case 'split_entry': {
      if (!pay.entryId || !pay.parts || pay.parts.length < 2)
        return expire('missing parts')
      const [parent] = await db
        .select()
        .from(journal)
        .where(eq(journal.id, pay.entryId))
        .limit(1)
      if (!parent) return expire('entry gone')
      // Children arrive unjudged and surface in Review as "never judged" —
      // judging them at accept time would hide model spend behind a click.
      for (const part of pay.parts) {
        await db.insert(journal).values({
          id: randomUUID(),
          body: part,
          sealed: parent.sealed,
          status: 'unjudged',
          parentId: parent.id,
        })
      }
      await db
        .update(journal)
        .set({ status: 'archived' })
        .where(eq(journal.id, parent.id))
      break
    }
  }

  await setStatus(id, 'accepted')
  return { ok: true }
}
