import { describe, expect, it } from 'vitest'
import { extractTitle, stripMarkdown, stripTitle } from './markdown'

describe('extractTitle', () => {
  it('reads the leading # heading', () => {
    expect(extractTitle('# The eight things\n\nBody text.')).toBe(
      'The eight things',
    )
  })

  it('finds the first # heading even when it is not the first line', () => {
    expect(extractTitle('A stray preamble line.\n\n# Real title\n\nBody.')).toBe(
      'Real title',
    )
  })

  it('returns null when no # heading exists', () => {
    expect(extractTitle('Just prose.\nMore prose.')).toBeNull()
  })

  it('ignores deeper headings — ## is structure, not the title', () => {
    expect(extractTitle('## Section\n\nBody.')).toBeNull()
  })

  it('requires a space after the # (a bare #tag is not a heading)', () => {
    expect(extractTitle('#hashtag opening line')).toBeNull()
  })

  it('trims whitespace around the heading text', () => {
    expect(extractTitle('  #   Padded title   ')).toBe('Padded title')
  })

  it('takes the first of several # headings', () => {
    expect(extractTitle('# First\n\ntext\n\n# Second')).toBe('First')
  })
})

describe('stripTitle', () => {
  it('removes the leading # heading so the h1 is not printed twice', () => {
    expect(stripTitle('# The eight things\n\nBody text.')).toBe('Body text.')
  })

  it('keeps deeper headings — they are the essay structure', () => {
    expect(stripTitle('# Title\n\n## Section\n\nBody.')).toBe(
      '## Section\n\nBody.',
    )
  })

  it('removes only the first # heading', () => {
    expect(stripTitle('# First\n\ntext\n\n# Second\n\nmore')).toBe(
      'text\n\n# Second\n\nmore',
    )
  })

  it('keeps anything written above the heading', () => {
    expect(stripTitle('A stray preamble.\n\n# Real title\n\nBody.')).toBe(
      'A stray preamble.\n\nBody.',
    )
  })

  it('returns the body unchanged when there is no # heading', () => {
    expect(stripTitle('Just prose.\nMore prose.')).toBe(
      'Just prose.\nMore prose.',
    )
  })

  it('agrees with extractTitle about which heading is the title', () => {
    const md = '# Title\n\n# Later heading\n\nBody.'
    expect(extractTitle(md)).toBe('Title')
    expect(stripTitle(md)).toBe('# Later heading\n\nBody.')
  })
})

describe('stripMarkdown', () => {
  it('drops heading lines entirely — an excerpt should not repeat the title', () => {
    expect(stripMarkdown('# Title\n\nThe opening sentence.')).toBe(
      'The opening sentence.',
    )
    expect(stripMarkdown('## Section\n\nBody here.')).toBe('Body here.')
  })

  it('unwraps emphasis', () => {
    expect(stripMarkdown('This is **bold** and *italic* and _quiet_.')).toBe(
      'This is bold and italic and quiet.',
    )
  })

  it('keeps link text and drops the url', () => {
    expect(stripMarkdown('See [Stockcount](https://stockcount.io) today.')).toBe(
      'See Stockcount today.',
    )
  })

  it('removes template gap markers', () => {
    expect(
      stripMarkdown('The lesson was clear. [ your words: what happened next ] And then it shipped.'),
    ).toBe('The lesson was clear. And then it shipped.')
  })

  it('drops horizontal rules, including the harvest separator', () => {
    expect(stripMarkdown('First thought.\n\n---\n\nSecond thought.')).toBe(
      'First thought. Second thought.',
    )
  })

  it('strips list and blockquote markers but keeps their prose', () => {
    expect(stripMarkdown('- count one shelf\n> twelve items\n1. ninety seconds')).toBe(
      'count one shelf twelve items ninety seconds',
    )
  })

  it('unwraps inline code and drops fenced blocks', () => {
    expect(stripMarkdown('Run `npm test` first.\n```\nconst x = 1\n```\nDone.')).toBe(
      'Run npm test first. Done.',
    )
  })

  it('collapses whitespace into single spaces', () => {
    expect(stripMarkdown('One.\n\n\nTwo.   Three.')).toBe('One. Two. Three.')
  })
})
