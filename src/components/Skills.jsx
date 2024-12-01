import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import abstractBackgroundImage from '@/images/resources/abstract-background.png'
import discordImage from '@/images/resources/discord.svg'
import figmaImage from '@/images/resources/figma.svg'
import videoPlayerImage from '@/images/resources/video-player.svg'

const skills = [
  {
    title: 'Figma icon templates',
    description:
      'Pefectly structured templates for quickly designing new icons at dozens of common sizes.',
    image: function FigmaImage() {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(#2C313D_35%,#000)]">
          <img src={figmaImage} alt="" />
        </div>
      )
    },
  },
  {
    title: 'Weekly icon teardowns',
    description:
      'Weekly videos where we dissect and recreate beautiful icons we find on the web.',
    image: function VideoPlayerImage() {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src={abstractBackgroundImage}
            alt=""
          />
          <img
            className="relative"
            src={videoPlayerImage}
            alt=""
          />
        </div>
      )
    },
  },
  {
    title: 'Community of icon designers',
    description:
      "A private Discord server where you can get help and give feedback on each others' work.",
    image: function DiscordImage() {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[#6366F1]">
          <img src={discordImage} alt="" />
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