import Link from 'next/link'
import { Container } from '@/components/Container'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'

export default function NotFound() {
  return (
    <Container>
      <div className="py-24 text-center">
        <Heading level={1}>404</Heading>
        <Text className="mt-4">Page not found.</Text>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          &larr; Back home
        </Link>
      </div>
    </Container>
  )
}
