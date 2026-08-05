import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { MODEL, xai } from '@/lib/judge'
import { DRAFT_RULES, TEMPLATE_RULES } from '@/lib/curator'
import { feedbackFor } from '@/lib/feedback'
import { journalEntry, writeComposedDraft } from '@/lib/db/queries'
import { threadById, threadEntries } from '@/lib/db/zettel'
import { extractTitle } from '@/lib/markdown'
import { sharingMode } from '@/lib/settings'

/**
 * The writer pass — the "posts I couldn't have written in one sitting" half
 * of the harvest. Tapping Harvest seeds a durable draft synchronously (the
 * concatenation of the thread's entries); this runs afterwards in after() and
 * composes that raw material into a markdown essay.
 *
 * Three things make it safe to fail:
 * - the concatenation is already saved, so a failure costs nothing but the
 *   composition — it is the designed degrade path, not an error state
 * - the material is threadEntries(), which filters sealed in SQL
 * - the write is conditional on him not having edited the draft already
 *   (writeComposedDraft), so a slow compose can never clobber a head start
 */

// Flat on purpose — xAI supports a practical subset of JSON Schema.
const Essay = z.object({ markdown: z.string() })

const ESSAY_RUBRIC = `
Jeremy Dudet has been circling one idea in his private journal for weeks. The
separate entries below are his — raw, written at different times, in his own
words. The thread is ripe and he has asked for it as one long-form piece for
his blog at jeremydudet.com.

He is becoming an independent entrepreneur — finding real problems, launching
businesses, building cash flow that doesn't depend on a job or any single
product. Stockcount, inventory software for restaurants and cafes, is the
current vehicle, not the identity. Before it: integration engineering at Uber
and years working in restaurants. The blog is the permanent record of that
journey.

Your editorial stance is Austin Kleon's Show Your Work: process over product,
teach what you know, small true stories (tried X, got Y, learned Z), never
human spam. An essay is worth publishing when a stranger on the same road
could use it.

What you are doing is assembly and connection, not authorship. The value here
is that these entries were written weeks apart and he has never seen them
side by side — find the arc across them, put it in the order that makes it
land, and let his own sentences carry it. You may reorder, connect, and cut.
You may not invent facts, numbers, events, opinions, or outcomes. Where the
material runs out, leave [ your words: what goes here ] rather than filling
the hole yourself.

OUTPUT — markdown, and nothing but the essay:
- The first line is the title, as a single '#' heading. This is required: the
  blog reads its h1 from it. Plain and declarative, sentence case, no colons,
  no clickbait, no "Why I".
- Use '##' section headings only where the piece genuinely turns.
- Keep his register: plain, direct, his phrasing wherever possible. No
  hashtags, no emoji, no engagement bait, no "In conclusion", no throat-
  clearing opener, no closing call to action.
- Do not include the raw entries as a list, and do not narrate your process.

This is a draft he will rewrite, not a product awaiting approval.
`.trim()

/**
 * The brief: his material plus the artifact rules for the current sharing
 * mode. Pure and separate from the call so it can be read in a test — the
 * only thing standing between his journal and a model is the shape of this
 * string.
 */
export function buildEssayPrompt(input: {
  threadName: string
  summary: string | null
  members: string[]
  feedback: string[]
  rules: string
}): string {
  return [
    `THREAD: "${input.threadName}"`,
    ``,
    `LIVING SUMMARY:`,
    input.summary?.trim() || '(none)',
    ``,
    `HIS ENTRIES (${input.members.length}, oldest first). This is the whole of`,
    `the material you may use — there is nothing else:`,
    ``,
    input.members.map((m, i) => `--- entry ${i + 1} ---\n${m.trim()}`).join('\n\n'),
    ``,
    `HIS TASTE, IN HIS OWN WORDS (recent feedback on past proposals — guidance,`,
    `not hard rules; where it conflicts with the rubric, the rubric wins):`,
    input.feedback.length
      ? input.feedback.map((f) => `- ${f}`).join('\n')
      : '(none yet)',
    ``,
    `HOW TO SHAPE THE ARTIFACT:`,
    input.rules,
  ].join('\n')
}

/**
 * A composed essay without a title has no h1 on the blog and no slug at
 * publish, so the thread's name stands in. Publish falls back the same way —
 * doing it here too means the card shows the title he will actually get, and
 * he can rewrite it in the same textarea as everything else.
 */
export function ensureTitle(markdown: string, threadName: string): string {
  const text = markdown.trim()
  if (extractTitle(text)) return text
  return `# ${threadName.trim()}\n\n${text}`
}

/**
 * Compose the essay and upgrade the seeded draft in place. Throws on a model
 * failure — the caller's catch-and-log leaves the concatenation standing.
 */
export async function composeEssay(draftId: string): Promise<void> {
  const draft = await journalEntry(draftId)
  // Only ever upgrades a harvest seed still sitting in the queue. Anything
  // else — published, dropped, re-judged — has moved on without us.
  if (!draft || draft.verdict !== 'essay' || draft.status !== 'judged') return
  if (!draft.threadId) return

  const thread = await threadById(draft.threadId)
  if (!thread) return

  const [members, feedback, mode] = await Promise.all([
    threadEntries(draft.threadId),
    // Taste is a bonus, not a precondition; a fetch failure must not cost him
    // the composition.
    feedbackFor('judge').catch(() => [] as string[]),
    sharingMode(),
  ])

  // The draft is itself a member of its own thread — same threadId, unsealed,
  // and the newest row, so it arrives last and largest. Without this filter
  // the model gets a second verbatim copy of everything, positioned as the
  // most recent entry, and deduplication becomes its problem instead of the
  // query's — working directly against the arc it was asked to find.
  const bodies = members
    .filter((m) => m.id !== draftId)
    .map((m) => m.body.trim())
    .filter(Boolean)
  if (!bodies.length) return

  const completion = await xai().chat.completions.parse({
    model: MODEL,
    messages: [
      { role: 'system', content: ESSAY_RUBRIC },
      {
        role: 'user',
        content: buildEssayPrompt({
          threadName: thread.name,
          summary: thread.summary,
          members: bodies,
          feedback,
          rules: mode === 'template' ? TEMPLATE_RULES : DRAFT_RULES,
        }),
      },
    ],
    response_format: zodResponseFormat(Essay, 'essay'),
  })

  const markdown = completion.choices[0]?.message.parsed?.markdown.trim()
  if (!markdown) throw new Error(`essay writer produced no draft for ${draftId}`)

  await writeComposedDraft(draftId, ensureTitle(markdown, thread.name))
}
