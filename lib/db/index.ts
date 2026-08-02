import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let client: NeonHttpDatabase<typeof schema> | null = null

/**
 * Lazy so importing a route module doesn't require a reachable database —
 * otherwise `next build` fails on any machine without DATABASE_URL set.
 */
function connect(): NeonHttpDatabase<typeof schema> {
  if (client) return client
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  client = drizzle(neon(url), { schema })
  return client
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get: (_, prop) => Reflect.get(connect(), prop),
})

export * from './schema'
