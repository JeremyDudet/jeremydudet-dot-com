import { Container } from "@/components/Container";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { GitHubStats } from "@/components/GitHubStats";
import { StockcountProject } from "@/components/StockcountProject";

const socials = [
  { href: "https://www.linkedin.com/in/jeremydudet/", label: "LinkedIn" },
  { href: "https://github.com/JeremyDudet", label: "GitHub" },
  { href: "https://x.com/jeremyfdudet", label: "X" },
];

const work = [
  {
    title: "Stockcount",
    role: "Founder",
    dates: "feb ’26 — now",
    description:
      "Inventory software for restaurants and cafes. Built for speed, not feature lists.",
  },
  {
    title: "Uber",
    role: "Integration Engineer",
    dates: "jun ’24 — dec ’25",
    description:
      "Onboard and maintain integrations between UberEats and POS systems.",
  },
  {
    title: "Konditorei Cafe",
    role: "IT guy · Operations Manager",
    dates: "apr ’23 — jun ’24",
    description:
      "Built a full-stack inventory management system, reducing food waste and optimizing stock tracking.",
  },
  {
    title: "Zola + BarZola",
    role: "IT guy · Staff Member",
    dates: "dec ’21 — may ’23",
    description:
      "Developed an internal web application for restaurant staff, integrating Toast POS systems via APIs.",
  },
];

export function Introduction() {
  return (
    <section id="introduction" aria-label="Introduction">
      <Container size="md">
        <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-x-16 xl:grid-cols-[16rem_minmax(0,1fr)] xl:gap-x-20">
          {/* Sidebar — pinned on large screens */}
          <header className="lg:sticky lg:top-8 lg:self-start">
            <h1 className="text-2xl/8 font-semibold text-zinc-950 sm:text-xl/8 lg:text-2xl/9 dark:text-white mb-2">
              Jeremy Dudet
            </h1>
            <Text className="lg:text-balance">
              Application developer. Currently living in the Austin, TX metro
              area.
            </Text>

            {/* Links live in the sidebar on large screens */}
            <nav
              aria-label="Social links"
              className="mt-8 hidden flex-col gap-3 text-sm lg:flex"
            >
              {socials.map(({ href, label }) => (
                <a
                  key={label}
                  href={href}
                  className="w-fit text-blue-600 transition-colors hover:underline dark:text-blue-400"
                >
                  {label} &rarr;
                </a>
              ))}
            </nav>
          </header>

          {/* Main content */}
          <div className="mt-24 lg:mt-0">
            <div>
              <Heading level={2}>Work</Heading>
              <ul className="mt-6 space-y-10">
                {work.map(({ title, role, dates, description }) => (
                  <li key={title}>
                    <div className="flex items-baseline justify-between gap-4">
                      <h4 className="font-semibold text-zinc-950 dark:text-white">
                        {title}
                      </h4>
                      <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                        {dates}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {role}
                    </p>
                    <Text className="mt-3">{description}</Text>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-24">
              <Heading level={2}>Projects</Heading>
              <div className="mt-6">
                <StockcountProject />
              </div>
            </div>

            <div className="mt-24">
              <Heading level={2}>Activity</Heading>
              <div className="mt-6">
                <GitHubStats />
              </div>
            </div>

            {/* Links render inline at the bottom on mobile only */}
            <div className="mt-24 lg:hidden">
              <Heading level={2}>Links</Heading>
              <div className="text-md mt-6 flex gap-8">
                {socials.map(({ href, label }) => (
                  <a
                    key={label}
                    href={href}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {label} &rarr;
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
