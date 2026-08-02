import type { MetadataRoute } from 'next'

/**
 * Makes /journal installable to the iPhone home screen. `start_url` points at
 * the journal rather than the site root so the icon opens straight into the
 * compose box.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Journal — Jeremy Dudet',
    short_name: 'Journal',
    description: 'Raw notes, judged before anything leaves.',
    start_url: '/journal',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      {
        src: '/images/avatar.jpg',
        sizes: '400x400',
        type: 'image/jpeg',
      },
    ],
  }
}
