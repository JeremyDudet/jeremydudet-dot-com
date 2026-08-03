import type { Metadata } from 'next'
import { sql } from 'drizzle-orm'
import { assertAdmin } from '@/lib/admin-auth'
import { DashboardView } from '@/components/Dashboard'
import { db } from '@/lib/db'
import { dashboard, recentDecisions } from '@/lib/db/stats'
import { currentCuration } from '@/lib/curator'
import { sharingMode } from '@/lib/settings'
import { CurateButton } from './CurateButton'
import { LogoutButton } from './LogoutButton'
import { MaintenanceButton } from './MaintenanceButton'
import { SharingModeToggle } from './SharingModeToggle'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Settings' }

/**
 * Statistics and connections. Deliberately separate from Review: numbers are
 * for when you're curious, decisions are for when you're working, and mixing
 * them made both harder to read.
 */
export default async function SettingsPage() {
  await assertAdmin()
  const [stats, log, zettel, mode, curation] = await Promise.all([
    dashboard().catch(() => null),
    recentDecisions(8).catch(() => []),
    zettelHealth().catch(() => null),
    sharingMode(),
    currentCuration().catch(() => null),
  ])

  return (
    <div className="space-y-10">
      <h1 className="text-lg font-semibold text-zinc-950 dark:text-white">
        Settings
      </h1>

      {stats && <DashboardView stats={stats} />}

      <section>
        <h2 className="mb-1 text-sm font-semibold text-zinc-950 dark:text-white">
          The curator
        </h2>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Re-reads everything after each entry and surfaces what&apos;s worth
          sharing.
          {curation &&
            ` Last run considered ${curation.batch.considered}.`}
        </p>
        <SharingModeToggle current={mode} />
        <div className="mt-4">
          <CurateButton />
        </div>
      </section>

      {zettel && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-white">
            Zettelkasten
          </h2>
          <dl className="space-y-1.5 text-sm">
            <ZRow label="Ideas ripening" value={zettel.active} />
            <ZRow label="Ripe, awaiting harvest" value={zettel.ripe} />
            <ZRow label="Pending suggestions" value={zettel.pending} />
            <ZRow label="Entries not yet threaded" value={zettel.unthreaded} />
            <ZRow
              label="Quiet 3+ weeks"
              value={zettel.stalled}
            />
          </dl>
          <div className="mt-4">
            <MaintenanceButton />
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            The librarian also runs every Sunday. It only suggests — everything
            waits in Review for your tap.
          </p>
        </section>
      )}

      {log.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-zinc-950 dark:text-white">
            Recent verdicts
          </h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Where to tune the rubric — when a call looks wrong, the reason names
            the line to change.
          </p>
          <div className="space-y-3">
            {log.map((d) => (
              <div
                key={d.post_id}
                className="rounded-xl p-3 ring-1 ring-zinc-950/5 dark:ring-white/10"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
                  <span
                    className={
                      d.publish
                        ? 'font-semibold text-[#047857] dark:text-[#4ade80]'
                        : 'font-semibold text-zinc-500 dark:text-zinc-400'
                    }
                  >
                    {d.publish ? 'PUBLISH' : 'reject'}
                  </span>
                  <span className="tabular-nums text-zinc-400 dark:text-zinc-500">
                    {d.score}/10
                  </span>
                  {d.title && (
                    <span className="text-zinc-950 dark:text-white">
                      {d.title}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                  {d.reason}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-white">
          Session
        </h2>
        <LogoutButton />
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Signing out clears this device. Changing ADMIN_PASSWORD signs out
          every device at once — it is the key sessions are signed with.
        </p>
      </section>
    </div>
  )
}

function ZRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className="tabular-nums text-zinc-950 dark:text-white">{value}</dd>
    </div>
  )
}

async function zettelHealth() {
  const { rows } = await db.execute<{
    active: number
    ripe: number
    pending: number
    unthreaded: number
    stalled: number
  }>(sql`
    select
      (select count(*) from threads
         where kind='idea' and state in ('forming','ripening','ripe'))::int as active,
      (select count(*) from threads where state='ripe')::int as ripe,
      (select count(*) from agent_proposals where status='pending')::int as pending,
      (select count(*) from journal
         where thread_id is null and not sealed and status <> 'archived')::int as unthreaded,
      (select count(*) from threads
         where kind='idea' and state in ('forming','ripening')
           and updated_at < now() - interval '21 days')::int as stalled
  `)
  return rows[0]
}

