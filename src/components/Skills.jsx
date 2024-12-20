import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import discordImage from '@/images/resources/discord.svg'
import figmaLogo from './../../public/figma.png'
import { NodeLogo } from './NodeLogo'
import { BunLogo } from './BunLogo'
import { ReactLogo } from './ReactLogo'
import elephant from './../../public/elephant.png'

const skills = [
  {
    title: 'Front-end Development',
    description:
      "I build modern websites with React, making them both beautiful and functional. From responsive layouts to smooth interactions, I love bringing designs to life in the browser.",
    image: function FrontEndImage() {
      return (
        <div className="absolute inset-0 flex items-center justify-center gap-8 bg-[radial-gradient(#2B313D_45%,#090A0A)]">            
            <ReactLogo className="w-1/3 hover:scale-110 transition-transform" />
        </div>
      )
    },
  },
  {
    title: 'Server-side Development',
    description:
      "I like to use Node.js, Bun.js, and Express to build APIs and real-time features that power websites and apps.",
    image: function ServerSideImage() {
      return (
        <div className="absolute inset-0 flex items-center justify-center gap-8 bg-[radial-gradient(#2B313D_45%,#090A0A)]">
            <NodeLogo className="w-1/4 hover:scale-110 transition-transform" /> 
            <BunLogo className="w-1/3 hover:scale-110 transition-transform" />
        </div>
      )
    },
  },
  {
    title: 'SQL',
    description:
      "I love structuring databases and writing SQL queries to get exactly what you need. PostgreSQL and MySQL? I've got them both covered.",
    image: function SQLImage() {
      return (
        <div className="absolute inset-0 flex items-center justify-center gap-8 bg-[radial-gradient(#2B313D_45%,#090A0A)]">            
            <img src={elephant} className="w-1/3 hover:scale-110 transition-transform" />
        </div>
      )
    },
  },
  {
    title: 'Figma',
    description:
      "While I'm not a professional designer, I love using Figma to mock up my ideas and bring other people's designs to life. I can work from existing design systems or create basic mockups to get projects started. It's a skill I'm always improving!",
    image: function FigmaImage() {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(#2C313D_35%,#000)]">
          <img src={figmaLogo} className="w-1/4 hover:scale-110 transition-transform" alt="" />
        </div>
      )
    },
  },
  {
    title: 'More to Come',
    description:
      "Currently learning Go, Windows Batch Scripting, and Python while working at Uber. In my free time, I'm diving into LangChain for AI applications. The tech world never stops evolving. It's exciting to see where it goes!",
    image: function ComingImage() {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-blue-400 to-emerald-400">
          <span className="text-[80px]">🚀</span>
        </div>
      )
    },
  },
]

export function Skills() {
  return (
    <section
      id="skills"
      aria-labelledby="skills-title"
      className="scroll-mt-14 py-16 sm:scroll-mt-32 sm:py-20 lg:py-32"
    >
      <Container>
        <SectionHeading number="3" id="skills-title">
          Skills
        </SectionHeading>
        <p className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900">
          Skills I've acquired over the years.
        </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          Skills I've acquired over the years.
        </p>
      </Container>
      <Container size="lg" className="mt-16">
        <ol
          role="list"
          className="-mx-3 grid grid-cols-1 gap-y-10 lg:grid-cols-3 lg:text-center xl:-mx-12 xl:divide-x xl:divide-slate-400/20"
        >
          {skills.map((skill) => (
            <li
              key={skill.title}
              className="grid auto-rows-min grid-cols-1 items-center gap-8 px-3 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-1 xl:px-12"
            >
              <div className="relative h-48 overflow-hidden rounded-2xl shadow-lg sm:h-60 lg:h-40">
                <skill.image />
              </div>
              <div>
                <h3 className="text-base font-medium tracking-tight text-slate-900">
                  {skill.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {skill.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
