import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/metadata'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // These are password-gated anyway; keeping them out of robots.txt means
      // not publishing a list of the private paths to anyone who reads it.
      disallow: [
        '/admin',
        '/journal',
        '/settings',
        '/login',
        '/api/',
        '/preview',
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  }
}
