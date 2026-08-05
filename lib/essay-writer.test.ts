import { describe, expect, it } from 'vitest'
import { DRAFT_RULES, TEMPLATE_RULES } from './curator'
import { buildEssayPrompt, ensureTitle } from './essay-writer'

const base = {
  threadName: 'The integration moat',
  summary: 'Every integration he ships makes the next competitor slower.',
  members: ['Counted the walk-in twice today.', 'Third data point this month.'],
  feedback: ['AVOID: pitching posts that read as humblebrags'],
  rules: DRAFT_RULES,
}

describe('buildEssayPrompt', () => {
  it('names the thread and its living summary', () => {
    const prompt = buildEssayPrompt(base)
    expect(prompt).toContain('THREAD: "The integration moat"')
    expect(prompt).toContain(
      'Every integration he ships makes the next competitor slower.',
    )
  })

  it('says "(none)" rather than "null" when the thread has no summary', () => {
    const prompt = buildEssayPrompt({ ...base, summary: null })
    expect(prompt).toContain('LIVING SUMMARY:\n(none)')
    expect(prompt).not.toContain('null')
  })

  it('carries every member body, labelled and in order', () => {
    const prompt = buildEssayPrompt(base)
    expect(prompt).toContain('--- entry 1 ---\nCounted the walk-in twice today.')
    expect(prompt).toContain('--- entry 2 ---\nThird data point this month.')
    expect(prompt.indexOf('Counted the walk-in')).toBeLessThan(
      prompt.indexOf('Third data point'),
    )
  })

  it('states the member count so the model knows the material is finite', () => {
    expect(buildEssayPrompt(base)).toContain('HIS ENTRIES (2, oldest first)')
  })

  it('renders only the members it is handed — nothing else reaches the model', () => {
    // The sealed filter lives in threadEntries(); this asserts the prompt adds
    // no second source of bodies, so what the caller filtered out stays out.
    const prompt = buildEssayPrompt(base)
    expect(prompt).not.toContain('entry 3')
    expect(prompt).not.toContain('A sealed thought he never wanted sent')
  })

  it('includes the taste lines as guidance', () => {
    const prompt = buildEssayPrompt(base)
    expect(prompt).toContain('- AVOID: pitching posts that read as humblebrags')
    expect(prompt).toContain('the rubric wins')
  })

  it('says "(none yet)" when nothing has been learned yet', () => {
    expect(buildEssayPrompt({ ...base, feedback: [] })).toContain('(none yet)')
  })

  it('carries the draft rules in draft mode', () => {
    const prompt = buildEssayPrompt({ ...base, rules: DRAFT_RULES })
    expect(prompt).toContain('AN EDITABLE DRAFT, NEVER A FINISHED POST')
    expect(prompt).not.toContain('A TEMPLATE, NEVER PROSE')
  })

  it('carries the template rules — with their gap markers — in template mode', () => {
    const prompt = buildEssayPrompt({ ...base, rules: TEMPLATE_RULES })
    expect(prompt).toContain('A TEMPLATE, NEVER PROSE')
    expect(prompt).toContain('[ your words: what goes here ]')
    expect(prompt).not.toContain('AN EDITABLE DRAFT')
  })

  it('survives an empty thread without pretending there was material', () => {
    const prompt = buildEssayPrompt({ ...base, members: [] })
    expect(prompt).toContain('HIS ENTRIES (0, oldest first)')
    expect(prompt).not.toContain('--- entry 1 ---')
  })
})

describe('ensureTitle', () => {
  it('leaves a composed essay that already has its title alone', () => {
    const md = '# The eight things that walk\n\nBody text.'
    expect(ensureTitle(md, 'The integration moat')).toBe(md)
  })

  it('prepends the thread name when the writer forgot the heading', () => {
    expect(ensureTitle('Body text.', 'The integration moat')).toBe(
      '# The integration moat\n\nBody text.',
    )
  })

  it('treats a ## opener as structure, not a title', () => {
    expect(ensureTitle('## Section\n\nBody.', 'Thread name')).toBe(
      '# Thread name\n\n## Section\n\nBody.',
    )
  })

  it('accepts a title that arrives below a stray line', () => {
    const md = 'Stray preamble.\n\n# Real title\n\nBody.'
    expect(ensureTitle(md, 'Thread name')).toBe(md)
  })

  it('trims stray whitespace around the composed markdown', () => {
    expect(ensureTitle('\n\n# Title\n\nBody.\n\n', 'Thread name')).toBe(
      '# Title\n\nBody.',
    )
    expect(ensureTitle('  Body.  ', '  Thread name  ')).toBe(
      '# Thread name\n\nBody.',
    )
  })

  it('produces a title extractTitle agrees with, always', () => {
    // Publish reads the slug off extractTitle, so the two have to line up or
    // an essay reaches the blog titled after nothing.
    for (const md of ['Body only.', '## Section only', '# Has one']) {
      expect(ensureTitle(md, 'Fallback name')).toMatch(/^# \S/)
    }
  })
})
