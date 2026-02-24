import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { JsonLd } from '@/components/JsonLd'
import { softwareApplicationJsonLd } from '@/lib/structured-data'
import { SITE } from '@/lib/metadata'

export const metadata: Metadata = {
  title: 'Products',
  description:
    'Tools built by Jeremy Dudet. Stockcount — voice-powered inventory management for F&B.',
  openGraph: {
    title: 'Products | Jeremy Dudet',
    description: 'Tools built by Jeremy Dudet.',
    url: `${SITE.url}/products`,
  },
  alternates: {
    canonical: `${SITE.url}/products`,
  },
}

export default function Products() {
  return (
    <>
      <JsonLd data={softwareApplicationJsonLd()} />
      <Container>
        <Heading level={1}>Products</Heading>
        <Text className="mt-2">Tools I&apos;m building.</Text>

        <div className="mt-12 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <Heading level={3}>Stockcount</Heading>
              <Text className="mt-1">
                Voice-powered inventory management for F&amp;B.
              </Text>
            </div>
            <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
              In development
            </span>
          </div>
          <Text className="mt-4">
            Count inventory by speaking instead of typing into spreadsheets.
            Waste tracking, cost analysis, and day-to-day managerial accounting
            for F&amp;B.
          </Text>
          <div className="mt-4">
            <a
              href="https://stockcount.io"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              stockcount.io &rarr;
            </a>
          </div>
        </div>
      </Container>
    </>
  )
}
