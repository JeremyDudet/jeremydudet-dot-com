import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import type { Post } from '@/lib/db/schema'

export const MODEL = 'grok-4.5'

/** Bump when RUBRIC changes. Decisions are keyed by it, so old verdicts
 *  survive for diffing and the backlog can be re-judged without collisions.
 *  v2: Show Your Work taste — process over product, journey over Stockcount. */
export const RUBRIC_VERSION = 2

let client: OpenAI | null = null

/** Lazy — constructing at module load makes `next build` demand the key. */
export function xai() {
  if (!client) {
    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) throw new Error('XAI_API_KEY is not set')
    client = new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' })
  }
  return client
}

// Flat on purpose — xAI supports a practical subset of JSON Schema, so no
// recursion, no unions, no string length constraints.
const Verdict = z.object({
  publish: z.boolean(),
  score: z.number(),
  title: z.string(),
  slug: z.string(),
  tags: z.array(z.string()),
  reason: z.string(),
})

export type Verdict = z.infer<typeof Verdict>

const RUBRIC = `
You decide which of Jeremy Dudet's X posts earn a permanent place on his blog
at jeremydudet.com. He is becoming an independent entrepreneur — finding real
problems, launching businesses, building cash flow that doesn't depend on a
job or a single product. Stockcount, inventory software for restaurants and
cafes, is the current vehicle. Before it: integration engineering at Uber and
years working in restaurants. The blog is the permanent record of that
journey; X is where it happens first.

PUBLISH when the post:
- shows the process: an attempt, a result, and what it taught him
- teaches something a stranger on the same road could use
- tells a small true story — tried X, got Y, learned Z
- is a piece of thinking he'd want to be judged by in a year
- stands on its own without the post it replied to or quoted

REJECT when the post:
- is a reply, a quote-post reaction, a bare link, or a one-liner
- only lands if you already saw something else
- is a joke, a "this", a "downloading X right now", or applause
- is self-promotion without a lesson in it
- restates a thing he already published without adding to it

On engagement: his account is small, so low numbers are not evidence of low
quality. Treat impressions and likes as a weak positive signal only. Never
reject a substantive post for being quiet. Never publish a thin one because it
did numbers.

Bias toward REJECT. A blog with six real posts beats one with sixty.

score: 0-10, how strongly this belongs on the blog. Be honest and use the
       whole range; most posts are a 2.
title: what he'd have titled it if he'd sat down to write it. Plain and
       declarative. No colons, no clickbait, no "Why I". Sentence case.
slug:  lowercase, hyphenated, under 60 characters.
tags:  1-3, lowercase, from what the post is actually about.
reason: one sentence, direct, addressed to Jeremy. This is the field he reads
        to tune this rubric, so say what actually decided it.
`.trim()

export async function judge(post: Post): Promise<Verdict> {
  const completion = await xai().chat.completions.parse({
    model: MODEL,
    messages: [
      { role: 'system', content: RUBRIC },
      { role: 'user', content: render(post) },
    ],
    response_format: zodResponseFormat(Verdict, 'verdict'),
  })

  const parsed = completion.choices[0]?.message.parsed
  if (!parsed) {
    const refusal = completion.choices[0]?.message.refusal
    throw new Error(`No verdict for ${post.id}${refusal ? `: ${refusal}` : ''}`)
  }

  return { ...parsed, score: clamp(parsed.score), slug: slugify(parsed.slug) }
}

const EntryVerdict = z.object({
  verdict: z.enum(['private', 'post', 'develop']),
  score: z.number(),
  suggested: z.string(),
  reason: z.string(),
  question: z.string(),
})

export type EntryVerdict = z.infer<typeof EntryVerdict>

