import { notFound } from 'next/navigation'
import { Container } from '@/components/Container'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { PostCard } from '@/components/PostCard'
import { SubscribeForm } from '@/components/SubscribeForm'
import { passesGate } from '@/lib/judge'
import { SAMPLE_POSTS } from '@/lib/samples'

/**
 * Design harness. Renders the real PostCard against real post text so the
 * layout and the gate can be judged before any database or API key exists.
 * Dev only — 404s in production so it can't be reached from the live site.
 */
export default function Preview() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <Container size="sm">
      <Heading>Preview</Heading>
      <Text className="mt-3">
        Not a real route. The badge shows what the pre-filter decides before
        Grok is ever called.{' '}
        <a
          href="/preview/email"
          className="underline underline-offset-4 hover:text-zinc-950 dark:hover:text-white"
        >
          See the email →
        </a>
      </Text>

      <div className="mt-10 space-y-6">
        {SAMPLE_POSTS.map((post) => {
          const gate = passesGate(post)
          return (
            <div key={post.id}>
              <div className="mb-2 flex items-center gap-2 text-xs">
                <span
                  className={
                    gate.ok
                      ? 'rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }
                >
                  {gate.ok ? 'reaches Grok' : `dropped: ${gate.why}`}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500">
                  {post.text.length} chars ·{' '}
                  {post.metrics.impression_count} impressions
                </span>
              </div>
              <PostCard
                postId={post.id}
                body={post.text}
                postedAt={post.createdAt}
                media={post.media}
              />
            </div>
          )
        })}
      </div>

      <div className="mt-12">
        <SubscribeForm />
      </div>
    </Container>
  )
}
