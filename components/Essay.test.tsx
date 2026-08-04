import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Essay, EssayCard } from './Essay'

/**
 * The blog is the only place an essay is read in full, and the index is the
 * only place it is advertised. Both take raw markdown as input, so both are
 * one mistake away from printing "# " at a reader.
 */

const BODY = `# The eight things that walk

I built Stockcount assuming a full count was the job.

## What I saw

They count the **things that move** and [nobody](https://example.com) looks at the rest.

- the well vodka
- limes`

const AT = new Date('2026-07-26T14:00:00Z')

describe('Essay', () => {
  const html = renderToStaticMarkup(
    <Essay title="The eight things that walk" body={BODY} postedAt={AT} />,
  )

  it('renders the title as the page h1', () => {
    expect(html).toMatch(/<h1[^>]*>The eight things that walk<\/h1>/)
  })

  it('does not repeat the title heading inside the prose', () => {
    expect(html.match(/The eight things that walk/g)).toHaveLength(1)
  })

  it('renders markdown structure as real elements', () => {
    expect(html).toContain('<h2>What I saw</h2>')
    expect(html).toContain('<strong>things that move</strong>')
    expect(html).toContain('<li>the well vodka</li>')
    expect(html).toContain('href="https://example.com"')
  })

  it('leaves no markdown syntax in the output', () => {
    expect(html).not.toContain('## What I saw')
    expect(html).not.toContain('**things that move**')
    expect(html).not.toContain('- limes')
  })
})

describe('EssayCard', () => {
  const html = renderToStaticMarkup(
    <EssayCard
      title="The eight things that walk"
      body={BODY}
      postedAt={AT}
      href="/blog/the-eight-things-that-walk"
    />,
  )

  it('leads with the title and links to the essay', () => {
    expect(html).toContain('The eight things that walk')
    expect(html).toContain('href="/blog/the-eight-things-that-walk"')
  })

  it('teases with stripped prose, never markdown', () => {
    expect(html).toContain('I built Stockcount assuming a full count was the job.')
    expect(html).not.toContain('# The eight')
    expect(html).not.toContain('## What I saw')
    expect(html).not.toContain('**things that move**')
    expect(html).not.toContain('](https://example.com)')
  })
})
