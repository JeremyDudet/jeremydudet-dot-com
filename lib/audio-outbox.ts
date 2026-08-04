/**
 * Client-side durability for voice notes. A recording is written here while
 * it is still being made (every few seconds) and only deleted after its
 * transcript has landed in the composer — so a dead transcriber, a killed
 * PWA, or iOS suspending the page mid-dictation loses at most a few seconds
 * of speech instead of the whole thought.
 *
 * IndexedDB because localStorage cannot hold blobs. Vanilla API, no deps.
 * Every function is a silent no-op where IndexedDB is unavailable — the
 * outbox is a safety net, never a required path.
 */

const DB_NAME = 'journal-audio'
const STORE = 'recordings'

export type PendingRecording = {
  id: string
  blob: Blob
  createdAt: number
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
}

export async function saveRecording(rec: PendingRecording): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(rec)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
  db.close()
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
  db.close()
}

export async function listRecordings(): Promise<PendingRecording[]> {
  const db = await openDb()
  if (!db) return []
  const rows = await new Promise<PendingRecording[]>((resolve) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result ?? [])
    req.onerror = () => resolve([])
  })
  db.close()
  return rows.sort((a, b) => a.createdAt - b.createdAt)
}
