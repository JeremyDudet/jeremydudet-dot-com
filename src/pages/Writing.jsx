import { Helmet } from 'react-helmet-async'
import { Tweet } from 'react-tweet'
import { Container } from '@/components/Container'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { posts } from '@/data/posts'

const sortedPosts = [...posts].sort(
  (a, b) => new Date(b.date) - new Date(a.date),
)

function TextPost({ post }) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
      <time className="text-xs text-zinc-500 dark:text-zinc-400">
        {new Date(post.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </time>
      <Heading level={3} className="mt-2">
        {post.title}
      </Heading>
      <Text className="mt-2">{post.content}</Text>
    </div>
  )
}

function TweetPost({ post }) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
      <time className="text-xs text-zinc-500 dark:text-zinc-400">
        {new Date(post.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </time>
      <div className="mt-2">
        <Tweet id={post.tweetId} />
      </div>
    </div>
  )
}

export default function Writing() {
  return (
    <>
      <Helmet>
        <title>Writing | Jeremy Dudet</title>
      </Helmet>
      <Container>
        <Heading level={1}>Writing</Heading>
        <Text className="mt-2">Thoughts and posts from X.</Text>

        <div className="mt-12 space-y-8">
          {sortedPosts.map((post) =>
            post.type === 'tweet' ? (
              <TweetPost key={post.tweetId} post={post} />
            ) : (
              <TextPost key={post.title} post={post} />
            ),
          )}
        </div>
      </Container>
    </>
  )
}
