import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AppTabs } from '@/components/AppTabs'
import '@/styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'Journal', template: '%s · Journal' },
  // Applies to every route in this group — private writing and the review
  // queue must never be indexed, linked, or previewed.
  robots: { index: false, follow: false, nocache: true },
}

export const viewport = {
  // Prevents iOS zooming the page when a text field is focused, which is
  // otherwise unavoidable and makes the composer jump on every tap.
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
}

/**
 * App shell. Deliberately shares nothing with the marketing site: no scroll
 * rail, no edge fades, no max-w-6xl. This is a tool opened several times a day
 * on a phone, and it should feel like one.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-zinc-50 font-sans text-zinc-950 antialiased dark:bg-zinc-950 dark:text-white">
        <div className="flex h-dvh flex-col">
          <main className="min-h-0 grow overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-2xl px-4 pt-5 pb-8">
              {children}
            </div>
          </main>
          <AppTabs />
        </div>
      </body>
    </html>
  )
}
