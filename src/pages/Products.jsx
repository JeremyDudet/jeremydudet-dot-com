import { Helmet } from 'react-helmet-async'
import { Container } from '@/components/Container'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'

export default function Products() {
  return (
    <>
      <Helmet>
        <title>Products — Jeremy Dudet</title>
      </Helmet>
      <Container>
        <Heading level={1}>Products</Heading>
        <Text className="mt-2">Tools I'm building.</Text>

        <div className="mt-12 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <Heading level={3}>Stockcount</Heading>
              <Text className="mt-1">
                Voice-powered inventory management for food &amp; beverage businesses.
              </Text>
            </div>
            <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
              In development
            </span>
          </div>
          <Text className="mt-4">
            Stockcount lets you count inventory by speaking naturally instead of
            typing into spreadsheets. It handles day-to-day managerial accounting
            tasks like waste tracking and cost analysis. It's the tool I wish I had
            when working in F&amp;B retail.
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
