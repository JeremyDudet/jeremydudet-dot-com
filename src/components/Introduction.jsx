import { CheckIcon } from '@/components/CheckIcon'
import { LinkedInIcon } from '@/components/LinkedInIcon'
import { GitHubIcon } from '@/components/GitHubIcon'
import { UberEatsLogo } from '@/components/UberEatsLogo'
import { Link } from '@/components/Link'
import { Container } from '@/components/Container'
import { ResumeIcon } from '@/components/ResumeIcon'
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
          Currently, I'm working at <span className="inline-block align-middle mx-1"><UberEatsLogo className="inline-block h-[18px] w-[90px] -translate-y-[4px]" /></span> helping grocery and retail stores sync their inventory. I work with systems that pull data from stores and convert it into a format Uber can use.
        </p>
        <p className="mt-4">
          My goal, generally speaking, is to build cool stuff that helps people.
        </p>
        <p className="mt-4">
          I really enjoy:
        </p>
        <ul role="list" className="mt-8 space-y-3">
          {[
            'Building full-stack apps with TypeScript and React',
            'Learning about this little thing called AI and how to implement it in my work',
            'Building side projects',
            'pretty much all things tech...!',
          ].map((feature) => (
            <li key={feature} className="flex">
              <CheckIcon className="h-8 w-8 flex-none fill-blue-500" />
              <span className="ml-4">{feature}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          When I'm not coding, you'll find me hiking trails, exploring local restaurants, or at the gym.
        </p>
        <p className="mt-8 flex flex-col md:flex-row gap-4">      
              <Link
                href="https://www.linkedin.com/in/jeremydudet/"
                className="inline-flex items-center text-base font-medium tracking-tight text-slate-900"
              >
                <LinkedInIcon className="h-10 w-10 fill-blue-600" />
                <span className="ml-4">Contact on LinkedIn</span>
              </Link>
              <Link
                href="https://github.com/JeremyDudet"
                className="inline-flex items-center text-base font-medium tracking-tight text-slate-900"
              >
                <GitHubIcon className="h-10 w-10 fill-current" />
                <span className="ml-4">Follow on GitHub</span>
              </Link>
              <Link
                href="https://docs.google.com/document/d/1nsesUtw6HBj_iqDslqgkOHYwD_-Qz9cQPmfjdRdTjGs/edit?tab=t.0#heading=h.ohn8az5e7lg"
                className="inline-flex items-center text-base font-medium tracking-tight text-slate-900"
              >
                <ResumeIcon className="h-10 w-10 fill-current" />
                <span className="ml-4">View Resume</span>
              </Link>
            </p>
      </Container>
    </section>
  )
}
