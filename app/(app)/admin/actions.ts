'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/admin-auth'
import {
  markSyndicated,
  setEntryStatus,
  setSyndicationStatus,
} from '@/lib/db/queries'
import { postToFeed } from '@/lib/linkedin'
import type { EntryStatus } from '@/lib/db/schema'

export async function decide(formData: FormData) {
  // Server actions are POST endpoints in their own right — never rely on the
  // middleware having run.
  await assertAdmin()

  const slug = String(formData.get('slug') ?? '')
  const status = String(formData.get('status') ?? '') as EntryStatus

  if (!slug) throw new Error('missing slug')
  if (!['pending', 'approved', 'rejected', 'published'].includes(status)) {
    throw new Error(`bad status: ${status}`)
  }

  await setEntryStatus(slug, status)
  revalidatePath('/admin')

  if (status === 'published' || status === 'rejected') {
    revalidatePath('/blog')
    revalidatePath(`/blog/${slug}`)
  }
}

/**
 * Post a staged item to LinkedIn, or drop it.
 *
 * Publishing is irreversible in practice, so this is a deliberate click rather
 * than something the cron does on its own — unless LINKEDIN_AUTO_POST is set.
 */
export async function syndicate(formData: FormData) {
  await assertAdmin()

  const postId = String(formData.get('postId') ?? '')
  const body = String(formData.get('body') ?? '')
  const action = String(formData.get('action') ?? '')
  if (!postId) throw new Error('missing postId')

  if (action === 'skip') {
    await setSyndicationStatus(postId, 'linkedin', 'skipped')
    revalidatePath('/admin')
    return
  }

  if (action !== 'post') throw new Error(`bad action: ${action}`)
  if (!body.trim()) throw new Error('refusing to post empty text')

  try {
    const remoteId = await postToFeed(body)
    await markSyndicated(postId, 'linkedin', { remoteId, body })
  } catch (err) {
    await markSyndicated(postId, 'linkedin', {
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }

  revalidatePath('/admin')
}
