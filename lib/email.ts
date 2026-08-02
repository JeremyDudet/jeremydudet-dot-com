import { render } from '@react-email/render'
import type { ReactElement } from 'react'

/**
 * Email transport, behind an interface.
 *
 * The newsletter's look lives in emails/PostEmail.tsx and renders to plain
 * HTML — every provider accepts that, so which one sends is a config choice,
 * not an architectural one. Swapping Resend for SES is `EMAIL_PROVIDER=ses`.
 */
export type Mail = {
  to: string
  subject: string
  /** Either a React email component or ready-made HTML. */
  react?: ReactElement
  html?: string
  text?: string
  /** RFC 8058 one-click unsubscribe. Gmail files bulk mail without it. */
  unsubscribeUrl?: string
}

export interface EmailProvider {
  readonly name: string
  /** Max recipients per API call. Callers chunk to this. */
  readonly batchSize: number
  send(mail: Mail | Mail[]): Promise<void>
}

export function from() {
  return process.env.NEWSLETTER_FROM ?? 'Jeremy Dudet <hello@jeremydudet.com>'
}

async function toHtml(mail: Mail): Promise<string> {
  if (mail.html) return mail.html
  if (mail.react) return render(mail.react)
  throw new Error('Mail needs either html or react')
}

function headers(mail: Mail) {
  if (!mail.unsubscribeUrl) return undefined
  return {
    'List-Unsubscribe': `<${mail.unsubscribeUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

/* ---------------------------------------------------------------- resend -- */

let resendClient: import('resend').Resend | null = null

const resendProvider: EmailProvider = {
  name: 'resend',
  batchSize: 100,

  async send(mail) {
    const { Resend } = await import('resend')
    if (!resendClient) {
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) throw new Error('RESEND_API_KEY is not set')
      resendClient = new Resend(apiKey)
    }

    const list = Array.isArray(mail) ? mail : [mail]
    const payload = await Promise.all(
      list.map(async (m) => ({
        from: from(),
        to: m.to,
        subject: m.subject,
        html: await toHtml(m),
        headers: headers(m),
      })),
    )

    const { error } = Array.isArray(mail)
      ? await resendClient.batch.send(payload)
      : await resendClient.emails.send(payload[0])

    if (error) throw new Error(`resend: ${error.message}`)
  },
}

/* ------------------------------------------------------------------- ses -- */

/**
 * AWS SES. ~$0.10 per 1,000 emails with unlimited verified domains, which is
 * why it's here: Resend's free plan allows one domain, and a second costs $20
 * a month.
 *
 * Two things to know before switching: production access needs a manual AWS
 * request (~24h, and SPF/DKIM/DMARC must already exist), and SES has no batch
 * endpoint — each recipient is its own call, hence batchSize 1.
 */
const sesProvider: EmailProvider = {
  name: 'ses',
  batchSize: 1,

  async send(mail) {
    // Optional dependency — not installed until SES is actually chosen, so
    // package.json stays free of an AWS SDK nobody is using yet.
    let sdk: {
      SESv2Client: new (cfg: { region: string }) => {
        send: (cmd: unknown) => Promise<unknown>
      }
      SendEmailCommand: new (input: unknown) => unknown
    }
    try {
      // Indirected through a variable so TypeScript doesn't resolve the
      // specifier at build time — the package is genuinely optional.
      const specifier = '@aws-sdk/client-sesv2'
      sdk = await import(/* webpackIgnore: true */ specifier)
    } catch {
      throw new Error(
        'EMAIL_PROVIDER=ses requires the AWS SDK. Run: npm i @aws-sdk/client-sesv2',
      )
    }

    const { SESv2Client, SendEmailCommand } = sdk
    const client = new SESv2Client({
      region: process.env.AWS_REGION ?? 'us-east-2',
    })
    const list = Array.isArray(mail) ? mail : [mail]

    for (const m of list) {
      await client.send(
        new SendEmailCommand({
          FromEmailAddress: from(),
          Destination: { ToAddresses: [m.to] },
          Content: {
            Simple: {
              Subject: { Data: m.subject, Charset: 'UTF-8' },
              Body: { Html: { Data: await toHtml(m), Charset: 'UTF-8' } },
              Headers: m.unsubscribeUrl
                ? [
                    { Name: 'List-Unsubscribe', Value: `<${m.unsubscribeUrl}>` },
                    {
                      Name: 'List-Unsubscribe-Post',
                      Value: 'List-Unsubscribe=One-Click',
                    },
                  ]
                : undefined,
            },
          },
        }),
      )
    }
  },
}

/* -------------------------------------------------------------- console -- */

/** Prints instead of sending. Lets the whole newsletter path be exercised
 *  before any provider is configured. */
const consoleProvider: EmailProvider = {
  name: 'console',
  batchSize: 100,

  async send(mail) {
    const list = Array.isArray(mail) ? mail : [mail]
    for (const m of list) {
      const html = await toHtml(m)
      console.log(
        `[email:console] to=${m.to} subject=${JSON.stringify(m.subject)} ` +
          `html=${html.length}b unsubscribe=${m.unsubscribeUrl ?? 'none'}`,
      )
    }
  },
}

const PROVIDERS: Record<string, EmailProvider> = {
  resend: resendProvider,
  ses: sesProvider,
  console: consoleProvider,
}

export function emailProvider(): EmailProvider {
  const name = process.env.EMAIL_PROVIDER ?? 'resend'
  const provider = PROVIDERS[name]
  if (!provider) {
    throw new Error(
      `Unknown EMAIL_PROVIDER "${name}". Available: ${Object.keys(PROVIDERS).join(', ')}`,
    )
  }
  return provider
}

export function sendMail(mail: Mail | Mail[]) {
  return emailProvider().send(mail)
}
