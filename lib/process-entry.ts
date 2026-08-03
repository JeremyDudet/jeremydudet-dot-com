import { judgeEntry, type EntryVerdict } from '@/lib/judge'
import { matchEntry } from '@/lib/librarian'
import { feedbackFor } from '@/lib/feedback'
import {
  claimForJudging,
  journalEntry,
  markMatched,
  saveEntryVerdict,
  unjudgedEntries,
} from '@/lib/db/queries'
import {
  MAX_ANSWERS_PER_ROOT,
  answeredQuestionsFor,
  insertOpenQuestion,
  questionById,
} from '@/lib/db/questions'
import { acceptProposal } from '@/lib/db/zettel'

/** Only joins auto-apply, and only above this confidence. Creating threads
 *  automatically would breed the near-duplicates the matcher rubric calls
 *  the failure mode of this whole system; splits archive the parent. */
const AUTO_JOIN_CONFIDENCE = 0.85

/**
 * The one processing pipeline for a journal entry: judge, then match. Shared
 * by capture's after(), the sweep route, and the manual re-judge action, and
 * safe to call from all three at once — `claimForJudging` is a conditional
 * update, so only one caller ever holds a given entry.
 *
 * Returns the verdict, or null when the entry was already claimed elsewhere.
 * A judge failure throws and leaves the claim in place; the 5-minute stale
 * takeover makes the next sweep retry it automatically.
 */
export async function processEntry(
  entry: { id: string; body: string; threadId?: string | null },
  opts: { spoken?: boolean } = {},
): Promise<EntryVerdict | null> {
  if (!(await claimForJudging(entry.id))) return null

  // Distilled taste from past rejections; a fetch failure must not block
  // judging, so it degrades to no feedback.
  const feedback = await feedbackFor('judge').catch(() => [])

  const verdict = await judgeEntry(entry.body, {
    spoken: opts.spoken,
    feedback,
  })
  await saveEntryVerdict(entry.id, verdict)
  await maybeAskQuestion(entry, verdict)

  // The matcher only ever proposes, and its failure must not lose the
  // verdict. matchedAt advances only on success, so a silent failure here is
  // visible to the sweep and gets retried.
  try {
    await matchAndMaybeJoin({ id: entry.id, body: entry.body })
  } catch (err) {
    console.error('[process-entry] matcher failed', err)
  }

  return verdict
}

/**
 * Run the matcher, mark completion, and auto-apply a confident join —
 * acceptProposal re-validates and the accepted row keeps the audit trail;
 * summaryHistory makes a bad join reversible. Everything else waits for a
 * tap on the Ideas tab. Shared by processEntry and the sweep's match-only
 * retry so the two paths can never diverge.
 */
export async function matchAndMaybeJoin(entry: { id: string; body: string }) {
  const match = await matchEntry(entry)
  await markMatched(entry.id)

  if (
    match &&
    match.type === 'join_thread' &&
    match.confidence >= AUTO_JOIN_CONFIDENCE
  ) {
    await acceptProposal(match.proposalId).catch((err) =>
      console.error('[process-entry] auto-join failed', err),
    )
  }
}

/**
 * The judge's side of the conversation: a develop verdict may carry ONE
 * concrete question. insertOpenQuestion is a no-op when the root already has
 * one open, so a re-judge can never stack questions.
 */
export async function maybeAskQuestion(
  entry: { id: string; threadId?: string | null },
  verdict: EntryVerdict,
) {
  if (verdict.verdict !== 'develop' || !verdict.question) return
  try {
    await insertOpenQuestion({
      entryId: entry.id,
      threadId: entry.threadId ?? null,
      question: verdict.question,
    })
  } catch (err) {
    console.error('[process-entry] question insert failed', err)
  }
}

/**
 * Re-judge a root entry on its full Q/A transcript after an answer landed.
 * The verdict is saved on the ROOT — it graduates to ready-to-post with
 * `suggested` drawing on the combined material, asks the next question, or
 * resolves. Answer entries themselves are never independently judged.
 *
 * The cap: after MAX_ANSWERS_PER_ROOT answers the judge is told to decide,
 * and the question field is zeroed in code regardless of what it returns.
 */
export async function processAnswer(questionId: string) {
  const question = await questionById(questionId)
  if (!question || question.status !== 'answered') return

  const root = await journalEntry(question.entryId)
  if (!root || root.sealed) return

  const answered = await answeredQuestionsFor(root.id)
  const parts = [`ORIGINAL ENTRY:\n${root.body}`]
  let anySpoken = root.spoken

  for (const q of answered) {
    const answer = q.answerEntryId ? await journalEntry(q.answerEntryId) : null
    if (!answer || answer.sealed) continue
    anySpoken = anySpoken || answer.spoken
    parts.push(`EDITOR QUESTION:\n${q.question}\n\nHIS ANSWER:\n${answer.body}`)
  }

  const feedback = await feedbackFor('judge').catch(() => [])
  const verdict = await judgeEntry(parts.join('\n\n'), {
    spoken: anySpoken,
    feedback,
    noMoreQuestions: answered.length >= MAX_ANSWERS_PER_ROOT,
  })

  await saveEntryVerdict(root.id, verdict)
  await maybeAskQuestion(
    { id: root.id, threadId: root.threadId ?? question.threadId },
    verdict,
  )
}

/**
 * Heal earlier after() deaths opportunistically: every capture also judges up
 * to two unjudged entries older than two minutes, so a bursty session drains
 * itself instead of waiting for the nightly cron. The age filter keeps this
 * from grabbing entries whose own after() is still running (the claim would
 * block it anyway — this just avoids the wasted attempt).
 */
export async function drainStragglers(excludeId?: string, limit = 2) {
  const rows = await unjudgedEntries({
    limit: limit + 1,
    olderThanMinutes: 2,
  })
  for (const row of rows.filter((r) => r.id !== excludeId).slice(0, limit)) {
    try {
      await processEntry(row, { spoken: row.spoken })
    } catch (err) {
      console.error('[process-entry] straggler failed', row.id, err)
    }
  }
}
