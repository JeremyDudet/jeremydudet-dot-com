import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { addSubscriber } from '@/lib/db/queries'
import { sendMail } from '@/lib/email'
import { SITE } from '@/lib/metadata'
import type { Cadence } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

const CADENCES: Cadence[] = ['daily', 'weekly', 'monthly']

export async function POST(req: Request) {
  // Branch on content-type, not on whether formData() throws — it doesn't
  // throw on a JSON body, it returns an empty FormData, which silently ate
  // every JSON submission.
  const contentType = req.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')

  const form = isJson ? null : await req.formData().catch(() => null)
  const json = isJson
    ? ((await req.json().catch(() => null)) as {
        email?: string
        cadence?: string
      } | null)
    : null

  const email = String(form?.get('email') ?? json?.email ?? '')
    .trim()
    .toLowerCase()
  const raw = String(form?.get('cadence') ?? json?.cadence ?? 'weekly')
  const cadence = (CADENCES as string[]).includes(raw)
    ? (raw as Cadence)
    : 'weekly'

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 })
  }

  const token = randomBytes(24).toString('base64url')
  await addSubscriber({ email, cadence, token })

  // Double opt-in. Skipping this is how a new domain gets its sending
  // reputation destroyed by one typo'd address.
  const confirmUrl = `${SITE.url}/api/confirm?token=${token}`

  // Deliberately plain: a confirmation email that looks designed is more
  // likely to be filtered than one that reads like a person sent it.
  await sendMail({
    to: email,
    subject: 'Confirm your subscription',
    html: [
      `<p>Confirm you want ${cadence} posts from ${SITE.name}:</p>`,
      `<p><a href="${confirmUrl}">${confirmUrl}</a></p>`,
      `<p style="color:#71717a;font-size:13px">If you didn't request this, ignore this email.</p>`,
    ].join(''),
    text: [
      `Confirm you want ${cadence} posts from ${SITE.name}:`,
      '',
      confirmUrl,
      '',
      "If you didn't request this, ignore this email.",
    ].join('\n'),
  })

  return NextResponse.json({ ok: true, cadence })
}
