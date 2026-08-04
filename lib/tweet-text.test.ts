import { describe, expect, it } from 'vitest'
import { excerpt, parse, permalink } from './tweet-text'

describe('parse', () => {
  it('returns plain text as a single segment', () => {
    expect(parse('just a thought')).toEqual([
      { kind: 'text', value: 'just a thought' },
    ])
  })

  it('keeps line breaks inside text segments', () => {
    expect(parse('line one\n\nline two')).toEqual([
      { kind: 'text', value: 'line one\n\nline two' },
    ])
  })

  it('splits out links with the scheme stripped for display', () => {
    expect(parse('see https://example.com/foo for more')).toEqual([
      { kind: 'text', value: 'see ' },
      {
        kind: 'link',
        value: 'example.com/foo',
        href: 'https://example.com/foo',
      },
      { kind: 'text', value: ' for more' },
    ])
  })

  it('drops a trailing slash from the displayed link', () => {
    expect(parse('https://example.com/')).toEqual([
      { kind: 'link', value: 'example.com', href: 'https://example.com/' },
    ])
  })

  it('truncates long link displays at 42 chars with an ellipsis', () => {
    const href = `https://example.com/${'a'.repeat(60)}`
    const [seg] = parse(href)
    expect(seg.kind).toBe('link')
    if (seg.kind !== 'link') return
    expect(seg.href).toBe(href)
    expect(seg.value.endsWith('…')).toBe(true)
    expect(seg.value).toHaveLength(43) // 42 chars + ellipsis
  })

  it('links @mentions to their profile', () => {
    expect(parse('thanks @jeremyfdudet!')).toEqual([
      { kind: 'text', value: 'thanks ' },
      {
        kind: 'mention',
        value: '@jeremyfdudet',
        href: 'https://x.com/jeremyfdudet',
      },
      { kind: 'text', value: '!' },
    ])
  })

  it('links #hashtags to their search page', () => {
    expect(parse('#buildinpublic')).toEqual([
      {
        kind: 'hashtag',
        value: '#buildinpublic',
        href: 'https://x.com/hashtag/buildinpublic',
      },
    ])
  })

  it('handles a mix in one pass without double-matching', () => {
    const segs = parse('@a check https://x.com/b\nnew line')
    expect(segs.map((s) => s.kind)).toEqual([
      'mention',
      'text',
      'link',
      'text',
    ])
  })
})

describe('excerpt', () => {
  it('takes the first non-empty line', () => {
    expect(excerpt('\n\nThe real lesson\nwas the friction')).toBe(
      'The real lesson',
    )
  })

  it('returns short text unchanged', () => {
    expect(excerpt('short and sweet')).toBe('short and sweet')
  })

  it('clips to max with a trailing ellipsis', () => {
    const out = excerpt('abcdefghijklmnop', 10)
    expect(out).toBe('abcdefghi…')
    expect(out).toHaveLength(10)
  })

  it('trims trailing whitespace before the ellipsis', () => {
    expect(excerpt('abcdefgh jklmnop', 10)).toBe('abcdefgh…')
  })
})

describe('permalink', () => {
  it('builds the status URL with the default handle', () => {
    expect(permalink('1234567890')).toBe(
      'https://x.com/jeremyfdudet/status/1234567890',
    )
  })

  it('accepts a custom handle', () => {
    expect(permalink('42', 'someone')).toBe(
      'https://x.com/someone/status/42',
    )
  })
})
