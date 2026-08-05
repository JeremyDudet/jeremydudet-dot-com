import { render } from '@react-email/render'
import { describe, expect, it } from 'vitest'
import { PostEmail, preview, type EmailEntry } from './PostEmail'

/**
 * A newsletter send is the one irreversible outward action in the whole
 * system — it reaches real inboxes and cannot be recalled. These tests exist
 * because an essay's body is markdown and the email is not: the failure this
 * guards is a subscriber opening a mail that starts "# The eight things".
 */

const ESSAY: EmailEntry = {
  slug: 'the-eight-things-that-walk',
  title: 'The eight things that walk',
  body: `# The eight things that walk

I built Stockcount assuming a full count was the job.

## What I saw

Nobody counts everything. They count the **things that move**, and [nobody](https://example.com) looks at the rest.`,
  source: 'harvest',
  postId: null,
  postedAt: new Date('2026-07-26T14:00:00Z'),
  media: [],
}

const POST: EmailEntry = {
  slug: 'diagnosing-customer-churn-part-2',
  title: 'Diagnosing customer churn, part 2',
  body: 'Diagnosing customer churn, part 2\n\nOnboarding feels like a slog.',
  source: 'x',
  postId: '1',
  postedAt: new Date('2026-07-29T15:12:00Z'),
  media: [],
}

function html(entries: EmailEntry[]) {
  return render(
    PostEmail({ entries, unsubscribeUrl: 'https://example.com/unsub' }),
  )
}

describe('preview', () => {
  it('strips markdown from an essay so no subject or preview shows markup', () => {
    const line = preview(ESSAY, 120)
    expect(line.startsWith('#')).toBe(false)
    expect(line).toContain('I built Stockcount')
  })

  it('leaves a post alone — its first line is already the subject', () => {
    expect(preview(POST, 80)).toBe('Diagnosing customer churn, part 2')
  })
})

describe('PostEmail with an essay', () => {
  it('carries the title, an excerpt, and the permalink', async () => {
    const out = await html([ESSAY])
    expect(out).toContain('The eight things that walk')
    expect(out).toContain('I built Stockcount')
    expect(out).toContain('/blog/the-eight-things-that-walk')
  })

  it('never renders the markdown body', async () => {
    const out = await html([ESSAY])
    expect(out).not.toContain('## What I saw')
    expect(out).not.toContain('**things that move**')
    expect(out).not.toContain('](https://example.com)')
  })

  it('shows no "View on X" link — an essay was never tweeted', async () => {
    const out = await html([ESSAY])
    expect(out).not.toContain('View on X')
  })
})

describe('PostEmail with an X post', () => {
  it('still renders the full body and the X permalink', async () => {
    const out = await html([POST])
    expect(out).toContain('Onboarding feels like a slog.')
    expect(out).toContain('View on X')
    expect(out).toContain('x.com/jeremyfdudet/status/1')
  })

  it('renders both kinds in one issue without either bleeding into the other', async () => {
    const out = await html([ESSAY, POST])
    expect(out).toContain('The eight things that walk')
    expect(out).toContain('Onboarding feels like a slog.')
    expect(out).not.toContain('## What I saw')
  })
})
