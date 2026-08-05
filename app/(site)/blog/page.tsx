import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { PostCard } from '@/components/PostCard'
import { EssayCard } from '@/components/Essay'
import { SubscribeForm } from '@/components/SubscribeForm'
import { publishedEntries } from '@/lib/db/queries'
import { SAMPLE_DB_ENTRIES, orSamples } from '@/lib/samples'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Writing',
  description:
    'Posts on building Stockcount, talking to restaurant operators, and what shipping teaches.',
}

export default async function BlogIndex() {
  const entries = orSamples(
    await publishedEntries().catch(() => []),
    SAMPLE_DB_ENTRIES,
  )

  return (
    <Container size="sm">
      <nav className="mb-8">
        <a
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        >
          ← Jeremy Dudet
        </a>
      </nav>

      <header className="mb-10">
        <Heading>Writing</Heading>
        <Text className="mt-3">
          Posts worth keeping, pulled from{' '}
          <a
            href="https://x.com/jeremyfdudet"
            className="underline underline-offset-4 hover:text-zinc-950 dark:hover:text-white"
          >
            @jeremyfdudet
          </a>
          .
        </Text>
      </header>

      <div className="mb-12">
        <SubscribeForm />
      </div>

      {entries.length === 0 ? (
        <Text>Nothing published yet.</Text>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) =>
            // Two origins, one list: harvested essays lead with their title
            // and an excerpt, X-derived entries stay tweet-shaped.
            entry.source === 'harvest' ? (
              <EssayCard
                key={entry.slug}
                title={entry.title}
                body={entry.body}
                postedAt={entry.postedAt}
                href={`/blog/${entry.slug}`}
              />
            ) : (
              <PostCard
                key={entry.slug}
                postId={entry.postId}
                body={entry.body}
                postedAt={entry.postedAt}
                media={entry.media}
                href={`/blog/${entry.slug}`}
                clamp
              />
            ),
          )}
        </div>
      )}
    </Container>
  )
}
