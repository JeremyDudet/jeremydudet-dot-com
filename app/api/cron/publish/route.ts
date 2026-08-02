import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { authorize, failed } from '@/lib/cron'
import { approvedEntries, setEntryStatus } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

/**
 * Promotes human-approved entries to live and busts the cached routes.
 * Separate from the judge so approving in /admin is instant and reversible
 * right up until this runs.
 */
export async function GET(req: Request) {
  const denied = authorize(req)
  if (denied) return denied

  try {
    const approved = await approvedEntries()

    for (const entry of approved) {
      await setEntryStatus(entry.slug, 'published')
      revalidatePath(`/blog/${entry.slug}`)
    }

    if (approved.length) {
      revalidatePath('/blog')
      revalidatePath('/')
    }

    return NextResponse.json({
      published: approved.length,
      slugs: approved.map((e) => e.slug),
    })
  } catch (err) {
    return failed('publish', err)
  }
}
