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
        <Text>
          Developer. I build AI-powered tools and help businesses do the same.
        </Text>
        <Text className="mt-4">Currently living in the Austin metro area.</Text>

        <div className="mt-16">
          <Heading level={3}>Work</Heading>
          <ul className="mt-4 space-y-4">
            <li>
              <Text>Uber</Text>
              <Text>Integration Engineer </Text>
              <Text>(jun &apos;24 - dec &apos;25)</Text>
              <Text>
                Onboard and maintain integrations between UberEats and POS
                systems.
              </Text>
            </li>
            <li>
              <Text>Konditorei Cafe</Text>
              <Text>IT guy | Operations Manager</Text>
              <Text>(apr &apos;23 - jun &apos;24)</Text>
              <Text>
                Built a full-stack inventory management system, reducing food
                waste and optimizing stock tracking.
              </Text>
            </li>
            <li>
              <Text>Zola + BarZola</Text>
              <Text>IT guy | Staff Member</Text>
              <Text>(dec &apos;21 - may &apos;23)</Text>
              <Text>
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
