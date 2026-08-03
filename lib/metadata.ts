export const SITE = {
  name: 'Jeremy Dudet',
  // www, not apex: www is the primary host on Vercel and the apex 308s to it.
  // Server-to-server calls (the cron tick authenticating into its own steps)
  // MUST NOT cross that redirect — fetch strips the Authorization header on
  // cross-origin redirects, which silently broke the nightly pipeline.
  url: 'https://www.jeremydudet.com',
  description:
    'Jeremy Dudet — Developer building AI-powered tools for restaurants. Former Uber engineer, founder of StockCount. Based in Austin, TX.',
  social: {
    linkedin: 'https://www.linkedin.com/in/jeremydudet/',
    github: 'https://github.com/JeremyDudet',
    x: 'https://x.com/jeremyfdudet',
  },
} as const

/** Identity for the tweet-styled post cards, on the site and in the email. */
export const AUTHOR = {
  name: 'Jeremy Dudet',
  handle: 'jeremyfdudet',
  avatarPath: '/images/avatar.jpg',
  verified: true,
} as const

/**
 * Email clients have no page origin, so every asset and link in an email needs
 * an absolute URL. Defaults to the production site; the dev preview passes its
 * own origin so the avatar isn't broken before the first deploy.
 */
export function absolute(path: string, baseUrl: string = SITE.url) {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}