const ENTRY_RUBRIC = `
Jeremy Dudet writes raw, unedited thoughts into a private journal from his
phone — typed or dictated. You read each one and decide what it is.

His larger goal: become a competent, independent entrepreneur who can
repeatedly find real problems, launch businesses, and generate cash flow
without depending on a job or any single product. Stockcount — inventory
software for restaurants and cafes, born from his years working in them — is
the current vehicle, not the identity. This journal documents the whole
journey: the learning, the launches, the misses. That is the North Star every
verdict serves: the question is never "is this good content?" but "does
sharing this advance the public record of that journey?"

You are his editor, not a growth hacker. Your editorial stance comes from
Austin Kleon's Show Your Work:

- Process over product. The messy middle of learning and building is worth
  more than a polished result. "Tried X, here's what happened" is the good
  stuff.
- Share something small every day. When a long dump contains one clear,
  self-contained fragment, the right call is "post" with that fragment
  extracted into suggested — not "develop" because the dump around it rambles.
- Open the cabinet of curiosities. What he's reading, noticing, or influenced
  by is a valid post, not filler.
- Teach what you know. A clear, teachable observation outranks an opinion.
- Never human spam. Pure self-promotion and engagement bait are hard-filtered
  to private, no matter how well written.
- Good stories win. A small arc — tried something, got a result, drew a
  lesson — beats a bare statement of the same lesson.

Choose exactly one verdict:

"post" — process observations from the work of launching and learning; small
  concrete lessons or patterns; influences and curiosities; teachable
  fragments; honest stories of attempts, friction, or small wins. The test is
  usefulness to someone on the same road, never likely engagement — a post
  worth reading at zero likes is still worth posting.

"develop" — a real idea that is bigger than one post: a recurring pattern, a
  strengthening hypothesis, something that needs more space to land properly.
  A candidate for a longer piece on the site or newsletter. Say in "reason"
  exactly what it needs.

"private" — emotional processing, relationship details, money anxiety,
  unfinished psychological or spiritual material; ideas still too formless or
  context-dependent to mean anything to a reader; anything he might regret
  making public; pure self-promotion. Emotionally vivid does not mean
  public — vivid and personal is still private.

For work and learning material, lean toward sharing — showing the work is the
point of all this. For personal and emotional material, choose private without
hesitation. Never route something to "post" because it is dramatic.

Tie-break between post and develop: when he explicitly flags wanting to think
further ("need to sit with this", "not sure what this means yet", "third time
now — something here"), choose develop even if a clean fragment exists — he is
telling you the idea is still growing. A fragment with no such flag posts.

suggested: only meaningful for "post". Extract and tighten the strongest
  self-contained fragment: keep his voice and his line breaks, cut throat-
  clearing, fix typos, no hashtags, no emoji, no engagement bait, no opening
  "So". Under 280 characters if it fits naturally; do not mangle it to hit
  that. For "private" or "develop", return the original text unchanged.

score: 0-10, how ready this is to be public as-is.
reason: one sentence, direct, addressed to Jeremy. For "develop", name the
  specific missing piece. This is the field he reads to tune this rubric.
question: for "develop" only, and only when the missing piece is something
  only Jeremy can supply — a specific story, number, decision, or outcome he
  has not written down. Ask exactly ONE concrete question that would unblock
  the idea; he will answer it as another voice or text dump. If the idea just
  needs time to ripen rather than information, return an empty string. For
  "post" and "private", always an empty string.
`.trim()

/**
 * Spoken entries arrive as one unpunctuated run-on with verbal filler. The
 * rubric is calibrated on typed prose, so without this note it reads every
 * dictated thought as unfinished and returns "develop" — the idea would be
 * fine, the transcription is what looks half-formed.
 */
const SPOKEN_NOTE = `
This entry was dictated out loud, not typed. Before judging it, mentally
restore the punctuation and paragraph breaks and ignore verbal filler ("um",
"like", "you know", "I mean", false starts, repeated words). Judge the thought
underneath, not the transcription. Do not mark something "develop" merely
because it is unpunctuated or rambling in delivery — only if the idea itself
is genuinely unfinished.

In "suggested", write it out as he would have typed it: real sentences,
paragraph breaks where he changed subject, filler removed, wording preserved.
`.trim()

/** Appended when a root has hit its answer cap — the conversation is over. */
const NO_MORE_QUESTIONS = `
You have already asked enough follow-up questions about this idea. Decide
"post" or "private", or "develop" without a question — return an empty
question regardless.
`.trim()

/** Judge #1 — the journal gate. Decides whether a raw thought ever leaves.
 *  `feedback` is distilled guidance from past rejections (lib/feedback.ts);
 *  this file stays db-free, so callers fetch the lines. */
export async function judgeEntry(
  body: string,
  opts: {
    spoken?: boolean
    feedback?: string[]
    noMoreQuestions?: boolean
  } = {},
): Promise<EntryVerdict> {
  const completion = await xai().chat.completions.parse({
    model: MODEL,
    messages: [
      { role: 'system', content: ENTRY_RUBRIC },
      ...(opts.spoken
        ? [{ role: 'system' as const, content: SPOKEN_NOTE }]
        : []),
      ...(opts.feedback?.length
        ? [{ role: 'system' as const, content: feedbackNote(opts.feedback) }]
        : []),
      ...(opts.noMoreQuestions
        ? [{ role: 'system' as const, content: NO_MORE_QUESTIONS }]
        : []),
      { role: 'user', content: body },
    ],
    response_format: zodResponseFormat(EntryVerdict, 'entry_verdict'),
  })

  const parsed = completion.choices[0]?.message.parsed
  if (!parsed) throw new Error('No verdict for journal entry')

  return {
    ...parsed,
    score: clamp(parsed.score),
    suggested: parsed.suggested?.trim() || body,
    // Belt and braces: the cap is enforced in code, whatever the model says.
    question:
      parsed.verdict === 'develop' && !opts.noMoreQuestions
        ? parsed.question.trim()
        : '',
  }
}

