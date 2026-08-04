import { describe, expect, it } from 'vitest'
import { passesGate, slugify } from './judge'
import type { Post } from './db/schema'

// passesGate only reads these five fields; the cast keeps the fixture from
// having to fake a full ingested row.
function post(overrides: Partial<Post> = {}): Post {
  return {
    isReply: false,
    isRepost: false,
    isQuote: false,
    isThreadRoot: false,
    text: '',
    ...overrides,
  } as Post
}

const long = (n: number) => 'a'.repeat(n)

describe('passesGate', () => {
  it('rejects replies regardless of length', () => {
    expect(passesGate(post({ isReply: true, text: long(500) }))).toEqual({
      ok: false,
      why: 'reply',
    })
  })

  it('rejects reposts', () => {
    expect(passesGate(post({ isRepost: true, text: long(500) }))).toEqual({
      ok: false,
      why: 'repost',
    })
  })

  it('rejects short quote-post reactions', () => {
    expect(passesGate(post({ isQuote: true, text: long(399) }))).toEqual({
      ok: false,
      why: 'quote-post reaction',
    })
  })

  it('lets a substantial quote through', () => {
    expect(passesGate(post({ isQuote: true, text: long(400) }))).toEqual({
      ok: true,
    })
  })

  it('rejects sub-280 posts that are not thread roots', () => {
    expect(passesGate(post({ text: long(279) }))).toEqual({
      ok: false,
      why: 'too short',
    })
  })

  it('passes a short thread root', () => {
    expect(
      passesGate(post({ isThreadRoot: true, text: long(50) })),
    ).toEqual({ ok: true })
  })

  it('passes a long single post', () => {
    expect(passesGate(post({ text: long(280) }))).toEqual({ ok: true })
  })
})

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('collapses runs of non-alphanumerics into one hyphen', () => {
    expect(slugify('café & restaurant!!')).toBe('caf-restaurant')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugify('--already--slugged--')).toBe('already-slugged')
  })

  it('caps at 60 characters', () => {
    expect(slugify(long(70))).toHaveLength(60)
  })

  it('never ends in a hyphen after truncation', () => {
    // The 60-char cut lands exactly on the separator; the trailing hyphen
    // must still be stripped.
    const slug = slugify(`${long(59)} b`)
    expect(slug).toBe(long(59))
    expect(slug.endsWith('-')).toBe(false)
  })

  it('returns empty for pure punctuation', () => {
    expect(slugify('!?!')).toBe('')
  })
})
