import OpenAI from 'openai'

/**
 * Speech to text, behind an interface — same shape as lib/social.ts and
 * lib/email.ts so the provider is a config choice.
 *
 * Default is Groq: `whisper-large-v3-turbo` at roughly $0.0006/minute, with a
 * free tier of 2,000 requests a day that covers this outright. Groq is
 * OpenAI-compatible, so it reuses the SDK already in the project rather than
 * adding a dependency.
 */
export interface TranscribeProvider {
  readonly name: string
  readonly model: string
  transcribe(file: File): Promise<string>
}

function client(baseURL: string, apiKey: string | undefined, envVar: string) {
  if (!apiKey) throw new Error(`${envVar} is not set`)
  return new OpenAI({ apiKey, baseURL })
}

const groq: TranscribeProvider = {
  name: 'groq',
  model: 'whisper-large-v3-turbo',

  async transcribe(file) {
    const openai = client(
      'https://api.groq.com/openai/v1',
      process.env.GROQ_API_KEY,
      'GROQ_API_KEY',
    )
    const res = await openai.audio.transcriptions.create({
      file,
      model: this.model,
      // Steers spelling of terms that recur in these entries and that a
      // general model reliably mangles.
      prompt: 'Stockcount, restaurant inventory, onboarding, churn, Austin.',
    })
    return res.text.trim()
  },
}

const openaiProvider: TranscribeProvider = {
  name: 'openai',
  model: 'gpt-4o-mini-transcribe',

  async transcribe(file) {
    const openai = client(
      'https://api.openai.com/v1',
      process.env.OPENAI_API_KEY,
      'OPENAI_API_KEY',
    )
    const res = await openai.audio.transcriptions.create({
      file,
      model: this.model,
    })
    return res.text.trim()
  },
}

const PROVIDERS: Record<string, TranscribeProvider> = {
  groq,
  openai: openaiProvider,
}

export function transcribeProvider(): TranscribeProvider {
  const name = process.env.TRANSCRIBE_PROVIDER ?? 'groq'
  const provider = PROVIDERS[name]
  if (!provider) {
    throw new Error(
      `Unknown TRANSCRIBE_PROVIDER "${name}". Available: ${Object.keys(PROVIDERS).join(', ')}`,
    )
  }
  return provider
}

/** True when a key is present, so the UI can hide the mic rather than fail. */
export function transcriptionConfigured() {
  const name = process.env.TRANSCRIBE_PROVIDER ?? 'groq'
  return name === 'openai'
    ? Boolean(process.env.OPENAI_API_KEY)
    : Boolean(process.env.GROQ_API_KEY)
}

export function transcribe(file: File) {
  return transcribeProvider().transcribe(file)
}
