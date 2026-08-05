import clsx from 'clsx'
import { AUTHOR } from '@/lib/metadata'
import { parse, permalink, timestamp } from '@/lib/tweet-text'
import type { Media } from '@/lib/db/schema'
import { VerifiedBadge } from '@/components/SocialIcons'

type PostCardProps = {
  /** Null for harvested essays, which never existed on X — the footer's
   *  "View on X" link simply disappears for them. */
  postId: string | null
  body: string
  postedAt: Date
  media?: Media[]
  /** Card links to the entry; omit on the entry page itself. */
  href?: string
  /** Fade long posts out at a fixed height and show "Read more". */
  clamp?: boolean
  className?: string
}

/**
 * A post rendered the way it looked when it was tweeted. Same component backs
 * the index and the permalink page; the email mirrors it with inline styles.
 */
export function PostCard({
  postId,
  body,
  postedAt,
  media = [],
  href,
  clamp = false,
  className,
}: PostCardProps) {
  // Only worth fading something actually long enough to be cut off — a short
  // post under the clamp height would get a "Read more" that reveals nothing.
  const clamped = clamp && body.length > 420
  return (
    <article
      className={clsx(
        className,
        'rounded-2xl p-5 ring-1 ring-zinc-950/5 transition-colors sm:p-6 dark:ring-white/10',
        href && 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
      )}
    >
      <header className="flex items-center gap-3">
        {/* Plain <img>, not next/image: post media lives on Vercel Blob and
            the email renders the same markup — neither wants an optimizer.
            aspect-square + object-center keep the crop centred even if the
            source image isn't square. */}
        <img
          src="/images/avatar.jpg"
          alt=""
          width={48}
          height={48}
          className="size-10 shrink-0 aspect-square rounded-full object-cover object-center sm:size-12"
        />
        <div className="flex min-w-0 grow items-baseline gap-x-1.5">
          <span className="truncate font-semibold text-zinc-950 dark:text-white">
            {AUTHOR.name}
          </span>
          {AUTHOR.verified && (
            <VerifiedBadge className="size-4 shrink-0 self-center text-[#1d9bf0]" />
          )}
          <span className="truncate text-sm text-zinc-500 dark:text-zinc-400">
            @{AUTHOR.handle}
          </span>
        </div>
        <time
          dateTime={postedAt.toISOString()}
          className="shrink-0 text-sm text-zinc-500 tabular-nums dark:text-zinc-400"
        >
          {timestamp(postedAt)}
        </time>
      </header>

      <div className="mt-3">
        {href ? (
          <a href={href} className="block">
            {/* A mask fades the text itself rather than layering a gradient
                over it, so it works on any background — including the card's
                hover colour, which an overlay would visibly mismatch. */}
            <div
              className={clsx(
                clamped &&
                  'max-h-52 overflow-hidden [mask-image:linear-gradient(to_bottom,black_60%,transparent)]',
              )}
            >
              <PostBody body={body} linkify={false} />
            </div>
            {clamped && (
              <span className="mt-2 inline-block text-sm font-medium text-[#1d9bf0]">
                Read more
              </span>
            )}
          </a>
        ) : (
          <PostBody body={body} />
        )}
      </div>

      {media.length > 0 && (
        <div
          className={clsx(
            'mt-4 grid gap-2 overflow-hidden rounded-xl',
            media.length > 1 && 'grid-cols-2',
          )}
        >
          {media.map((m) => (
            <img
              key={m.key}
              src={m.url}
              alt={m.alt ?? ''}
              width={m.width}
              height={m.height}
              className="h-full w-full object-cover"
            />
          ))}
        </div>
      )}

      <footer className="mt-4 flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        {postId && (
          <>
            <a
              href={permalink(postId, AUTHOR.handle)}
              className="hover:text-zinc-950 dark:hover:text-white"
            >
              View on X
            </a>
            <span aria-hidden>·</span>
          </>
        )}
        <time dateTime={postedAt.toISOString()}>
          {postedAt.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </time>
      </footer>
    </article>
  )
}

/**
 * `whitespace-pre-wrap` is doing the real work here — it is what keeps the
 * line breaks, and a post's line breaks are most of its voice.
 */
export function PostBody({
  body,
  linkify = true,
}: {
  body: string
  linkify?: boolean
}) {
  return (
    <div className="whitespace-pre-wrap text-[15px]/6 text-zinc-800 sm:text-base/7 dark:text-zinc-200">
      {parse(body).map((seg, i) => {
        if (seg.kind === 'text') return <span key={i}>{seg.value}</span>
        if (!linkify) {
          return (
            <span key={i} className="text-[#1d9bf0]">
              {seg.value}
            </span>
          )
        }
        return (
          <a
            key={i}
            href={seg.href}
            className="text-[#1d9bf0] hover:underline"
            rel={seg.kind === 'link' ? 'noopener noreferrer' : undefined}
            target={seg.kind === 'link' ? '_blank' : undefined}
          >
            {seg.value}
          </a>
        )
      })}
    </div>
  )
}
