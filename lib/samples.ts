import type { EmailEntry } from '@/emails/PostEmail'
import type { Post } from '@/lib/db/schema'

/**
 * Real posts from @jeremyfdudet, used by the dev-only design previews. Lets
 * the card, the gate, and the email be judged against actual content before
 * any database or API key exists.
 */
const CHURN_POST = `Diagnosing customer churn, part 2

In my last post I shared that I want to make onboarding more rewarding.

I concluded the main source of churn is that onboarding feels like a slog: you import a spreadsheet of 400 items, you map every column by hand, and only then does the app do anything for you.

Nobody signs up for inventory software because they want to do data entry. They sign up because they are tired of counting wrong.

So I flipped it. Now the first thing you do is count one shelf. Twelve items, ninety seconds. The app shows you what it is worth and what you are short on before you have imported anything at all.

Import comes later, once you already believe it works.`

function post(
  id: string,
  text: string,
  createdAt: string,
  overrides: Partial<Post> = {},
): Post {
  return {
    id,
    conversationId: id,
    text,
    createdAt: new Date(createdAt),
    isReply: false,
    isQuote: false,
    isRepost: false,
    isThreadRoot: false,
    threadLength: 1,
    media: [],
    metrics: {
      like_count: 0,
      reply_count: 0,
      retweet_count: 0,
      quote_count: 0,
      impression_count: 0,
      bookmark_count: 0,
    },
    metricsUpdatedAt: null,
    ingestedAt: new Date(createdAt),
    ...overrides,
  }
}

export const SAMPLE_POSTS: Post[] = [
  post('1', CHURN_POST, '2026-07-29T15:12:00Z', {
    metrics: {
      like_count: 3,
      reply_count: 1,
      retweet_count: 0,
      quote_count: 0,
      impression_count: 214,
      bookmark_count: 2,
    },
  }),
  post('2', `He's too good!`, '2026-07-30T18:02:00Z', {
    isQuote: true,
    metrics: {
      like_count: 0,
      reply_count: 0,
      retweet_count: 0,
      quote_count: 0,
      impression_count: 14,
      bookmark_count: 0,
    },
  }),
  post('3', 'Downloading Duolingo right now', '2026-07-29T09:41:00Z', {
    isQuote: true,
    metrics: {
      like_count: 0,
      reply_count: 0,
      retweet_count: 0,
      quote_count: 0,
      impression_count: 26,
      bookmark_count: 0,
    },
  }),
]

/** What the newsletter would contain — only posts that clear the gate. */
export const SAMPLE_ENTRIES: EmailEntry[] = [
  {
    slug: 'diagnosing-customer-churn-part-2',
    title: 'Diagnosing customer churn, part 2',
    body: CHURN_POST,
    postId: '1',
    postedAt: new Date('2026-07-29T15:12:00Z'),
    media: [],
  },
  {
    slug: 'what-operators-actually-count',
    title: 'What operators actually count',
    body: `Spent the morning behind the bar at a place in East Austin watching them do inventory.

They don't count everything. They count the eight things that walk: the well vodka, the house tequila, limes, the two draft lines that blow out, and whatever the kitchen is short on that week.

Everything else gets counted once a month and nobody looks at the number.

I built Stockcount assuming full counts were the job. They're not. The job is the eight things, every Tuesday, in under ten minutes.`,
    postId: '4',
    postedAt: new Date('2026-07-24T17:30:00Z'),
    media: [],
  },
]

/**
 * Dev-only fallback so the site can be reviewed before the database exists.
 * Returns real entries whenever there are any, and never substitutes in
 * production — an empty blog in prod must look empty.
 */
export function orSamples<T>(entries: T[], samples: T[]): T[] {
  if (entries.length > 0) return entries
  return process.env.NODE_ENV === 'production' ? entries : samples
}

/** Sample entries shaped like database rows, for page-level previews. */
export const SAMPLE_DB_ENTRIES = SAMPLE_ENTRIES.map((e) => ({
  ...e,
  tags: ['stockcount', 'churn'],
  status: 'published' as const,
  publishedAt: e.postedAt,
  createdAt: e.postedAt,
}))
