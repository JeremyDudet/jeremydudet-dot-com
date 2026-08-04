/**
 * Pure markdown helpers for the essay path. An essay draft is markdown and
 * its title lives *in* the draft as the first `# ` heading — journal has no
 * title column on purpose, so the title stays editable in the same textarea
 * as everything else. Publish extracts it; the blog renders it as the h1.
 */

/**
 * The first `# ` heading in the document (title depth only — `##` and deeper
 * are section structure, not the title). Null when the draft has none; the
 * caller falls back to the thread name.
 */
export function extractTitle(md: string): string | null {
  for (const raw of md.split('\n')) {
    const match = /^#\s+(.+)$/.exec(raw.trim())
    if (match) return match[1].trim()
  }
  return null
}

/**
 * The draft minus its title heading. The blog renders the title as its own
 * `h1` from `entries.title`, so leaving the heading in the body would print
 * it twice. Only the heading `extractTitle` picked is removed — every other
 * `#` line is section structure and stays.
 */
export function stripTitle(md: string): string {
  const lines = md.split('\n')
  const at = lines.findIndex((line) => /^#\s+.+$/.test(line.trim()))
  if (at === -1) return md.trim()
  // Splice, not slice — anything above the heading is still his writing.
  lines.splice(at, 1)
  // Removing the line between two blank ones would leave a double gap, which
  // markdown reads as an empty paragraph.
  if (at > 0 && lines[at - 1] === '' && lines[at] === '') lines.splice(at, 1)
  return lines.join('\n').trim()
}

/**
 * Markdown → plain prose, for excerpts (the blog index and the newsletter,
 * neither of which should ever carry raw markdown). Headings and horizontal
 * rules are structure, not prose, so their lines are dropped entirely — an
 * excerpt that opens by repeating the title says nothing. Template gap
 * markers ([ your words: … ]) are holes, not words, and go too.
 */
export function stripMarkdown(md: string): string {
  const lines = md
    .replace(/```[\s\S]*?```/g, '\n') // fenced code blocks
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => !/^#{1,6}\s/.test(line)) // heading lines
    .filter((line) => !/^(?:-{3,}|\*{3,}|_{3,})$/.test(line)) // hr / separators
    .map((line) =>
      line.replace(/^>\s?/, '').replace(/^(?:[-*+]|\d+\.)\s+/, ''),
    )

  return lines
    .join(' ')
    .replace(/\[\s*your words:[^\]]*\]/gi, ' ') // template gap markers
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images → alt text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → link text
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // strong
    .replace(/(\*|_)(?=\S)(.*?\S)\1/g, '$2') // emphasis
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/\s+/g, ' ')
    .trim()
}
