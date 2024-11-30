import { CheckIcon } from '@/components/CheckIcon'
import { Container } from '@/components/Container'
import { Link } from 'react-router-dom'

export function Introduction() {
  return (
    <section
      id="introduction"
      aria-label="Introduction"
      className="pb-16 pt-20 sm:pb-20 md:pt-36 lg:py-32"
    >
      <Container className="text-lg tracking-tight text-slate-700">
        <p className="font-display text-4xl font-bold tracking-tight text-slate-900">
          Hi, I’m Jeremy Dudet
        </p>
        <p className="mt-4">
          Currently, I'm working at UberEats helping grocery and retail stores sync their inventory. I work with systems that pull data from stores and convert it into a format Uber can use.
        </p>
        <p className="mt-4">
          My goal is to build cool stuff that helps people.
        </p>
        <p className="mt-4">
          I really enjoy:
        </p>
        <ul role="list" className="mt-8 space-y-3">
          {[
            'Building full-stack applications with JavaScript and React',
            'Learning about AI and how to implement it in my work',
            'Building side projects',
            'Hiking, nice cafes, and going to the gym',
          ].map((feature) => (
            <li key={feature} className="flex">
              <CheckIcon className="h-8 w-8 flex-none fill-blue-500" />
              <span className="ml-4">{feature}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          If this sounds interesting, I’d love to share more about what I’m working on.
        </p>
        <p className="mt-10">
          <Link
            to="/learn-more"
            className="text-base font-medium text-blue-600 hover:text-blue-800"
          >
            Check it out here{' '}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </p>
      </Container>
    </section>
  )
}
