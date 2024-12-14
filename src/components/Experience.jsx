import { Container } from "@/components/Container";
import {
  Expandable,
  ExpandableButton,
  ExpandableItems,
} from "@/components/Expandable";
import { SectionHeading } from "@/components/SectionHeading";
import { UberLogo } from "@/components/UberLogo";
import { KonditoreiLogo } from "@/components/KonditoreiLogo";
import { BarZolaLogo } from "@/components/BarZolaLogo";
import { OakAndVioletLogo } from "@/components/OakAndVioletLogo";
const experiences = [
  {
    company: "Uber",
    logo: <UberLogo className="w-16 h-16" />,
    positions: {
      "Software Engineer - UberEats POS Integrations": "June 2024 - Present",
    },
  },
  {
    company: "Konditorei Cafe",
    logo: <KonditoreiLogo className="w-28 h-16" />,
    positions: {
      "Team Member - Operations": "April 2023 - June 2024",
      "Software Developer - Developed custom inventory management software":
        "December 2023 - June 2024",
      "Web Developer - Built custom website": "December 2023 - June 2024",
    },
  },
  {
    company: "Zola + BarZola",
    logo: <BarZolaLogo className="w-28 h-16" />,
    positions: {
      "Team Member - Server & Bartender": "December 2021 - May 2023",
      "IT Support": "April 2022 - December 2022",
    },
  },
  {
    company: "Oak+Violet",
    logo: <OakAndVioletLogo className="w-18 h-24" />,
    positions: {
      Bartender: "October 2018 - November 2021",
    },
  },
];

export function Experience() {
  return (
    <section
      id="experience"
      aria-labelledby="experience-title"
      className="scroll-mt-14 py-16 sm:scroll-mt-32 sm:py-20 lg:py-32"
    >
      <Container>
        <SectionHeading number="2" id="experience-title">
          Experience
        </SectionHeading>
        <p className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900">
          Work experience.
        </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          Companies I've worked at and the projects I've been involved in.
        </p>

        <Expandable>
          <ol role="list" className="mt-16 space-y-10 sm:space-y-16">
            <ExpandableItems>
              {experiences.map((experience) => (
                <li key={experience.company}>
                  {!experience.logo && (
                    <h3 className="font-display text-3xl font-bold tracking-tight text-slate-900">
                      {experience.company}
                    </h3>
                  )}
                  {experience.logo}
                  <ol
                    role="list"
                    className="mt-8 divide-y divide-slate-300/30 rounded-2xl bg-slate-50 px-6 py-3 text-base tracking-tight sm:px-8 sm:py-7"
                  >
                    {Object.entries(experience.positions).map(
                      ([title, date]) => (
                        <li
                          key={title}
                          className="flex justify-between py-3"
                          aria-label={`${title} on page ${date}`}
                        >
                          <span
                            className="font-medium text-slate-900"
                            aria-hidden="true"
                          >
                            {title}
                          </span>
                          <span
                            className="font-mono text-slate-400"
                            aria-hidden="true"
                          >
                            {date}
                          </span>
                        </li>
                      )
                    )}
                  </ol>
                </li>
              ))}
            </ExpandableItems>
          </ol>
          <ExpandableButton>See more</ExpandableButton>
        </Expandable>
      </Container>
    </section>
  );
}