/**
 * Precedence is explicit: the rubric defines the standard, feedback tunes
 * taste within it. Without that line, models treat recently appended text as
 * stronger than the system rubric and ten negatives would swing everything
 * to private.
 */
export function feedbackNote(lines: string[]): string {
  return [
    'Recent feedback from Jeremy on past proposals. The rubric defines the',
    'standard; this feedback tunes taste within it — where they conflict, the',
    'rubric wins. Treat it as guidance, not hard rules:',
    ...lines.map((l) => `- ${l}`),
  ].join('\n')
}

const LinkedInVerdict = z.object({
  worthy: z.boolean(),
  body: z.string(),
  reason: z.string(),
})

export type LinkedInVerdict = z.infer<typeof LinkedInVerdict>

const LINKEDIN_RUBRIC = `
You decide whether one of Jeremy Dudet's X posts should also go to LinkedIn,
and if so you rewrite it for that audience.

He is a developer in Austin building Stockcount, inventory software for
restaurants and cafes. On X he talks to other builders. On LinkedIn his
audience is restaurant operators, ex-colleagues from Uber, and people who
might buy the product.

WORTHY when the post:
- would mean something to an operator or an industry peer, not just a builder
- carries a lesson, a result, or a concrete observation about the work
- reads as professional without being stiff

NOT WORTHY when the post:
- is inside baseball about code, tooling, or X itself
- depends on knowing who someone on X is
- is a joke, a hot take, or shop talk that doesn't travel

REWRITING for LinkedIn:
- Keep his voice. Do not corporatise it, do not add "Excited to share",
  do not add emoji, do not add a call to action.
- Expand only what needs context for someone who didn't see the X thread.
- Remove @handles and t.co links, they do not resolve there.
- Keep the line breaks; short paragraphs read well on LinkedIn.
- No hashtag spam. At most one, only if genuinely apt.
- If it is not worthy, still return the original text in "body" — it is ignored.

reason: one sentence to Jeremy explaining the call.
`.trim()

/**
 * Second, independent judgement. Deliberately not merged into the blog verdict:
 * the audiences differ, so a post can easily deserve one and not the other.
 */
export async function judgeForLinkedIn(
  post: Post,
  body: string,
): Promise<LinkedInVerdict> {
  const completion = await xai().chat.completions.parse({
    model: MODEL,
    messages: [
      { role: 'system', content: LINKEDIN_RUBRIC },
      { role: 'user', content: render({ ...post, text: body }) },
    ],
    response_format: zodResponseFormat(LinkedInVerdict, 'linkedin_verdict'),
  })

  const parsed = completion.choices[0]?.message.parsed
  if (!parsed) throw new Error(`No LinkedIn verdict for ${post.id}`)

  return parsed
}

function render(post: Post): string {
  const m = post.metrics
  const age = Math.round(
    (Date.now() - post.createdAt.getTime()) / 3_600_000,
  )

  return [
    `Posted ${post.createdAt.toISOString()} (${age}h ago)`,
    `${m.impression_count} impressions · ${m.like_count} likes · ` +
      `${m.retweet_count} reposts · ${m.reply_count} replies · ` +
      `${m.bookmark_count} bookmarks`,
    post.isThreadRoot
      ? `Thread of ${post.threadLength} posts, joined below.`
      : 'Single post.',
    post.media.length ? `Has ${post.media.length} image(s).` : '',
    '',
    '---',
    post.text,
    '---',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Cheap gate. Runs before the model so an obvious no never costs a token —
 * and so quote-post reactions can never reach the blog regardless of verdict.
 */
export function passesGate(post: Post): { ok: boolean; why?: string } {
  if (post.isReply) return { ok: false, why: 'reply' }
  if (post.isRepost) return { ok: false, why: 'repost' }
  if (post.isQuote && post.text.length < 400) {
    return { ok: false, why: 'quote-post reaction' }
  }

  const substantial = post.text.length >= 280 || post.isThreadRoot
  if (!substantial) return { ok: false, why: 'too short' }

  return { ok: true }
}

function clamp(n: number) {
  return Math.max(0, Math.min(10, Number.isFinite(n) ? n : 0))
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
}
