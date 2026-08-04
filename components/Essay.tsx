import clsx from 'clsx'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Heading } from '@/components/ui/heading'
import { stripMarkdown, stripTitle } from '@/lib/markdown'

/**
 * A harvested essay on the public site. The counterpart to PostCard: that one
 * renders a post the way it looked when it was tweeted, this one renders weeks
 * of thinking the way an essay should read — a real h1 and real typography.
 *
 * Markdown goes through react-markdown, never @mdx-js/mdx and never
 * dangerouslySetInnerHTML: the body is database prose an LLM helped write, so
 * nothing in it may ever become executable code or raw HTML. react-markdown
 * ignores embedded HTML by default, which is exactly the guarantee wanted.
 */

/** Named as file-local so both renderers share the same tuning. */
const PROSE = clsx(
  'prose prose-zinc max-w-none dark:prose-invert',
  // The site is zinc-on-white with zinc-800 body copy; typography's defaults
  // run darker and tighter than the rest of the pages, so pull them back.
  'prose-p:text-zinc-800 dark:prose-p:text-zinc-200',
  'prose-li:text-zinc-800 dark:prose-li:text-zinc-200',
  'prose-headings:font-semibold prose-headings:text-zinc-950 dark:prose-headings:text-white',
  'prose-a:text-[#1d9bf0] prose-a:no-underline hover:prose-a:underline',
  'prose-blockquote:border-zinc-200 prose-blockquote:text-zinc-600 dark:prose-blockquote:border-zinc-700 dark:prose-blockquote:text-zinc-400',
  'prose-hr:border-zinc-950/5 dark:prose-hr:border-white/10',
  'prose-code:before:content-none prose-code:after:content-none',
)

export function Essay({
  title,
  body,
  postedAt,
  className,
}: {
  title: string
  body: string
  postedAt: Date
  className?: string
}) {
  return (
    <article className={className}>
      <header>
        <Heading level={1}>{title}</Heading>
        <time
          dateTime={postedAt.toISOString()}
          className="mt-3 block text-sm text-zinc-500 dark:text-zinc-400"
        >
          {longDate(postedAt)}
        </time>
      </header>

      {/* The title heading is stripped: it is already the h1 above, and an
          essay that opens by repeating its own title reads like a draft. */}
      <div className={clsx(PROSE, 'mt-8')}>
        <Markdown remarkPlugins={[remarkGfm]}>{stripTitle(body)}</Markdown>
      </div>
    </article>
  )
}

/**
 * The index teaser. Deliberately not the essay itself clamped — a wall of
 * fading markdown says less than a title and one honest sentence. Shares
 * PostCard's shell so the two kinds of entry sit together in one list.
 */
export function EssayCard({
  title,
  body,
  postedAt,
  href,
  className,
}: {
  title: string
  body: string
  postedAt: Date
  href?: string
  className?: string
}) {
  const teaser = stripMarkdown(body)
  const inner = (
    <>
      <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Essay
      </p>
      <h2 className="mt-2 text-xl/7 font-semibold text-zinc-950 sm:text-2xl/8 dark:text-white">
        {title}
      </h2>
      {teaser && (
        <p className="mt-3 line-clamp-3 text-[15px]/6 text-zinc-600 sm:text-base/7 dark:text-zinc-400">
          {teaser}
        </p>
      )}
      <p className="mt-4 flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        <time dateTime={postedAt.toISOString()}>{longDate(postedAt)}</time>
        {href && (
          <>
            <span aria-hidden>·</span>
            <span className="font-medium text-[#1d9bf0]">Read more</span>
          </>
        )}
      </p>
    </>
  )

  return (
    <article
      className={clsx(
        className,
        'rounded-2xl p-5 ring-1 ring-zinc-950/5 transition-colors sm:p-6 dark:ring-white/10',
        href && 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
      )}
    >
      {href ? (
        <a href={href} className="block">
          {inner}
        </a>
      ) : (
        inner
      )}
    </article>
  )
}

function longDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
