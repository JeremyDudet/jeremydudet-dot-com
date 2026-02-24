import type { Metadata } from 'next'
import { Inter, Caveat } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { PageNav } from '@/components/PageNav'
import { SITE } from '@/lib/metadata'
import '@/styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  weight: ['400', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.name,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.name,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE.url,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${caveat.variable}`}>
      <body className="font-sans text-zinc-950 antialiased bg-zinc-100 dark:text-white dark:bg-zinc-950">
        <main className="flex flex-1 flex-col pb-2 min-w-0 pt-2 pr-2 pl-2 min-h-screen h-full">
          <div className="grow p-6 rounded-2xl bg-white ring-1 shadow-xs ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10 h-full min-h-full">
            <div className="mx-auto max-w-6xl my-8">
              <PageNav />
              {children}
            </div>
          </div>
        </main>
        <Analytics />
      </body>
    </html>
  )
}
