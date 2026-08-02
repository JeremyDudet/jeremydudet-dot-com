import clsx from 'clsx'
import type { Dashboard as Stats } from '@/lib/db/stats'

/**
 * Colours: the funnel is a single series measuring magnitude, so one hue —
 * no legend, no categorical palette. Status is always colour *plus* a word,
 * never colour alone. Steps validated for contrast against this site's
 * surfaces (#ffffff / #18181b) rather than assumed.
 */
const BAR = 'bg-[#2a78d6] dark:bg-[#3987e5]'

const STATUS = {
  good: 'text-[#047857] dark:text-[#4ade80]',
  warn: 'text-[#b45309] dark:text-[#fbbf24]',
  critical: 'text-[#b91c1c] dark:text-[#f87171]',
  idle: 'text-zinc-500 dark:text-zinc-400',
} as const

export function DashboardView({ stats }: { stats: Stats }) {
  const f = stats.funnel

  // Stages are nested subsets, so each bar is measured against the widest.
  const stages = [
    { label: 'Ingested from X', value: f.ingested },
    { label: 'Dropped by gate', value: f.gated, muted: true },
    { label: 'Judged by Grok', value: f.judged },
    { label: 'Passed for blog', value: f.approvedForBlog },
    { label: 'Live on site', value: f.published },
  ]
  const max = Math.max(...stages.map((s) => s.value), 1)

  return (
    <div className="space-y-10">
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile
            label="Awaiting review"
            value={stats.queues.blog}
            tone={stats.queues.blog > 0 ? 'warn' : 'idle'}
            hint={stats.queues.approved > 0 ? `${stats.queues.approved} approved` : undefined}
          />
          <Tile
            label="Journal ideas"
            value={stats.journal.develop}
            tone={stats.journal.develop > 0 ? 'warn' : 'idle'}
            hint="need developing"
          />
          <Tile
            label="Subscribers"
            value={
              stats.subscribers.daily +
              stats.subscribers.weekly +
              stats.subscribers.monthly
            }
            hint={
              stats.subscribers.unconfirmed
                ? `${stats.subscribers.unconfirmed} unconfirmed`
                : undefined
            }
          />
          <Tile label="Live posts" value={f.published} tone="good" />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-zinc-950 dark:text-white">
          Pipeline
        </h2>
        <div className="space-y-2.5">
          {stages.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
                {s.label}
              </span>
              <div className="h-5 min-w-0 grow">
                <div
                  className={clsx(
                    'h-full rounded-[4px]',
                    s.muted ? 'bg-zinc-300 dark:bg-zinc-700' : BAR,
                  )}
                  style={{ width: `${Math.max((s.value / max) * 100, 1.5)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-sm tabular-nums text-zinc-950 dark:text-white">
                {s.value}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Gate rejections never reach the model and cost nothing.
        </p>
      </section>

      <section className="grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-white">
            Journal
          </h2>
          <dl className="space-y-1.5 text-sm">
            <Row label="Worth posting" value={stats.journal.post} />
            <Row label="Needs developing" value={stats.journal.develop} />
            <Row label="Kept private" value={stats.journal.private} />
            <Row label="Sealed (never sent to Grok)" value={stats.journal.sealed} />
            {stats.journal.unjudged > 0 && (
              <Row label="Unjudged" value={stats.journal.unjudged} />
            )}
          </dl>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-white">
            Health
          </h2>
          <dl className="space-y-1.5 text-sm">
            <TokenRow label="X token" expires={stats.tokens.x} autoRenews />
            <Row label="Social output" value={stats.socialProvider} />
            {stats.crosspostEnabled && (
              <TokenRow label="LinkedIn token" expires={stats.tokens.linkedin} />
            )}
            <Row label="Last ingest" value={ago(stats.lastRun.ingest)} />
            <Row label="Last judge" value={ago(stats.lastRun.judge)} />
            <Row label="Last newsletter" value={ago(stats.lastRun.newsletter)} />
          </dl>
        </div>
      </section>
    </div>
  )
}

function Tile({
  label,
  value,
  hint,
  tone = 'idle',
}: {
  label: string
  value: number
  hint?: string
  tone?: keyof typeof STATUS
}) {
  return (
    <div className="rounded-xl p-4 ring-1 ring-zinc-950/5 dark:ring-white/10">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div
        className={clsx(
          'mt-1 text-2xl font-semibold tabular-nums',
          value === 0 ? 'text-zinc-400 dark:text-zinc-600' : STATUS[tone],
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {hint}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className="tabular-nums text-zinc-950 dark:text-white">{value}</dd>
    </div>
  )
}

/** Status is a word first; the colour only reinforces it. */
function TokenRow({
  label,
  expires,
  autoRenews,
}: {
  label: string
  expires: Date | null
  autoRenews?: boolean
}) {
  if (!expires) {
    return <Row label={label} value="not connected" />
  }

  const days = Math.floor((expires.getTime() - Date.now()) / 86_400_000)
  const tone: keyof typeof STATUS =
    autoRenews ? 'good' : days <= 0 ? 'critical' : days <= 7 ? 'warn' : 'good'

  const text = autoRenews
    ? 'auto-renews'
    : days <= 0
      ? 'EXPIRED — re-authorize'
      : `${days}d left`

  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className={clsx('font-medium', STATUS[tone])}>{text}</dd>
    </div>
  )
}

function ago(date: Date | null) {
  if (!date) return 'never'
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
