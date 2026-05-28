import { Container } from "@/components/Container";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { GitHubStats } from "@/components/GitHubStats";
import { StockcountProject } from "@/components/StockcountProject";

export function Introduction() {
  return (
    <section
      id="introduction"
      aria-label="Introduction"
      className="flex flex-col items-center"
    >
      <Container>
        <h1 className="text-2xl/8 font-semibold text-zinc-950 sm:text-xl/8 lg:text-2xl/9 dark:text-white mb-2">
          Jeremy Dudet
        </h1>
        <Text>
          Application developer. Currently living in the Austin, TX metro area.
        </Text>

        <div className="mt-16">
          <Heading level={3}>Work</Heading>
          <ul className="mt-6 space-y-8">
            <li>
              <div className="flex items-baseline justify-between gap-4">
                <h4 className="font-semibold text-zinc-950 dark:text-white">
                  Stockcount
                </h4>
                <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                  feb &apos;26 — now
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Founder
              </p>
              <Text className="mt-2">
                Inventory software for restaurants and cafes. Built for speed,
                not feature lists.
              </Text>
            </li>
            <li>
              <div className="flex items-baseline justify-between gap-4">
                <h4 className="font-semibold text-zinc-950 dark:text-white">
                  Uber
                </h4>
                <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                  jun &apos;24 — dec &apos;25
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Integration Engineer
              </p>
              <Text className="mt-2">
                Onboard and maintain integrations between UberEats and POS
                systems.
              </Text>
            </li>
            <li>
              <div className="flex items-baseline justify-between gap-4">
                <h4 className="font-semibold text-zinc-950 dark:text-white">
                  Konditorei Cafe
                </h4>
                <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                  apr &apos;23 — jun &apos;24
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                IT guy &middot; Operations Manager
              </p>
              <Text className="mt-2">
                Built a full-stack inventory management system, reducing food
                waste and optimizing stock tracking.
              </Text>
            </li>
            <li>
              <div className="flex items-baseline justify-between gap-4">
                <h4 className="font-semibold text-zinc-950 dark:text-white">
                  Zola + BarZola
                </h4>
                <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                  dec &apos;21 — may &apos;23
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                IT guy &middot; Staff Member
              </p>
              <Text className="mt-2">
                Developed an internal web application for restaurant staff,
                integrating Toast POS systems via APIs.
              </Text>
            </li>
          </ul>
        </div>
        <div className="mt-16">
          <Heading level={2}>Projects</Heading>
          <div className="mt-6">
            <StockcountProject />
          </div>
        </div>
        <div className="mt-16">
          <Heading level={2}>Activity</Heading>
          <div className="mt-4">
            <GitHubStats />
          </div>
        </div>
        <div className="mt-16">
          <Heading level={2}>Links</Heading>
        </div>
        <div className="text-md mt-4 flex gap-8">
          <a
            href="https://www.linkedin.com/in/jeremydudet/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            LinkedIn &rarr;
          </a>
          <a
            href="https://github.com/JeremyDudet"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            GitHub &rarr;
          </a>
          <a
            href="https://x.com/jeremyfdudet"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            X &rarr;
          </a>
        </div>
      </Container>
    </section>
  );
}
