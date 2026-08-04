import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'
import { AUTHOR, SITE, absolute } from '@/lib/metadata'
import { stripMarkdown } from '@/lib/markdown'
import { excerpt, parse, permalink } from '@/lib/tweet-text'
import type { EntrySource, Media } from '@/lib/db/schema'

export type EmailEntry = {
  slug: string
  title: string
  body: string
  /** 'x' renders as the tweet it was; 'harvest' as a title + excerpt teaser. */
  source: EntrySource
  /** Null for harvested essays — no X permalink exists for them. */
  postId: string | null
  postedAt: Date
  media: Media[]
}

/**
 * What an entry says in one line of plain prose. An essay body is markdown,
 * so it goes through stripMarkdown first — an email must never show a "# ".
 */
export function preview(entry: EmailEntry, max = 140) {
  return entry.source === 'harvest'
    ? excerpt(stripMarkdown(entry.body), max)
    : excerpt(entry.body, max)
}

type Props = {
  entries: EmailEntry[]
  unsubscribeUrl: string
  /** Origin for assets and links. Defaults to production; the dev preview
   *  passes its own so the avatar resolves before the first deploy. */
  baseUrl?: string
}

// Inline style objects, not Tailwind classes — email clients strip <style>
// blocks unpredictably and inline is the only thing that always survives.
const BLUE = '#1d9bf0'
const INK = '#09090b'
const MUTED = '#71717a'
const HAIRLINE = '#e4e4e7'

