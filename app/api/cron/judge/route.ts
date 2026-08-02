import { NextResponse } from 'next/server'
import { authorize, failed } from '@/lib/cron'
import {
  MODEL,
  RUBRIC_VERSION,
  judge,
  judgeForLinkedIn,
  passesGate,
  slugify,
} from '@/lib/judge'
import {
  alreadySyndicated,
  awaitingJudgement,
  claimSyndication,
  createEntry,
  saveDecision,
  threadParts,
  uniqueSlug,
} from '@/lib/db/queries'
import { sanitizeForLinkedIn } from '@/lib/linkedin'
import type { Post } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Hours to let engagement settle before a post is judged. */
const COOLDOWN_HOURS = 24

/** Opt-in. Off until a provider can cross-post without a second rubric. */
const CROSSPOST_LINKEDIN = process.env.CROSSPOST_LINKEDIN === 'true'

export async function GET(req: Request) {
  const denied = authorize(req)
  if (denied) return denied

  try {
    const candidates = await awaitingJudgement({
      cooldownHours: COOLDOWN_HOURS,
      model: MODEL,
      rubricVersion: RUBRIC_VERSION,
      // Vercel Hobby caps a function at 60s and each Grok call runs ~5s, so a
      // larger batch would be killed part-way through. Steady state is only a
      // post or two a day; a backlog just takes a few runs to drain.
      limit: 8,
    })

    const results: object[] = []

    for (const post of candidates) {
      const gate = passesGate(post)

      // Cheap rejects never reach the model. Recorded anyway so the same post
      // isn't re-evaluated on every run.
      if (!gate.ok) {
        await saveDecision({
          postId: post.id,
          model: MODEL,
          rubricVersion: RUBRIC_VERSION,
          publish: false,
          score: 0,
          reason: `gate: ${gate.why}`,
        })
        results.push({ id: post.id, publish: false, reason: gate.why })
        continue
      }

      const body = await buildBody(post)
      const verdict = await judge({ ...post, text: body })

      await saveDecision({
        postId: post.id,
        model: MODEL,
        rubricVersion: RUBRIC_VERSION,
        publish: verdict.publish,
        score: verdict.score,
        reason: verdict.reason,
        title: verdict.title,
        slug: verdict.slug,
        tags: verdict.tags,
      })

      // Lands as `pending`. Nothing reaches the site without a human click.
      if (verdict.publish) {
        const slug = await uniqueSlug(verdict.slug || slugify(verdict.title))
        await createEntry({
          slug,
          postId: post.id,
          title: verdict.title,
          body,
          tags: verdict.tags,
          media: post.media,
          status: 'pending',
          postedAt: post.createdAt,
        })
      }

      // Cross-posting is off by default. Social publishing is a single output
      // (lib/social.ts) that currently goes to X only; LinkedIn is handled by
      // hand until a scheduling provider can fan out programmatically.
      const linkedin = CROSSPOST_LINKEDIN
        ? await maybeJudgeLinkedIn(post, body)
        : undefined

      results.push({
        id: post.id,
        publish: verdict.publish,
        score: verdict.score,
        title: verdict.title,
        reason: verdict.reason,
        ...(linkedin ? { linkedin } : {}),
      })
    }

    return NextResponse.json({ judged: results.length, results })
  } catch (err) {
    return failed('judge', err)
  }
}

/**
 * Decide whether a post should also go to LinkedIn, and stage it.
 *
 * Staged as `pending`, never sent here. A LinkedIn post is public and cannot
 * be unpublished cleanly, so the send is a separate deliberate step — see
 * /api/cron/syndicate. Failures are swallowed: a LinkedIn hiccup must not
 * abort the blog pipeline mid-run.
 */
async function maybeJudgeLinkedIn(post: Post, body: string) {
  try {
    if (await alreadySyndicated(post.id, 'linkedin')) {
      return { skipped: 'already decided' }
    }

    // Never propose history. Anything predating the cutoff was already dealt
    // with by hand — cross-posting it now would duplicate what's already on
    // LinkedIn. Recorded as skipped so it's never reconsidered.
    const cutoff = process.env.SYNDICATE_AFTER
    if (cutoff && post.createdAt < new Date(cutoff)) {
      await claimSyndication({
        postId: post.id,
        target: 'linkedin',
        status: 'skipped',
        body,
        reason: `predates syndication cutoff (${cutoff})`,
      })
      return { skipped: 'before cutoff' }
    }

    const verdict = await judgeForLinkedIn(post, body)
    const adapted = sanitizeForLinkedIn(verdict.body || body)

    await claimSyndication({
      postId: post.id,
      target: 'linkedin',
      status: verdict.worthy ? 'pending' : 'skipped',
      body: adapted,
      reason: verdict.reason,
    })

    return { worthy: verdict.worthy, reason: verdict.reason }
  } catch (err) {
    console.error(`[judge:linkedin] ${post.id}`, err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * A thread's body is its parts joined with blank lines — the same shape it had
 * on X. Single posts pass through untouched.
 */
async function buildBody(post: Post): Promise<string> {
  if (!post.isThreadRoot) return post.text

  const parts = await threadParts(post.conversationId)
  return parts
    .map((p) => p.text.trim())
    .filter(Boolean)
    .join('\n\n')
}
