import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Keypad } from './Keypad'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <Suspense>
      <Keypad />
    </Suspense>
  )
}
