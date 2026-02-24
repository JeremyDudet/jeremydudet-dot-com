export type Post =
  | { type: 'tweet'; tweetId: string; date: string }
  | { type: 'text'; title: string; content: string; date: string }

export const posts: Post[] = [
  {
    type: 'tweet',
    tweetId: '1891498498498281905',
    date: '2025-02-17',
  },
  {
    type: 'tweet',
    tweetId: '1889026553257222358',
    date: '2025-02-10',
  },
  {
    type: 'tweet',
    tweetId: '1887694362061410604',
    date: '2025-02-06',
  },
]
