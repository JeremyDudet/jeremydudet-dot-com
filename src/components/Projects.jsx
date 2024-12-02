import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import setupImage from '@/images/screencasts/setup.svg'
import konditoreiWebsite from '@/images/screenshots/konditorei-website.jpeg'
import inventorei from '@/images/screenshots/inventorei.jpeg'
import strokesImage from '@/images/screencasts/strokes.svg'
import duotoneImage from '@/images/screencasts/duotone.svg'
import barzolaWebsite from '@/images/screenshots/barzola.jpeg'
import craftedAt from '@/images/screenshots/oakAndViolet.jpeg'
const projects = [
  {
    title: 'Inventorei - a Inventory Management System for Konditorei Cafe',
    description:
      "An ingredient-level inventory management for Konditorei Cafe. It allows the team to simply input what we have in stock and it auto-generates a shopping list.",
    image: inventorei,
  },
  {
    title: 'Konditorei Website',
    description:
      'A website for Konditorei Cafe built with Astro.js and Tailwind CSS.',
    image: konditoreiWebsite,
  },
  {
    title: 'Barzola.fyi',
    description:
      'A website for Barzola built with Next.js and Tailwind CSS.',
    image: barzolaWebsite,
  },
  {
    title: 'Crafted@Oak&Violet',
    description:
      'A website for Oak & Violet bar to show all the cocktails they can make with the ingredients they have in stock built with React and Firebase.',
    image: craftedAt,
  },  
]

export function Projects() {
  return (
    <section
      id="projects"
      aria-labelledby="screencasts-title"
      className="scroll-mt-14 py-16 sm:scroll-mt-32 sm:py-20 lg:py-32"
    >
      <Container>
        <SectionHeading number="1" id="screencasts-title">
          Projects
        </SectionHeading>
      </Container>
      <Container size="lg" className="mt-16">
        <ol
          role="list"
          className="grid grid-cols-1 gap-x-8 gap-y-10 [counter-reset:video] sm:grid-cols-2 lg:grid-cols-4"
        >
          {projects.map((video) => (
            <li key={video.title} className="[counter-increment:video]">
              <div
                className="relative flex h-40 items-center justify-center rounded-xl shadow-lg"
                style={{
                  backgroundImage: `url(${video.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              > 
              </div>
              <h3 className="mt-8 text-base font-medium tracking-tight text-slate-900 before:mb-2 before:block before:font-mono before:text-sm before:text-slate-500 before:content-[counter(video,decimal-leading-zero)]">
                {video.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{video.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
