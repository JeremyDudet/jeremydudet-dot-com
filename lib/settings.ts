import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { appSettings, type SharingMode } from '@/lib/db/schema'

export async function getSetting<T>(key: string): Promise<T | null> {
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1)
  return (row?.value as T) ?? null
}

export async function setSetting(key: string, value: unknown) {
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    })
}

/**
 * Draft is the default: the daily loop is refine-until-it-sounds-like-you,
 * then publish — a draft supports that; a template forces a detour through
 * the composer. Template mode remains a toggle for when owning every word
 * matters more than speed.
 */
export async function sharingMode(): Promise<SharingMode> {
  const mode = await getSetting<SharingMode>('sharing_mode')
  return mode === 'template' ? 'template' : 'draft'
}
