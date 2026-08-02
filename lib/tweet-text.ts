export type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'link'; value: string; href: string }
  | { kind: 'mention'; value: string; href: string }
  | { kind: 'hashtag'; value: string; href: string }

// Matches, in order: urls, @mentions, #hashtags. Kept as one alternation so a
// single pass preserves position and nothing double-matches.
const TOKEN =
  /(https?:\/\/[^\s<]+[^\s<.,:;"')\]])|(@[A-Za-z0-9_]{1,15})\b|(#[\p{L}\p{N}_]+)/gu

/**
 * Split post text into renderable segments. Line breaks stay in the text
 * segments — callers preserve them with `white-space: pre-wrap`, which is what
 * keeps a post reading exactly the way it did on X.
 */
export function parse(text: string): Segment[] {
  const out: Segment[] = []
  let last = 0

  for (const m of text.matchAll(TOKEN)) {
    const at = m.index!
    if (at > last) out.push({ kind: 'text', value: text.slice(last, at) })

    const [, url, mention, hashtag] = m
    if (url) {
      out.push({ kind: 'link', value: display(url), href: url })
    } else if (mention) {
      out.push({
        kind: 'mention',
        value: mention,
        href: `https://x.com/${mention.slice(1)}`,
      })
    } else if (hashtag) {
      out.push({
        kind: 'hashtag',
        value: hashtag,
        href: `https://x.com/hashtag/${encodeURIComponent(hashtag.slice(1))}`,
      })
    }

    last = at + m[0].length
  }

  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) })
  return out
}

/** x.com strips the scheme and trailing slash in rendered links. Match it. */
function display(url: string) {
  const bare = url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return bare.length > 42 ? `${bare.slice(0, 42)}…` : bare
}

/** First line, trimmed to a sane subject/preview length. */
export function excerpt(text: string, max = 140) {
  const line = text.split('\n').find((l) => l.trim().length > 0) ?? text
  const clean = line.trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

export function permalink(postId: string, handle = 'jeremyfdudet') {
  return `https://x.com/${handle}/status/${postId}`
}

/** "13:52" for same-day, "Jul 29" otherwise — the header format X uses. */
export function timestamp(date: Date, now = new Date()) {
  const sameDay = date.toDateString() === now.toDateString()
  return sameDay
    ? date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
