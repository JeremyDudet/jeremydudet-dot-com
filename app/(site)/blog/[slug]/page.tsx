import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Container } from '@/components/Container'
import { Text } from '@/components/ui/text'
import { PostCard } from '@/components/PostCard'
import { Essay } from '@/components/Essay'
import { SubscribeForm } from '@/components/SubscribeForm'
import { entryBySlug, publishedEntries } from '@/lib/db/queries'
import { SAMPLE_DB_ENTRIES } from '@/lib/samples'
import { stripMarkdown } from '@/lib/markdown'
import { excerpt } from '@/lib/tweet-text'

export const revalidate = 3600

export async function generateStaticParams() {
  // A build must not fail because the database is briefly unreachable —
  // pages still render on demand and fill the ISR cache from there.
  try {
    const entries = await publishedEntries()
    return entries.map((e) => ({ slug: e.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const entry = await entryBySlug(slug)
  if (!entry) return {}

  // An essay's body opens with "# " — a search result or a link preview must
  // never show markup, so essays describe themselves from stripped prose.
  const description =
    entry.source === 'harvest'
      ? excerpt(stripMarkdown(entry.body), 160)
      : excerpt(entry.body, 160)
  return {
    title: entry.title,
    description,
    openGraph: {
      type: 'article',
      title: entry.title,
      description,
      publishedTime: entry.postedAt.toISOString(),
    },
    twitter: { card: 'summary_large_image', title: entry.title, description },
  }
}

export default async function EntryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const entry =
    (await entryBySlug(slug).catch(() => undefined)) ??
    // Dev-only: lets a sample permalink be reviewed before the DB exists.
    (process.env.NODE_ENV === 'production'
      ? undefined
      : SAMPLE_DB_ENTRIES.find((e) => e.slug === slug))

  if (!entry || entry.status !== 'published') notFound()

  return (
    <Container size="sm">
      <nav className="mb-8">
        <a
          href="/blog"
          className="text-sm text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        >
          ← Writing
        </a>
      </nav>

      {entry.source === 'harvest' ? (
        // An essay is not a post: it earns a title, headings, and the room to
        // be read straight through.
        <Essay
          title={entry.title}
          body={entry.body}
          postedAt={entry.postedAt}
        />
      ) : (
        /* No <h1> render — the post is the post. The title exists for search
           engines, the index, and the email subject line, not for the page. */
        <PostCard
          postId={entry.postId}
          body={entry.body}
          postedAt={entry.postedAt}
          media={entry.media}
        />
      )}

      {entry.tags.length > 0 && (
        <Text className="mt-6">
          {entry.tags.map((t) => `#${t}`).join('  ')}
        </Text>
      )}

      <div className="mt-12">
        <SubscribeForm />
      </div>
    </Container>
  )
}
