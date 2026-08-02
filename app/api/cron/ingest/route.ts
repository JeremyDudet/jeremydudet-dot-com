import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { authorize, failed } from '@/lib/cron'
import { fetchMetrics, fetchMyPosts, type IngestedPost } from '@/lib/x'
import {
  newestPostId,
  postsNeedingMetrics,
  refreshThreadStats,
  updateMetrics,
  upsertPosts,
} from '@/lib/db/queries'
import type { Media } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Two jobs in one pass:
 *   1. pull posts newer than the newest we hold
 *   2. re-read engagement on everything from the last 7 days
 *
 * Both bill as owned reads ($0.001/resource), so a daily run over a week's
 * backlog costs single-digit cents.
 */
export async function GET(req: Request) {
  const denied = authorize(req)
  if (denied) return denied

  try {
    const sinceId = await newestPostId()
    const fresh = await fetchMyPosts({ sinceId, max: 100 })
    const stitched = stitch(fresh)

    const withMedia = await Promise.all(
      stitched.map(async (p) => ({
        ...p,
        media: await rehost(p.media),
      })),
    )

    const ingested = await upsertPosts(
      withMedia.map((p) => ({
        id: p.id,
        conversationId: p.conversationId,
        text: p.text,
        createdAt: p.createdAt,
        isReply: p.isReply,
        isQuote: p.isQuote,
        isRepost: p.isRepost,
        isThreadRoot: p.isThreadRoot,
        threadLength: p.threadLength,
        media: p.media,
        metrics: p.metrics,
        metricsUpdatedAt: new Date(),
      })),
    )

    // Re-derive thread shape from the database, not just this batch — a thread
    // continued the next day arrives without its root, so the root's counts are
    // only correct when recomputed across everything stored.
    await refreshThreadStats(withMedia.map((p) => p.conversationId))

    // Engagement matures over days, so keep re-reading recent posts until the
    // numbers settle. This is what makes the T+24h judgement meaningful.
    const recent = await postsNeedingMetrics(7)
    let refreshed = 0
    if (recent.length) {
      const latest = await fetchMetrics(recent.map((p) => p.id))
      const updates = recent
        .filter((p) => latest.has(p.id))
        .map((p) => ({ id: p.id, metrics: latest.get(p.id)! }))
      await updateMetrics(updates)
      refreshed = updates.length
    }

    return NextResponse.json({ ingested, refreshed })
  } catch (err) {
    return failed('ingest', err)
  }
}

type Stitched = IngestedPost & { isThreadRoot: boolean; threadLength: number }

/**
 * A thread arrives as N separate posts. Mark the root and count the parts so
 * the judge sees "thread of 5" rather than five disconnected fragments —
 * judging them individually rejects all five.
 */
function stitch(batch: IngestedPost[]): Stitched[] {
  const byConversation = new Map<string, IngestedPost[]>()
  for (const p of batch) {
    const group = byConversation.get(p.conversationId) ?? []
    group.push(p)
    byConversation.set(p.conversationId, group)
  }

  return batch.map((p) => {
    const group = byConversation.get(p.conversationId)!
    const isRoot = p.id === p.conversationId
    return {
      ...p,
      isThreadRoot: isRoot && group.length > 1,
      threadLength: isRoot ? group.length : 1,
    }
  })
}

/**
 * X CDN urls expire and hotlinking breaks in email clients. Copy to Blob at
 * ingest so a post's images outlive the post.
 */
async function rehost(
  media: IngestedPost['media'],
): Promise<Media[]> {
  return Promise.all(
    media.map(async ({ sourceUrl, ...rest }) => {
      if (!sourceUrl) return { ...rest, url: '' }
      try {
        const res = await fetch(sourceUrl)
        if (!res.ok) throw new Error(`${res.status}`)
        const blob = await put(
          `x-media/${rest.key}`,
          await res.arrayBuffer(),
          { access: 'public', addRandomSuffix: false },
        )
        return { ...rest, url: blob.url }
      } catch (err) {
        console.error(`[ingest] media ${rest.key} failed`, err)
        return { ...rest, url: sourceUrl } // degrade to hotlink rather than lose it
      }
    }),
  )
}