export function PostEmail({
  entries,
  unsubscribeUrl,
  baseUrl = SITE.url,
}: Props) {
  const first = entries[0]

  return (
    <Html lang="en">
      <Head />
      {/* Preview text is the grey line next to the subject in the inbox —
          use the post's own opening line so it reads like the tweet. */}
      <Preview>{first ? preview(first, 120) : SITE.name}</Preview>
      <Body style={body}>
        <Container style={container}>
          {entries.map((entry, i) => (
            <Section key={entry.slug} style={i > 0 ? { marginTop: 16 } : undefined}>
              {/* An essay is markdown, and there is no honest way to render
                  markdown in email — so it goes out as title, excerpt, and a
                  link to the real thing. */}
              {entry.source === 'harvest' ? (
                <EssayCard entry={entry} baseUrl={baseUrl} />
              ) : (
                <TweetCard entry={entry} baseUrl={baseUrl} />
              )}
            </Section>
          ))}

          <Hr style={{ borderColor: HAIRLINE, margin: '32px 0 16px' }} />
          <Text style={footer}>
            <Link href={baseUrl} style={{ color: MUTED }}>
              jeremydudet.com
            </Link>
            {'  ·  '}
            <Link href={unsubscribeUrl} style={{ color: MUTED }}>
              Unsubscribe
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

/**
 * A harvested essay in the inbox. No avatar row and no body: the tweet card's
 * chrome is about *who* posted, and an essay's card is about *what it says*.
 * The permalink is the whole point — the essay lives on the blog.
 */
function EssayCard({
  entry,
  baseUrl,
}: {
  entry: EmailEntry
  baseUrl: string
}) {
  const teaser = preview(entry, 280)
  const href = `${baseUrl}/blog/${entry.slug}`

  return (
    <table style={card} cellPadding={0} cellSpacing={0} role="presentation">
      <tbody>
        <tr>
          <td style={{ padding: 20 }}>
            <Text style={kicker}>
              Essay
              {'  ·  '}
              {entry.postedAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text style={essayTitle}>
              <Link href={href} style={{ color: INK, textDecoration: 'none' }}>
                {entry.title}
              </Link>
            </Text>
            {teaser && <Text style={essayExcerpt}>{teaser}</Text>}
            <Text style={meta}>
              <Link href={href} style={{ color: BLUE, textDecoration: 'none' }}>
                Read the essay →
              </Link>
            </Text>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

function TweetCard({
  entry,
  baseUrl,
}: {
  entry: EmailEntry
  baseUrl: string
}) {
  return (
    <table style={card} cellPadding={0} cellSpacing={0} role="presentation">
      <tbody>
        <tr>
          <td style={{ padding: 20 }}>
            {/* Header: avatar · name · handle · timestamp */}
            <Row>
              <Column style={{ width: 48, verticalAlign: 'middle' }}>
                <Img
                  src={absolute(AUTHOR.avatarPath, baseUrl)}
                  width={40}
                  height={40}
                  alt=""
                  style={{ borderRadius: '50%', display: 'block' }}
                />
              </Column>
              <Column style={{ verticalAlign: 'middle', paddingLeft: 12 }}>
                <Text style={name}>
                  {AUTHOR.name}{' '}
                  <span style={handle}>@{AUTHOR.handle}</span>
                </Text>
              </Column>
              <Column
                style={{
                  verticalAlign: 'middle',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                <Text style={time}>
                  {entry.postedAt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </Column>
            </Row>

            {/* Body — pre-wrap is what keeps the line breaks, and the line
                breaks are most of why it reads like a tweet. */}
            <Text style={post}>
              {parse(entry.body).map((seg, i) =>
                seg.kind === 'text' ? (
                  <span key={i}>{seg.value}</span>
                ) : (
                  <Link key={i} href={seg.href} style={{ color: BLUE, textDecoration: 'none' }}>
                    {seg.value}
                  </Link>
                ),
              )}
            </Text>

            {entry.media.map((m) => (
              <Img
                key={m.key}
                src={m.url}
                alt={m.alt ?? ''}
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  borderRadius: 12,
                  marginTop: 16,
                  display: 'block',
                }}
              />
            ))}

            <Text style={meta}>
              <Link
                href={`${baseUrl}/blog/${entry.slug}`}
                style={{ color: MUTED, textDecoration: 'none' }}
              >
                Read on the blog
              </Link>
              {entry.postId && (
                <>
                  {'  ·  '}
                  <Link
                    href={permalink(entry.postId, AUTHOR.handle)}
                    style={{ color: MUTED, textDecoration: 'none' }}
                  >
                    View on X
                  </Link>
                </>
              )}
            </Text>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

// <Body> drops padding, and most clients ignore padding on <body> anyway —
// so the outer gutter lives on the container, not here.
const body = { backgroundColor: '#f4f4f5', margin: 0 }

const container = {
  maxWidth: 600,
  margin: '0 auto',
  padding: '24px 12px',
  fontFamily: FONT,
}

const card = {
  width: '100%',
  backgroundColor: '#ffffff',
  borderRadius: 16,
  border: `1px solid ${HAIRLINE}`,
}

// font-family is repeated on every text node on purpose — Outlook and Gmail
// do not reliably inherit it from a parent div.
const name = {
  margin: 0,
  fontFamily: FONT,
  fontSize: 15,
  lineHeight: '20px',
  fontWeight: 600,
  color: INK,
}

const handle = { fontWeight: 400, color: MUTED }

const time = { margin: 0, fontFamily: FONT, fontSize: 14, color: MUTED }

const post = {
  margin: '14px 0 0',
  fontFamily: FONT,
  fontSize: 15,
  lineHeight: '24px',
  color: '#27272a',
  whiteSpace: 'pre-wrap' as const,
}

const kicker = {
  margin: 0,
  fontFamily: FONT,
  fontSize: 12,
  lineHeight: '16px',
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  color: MUTED,
}

const essayTitle = {
  margin: '10px 0 0',
  fontFamily: FONT,
  fontSize: 22,
  lineHeight: '30px',
  fontWeight: 600,
  color: INK,
}

const essayExcerpt = {
  margin: '12px 0 0',
  fontFamily: FONT,
  fontSize: 15,
  lineHeight: '24px',
  color: '#52525b',
}

const meta = {
  margin: '18px 0 0',
  fontFamily: FONT,
  fontSize: 13,
  color: MUTED,
}

const footer = {
  margin: 0,
  fontFamily: FONT,
  fontSize: 12,
  lineHeight: '18px',
  color: MUTED,
  textAlign: 'center' as const,
}

export default PostEmail
