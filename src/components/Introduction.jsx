import { Container } from "@/components/Container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

export function Introduction() {
  return (
    <section
      id="introduction"
      aria-label="Introduction"
      className="flex flex-col items-center"
    >
      <Container className="text-lg text-zinc-600 dark:text-zinc-400">
        <Heading level={1}>Jeremy Dudet</Heading>
        <Text>Software Developer</Text>

        <div className="mt-8">
          <Heading level={3}>Work</Heading>
          <ul className="mt-4 space-y-4">
            <li>
              <Text>Uber</Text>
              <Text>Integration Engineer </Text>
              <Text>(jun '24 - present)</Text>
              <Text>
                Onboard and maintain integrations between UberEats and POS
                systems.
              </Text>
            </li>
            <li>
              <Text>Konditorei Cafe</Text>
              <Text>IT guy | Operations Manager</Text>
              <Text>(apr '23 - jun '24)</Text>
              <Text>
                Built a full-stack inventory management system, reducing food
                waste and optimizing stock tracking.
              </Text>
            </li>
            <li>
              <Text>Zola + BarZola</Text>
              <Text>IT guy | Staff Member</Text>
              <Text>(dec '21 - may '23)</Text>
              <Text>
                Developed an internal web application for restaurant staff,
                integrating Toast POS systems via APIs.
              </Text>
            </li>
          </ul>
        </div>
        <div className="mt-8">
          <Heading level={3}>Projects</Heading>
          <ul className="mt-4 space-y-4">
            <li>
              <a
                href="https://stockcount.io"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Text>stockcount.io</Text>
              </a>
              <Text>
                The tool I wish I had when working in F&B retail. A voice
                (speech-to-crud) inventory management app for easy inventory
                counting and for automating day-to-day managerial accounting
                tasks.{" "}
              </Text>
            </li>
          </ul>
        </div>
        <div className="text-sm mt-8 flex flex-col md:flex-row gap-4">
          <a
            href="https://www.linkedin.com/in/jeremydudet/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            LinkedIn →
          </a>
          <a
            href="https://github.com/JeremyDudet"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            GitHub →
          </a>
          <a
            href="https://docs.google.com/document/d/1-BTcUuFp3fuM-Wc6yLJQ_YTr7FUcUvF03gfCSZS8XCc/edit?usp=sharing"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Resume →
          </a>
        </div>
      </Container>
    </section>
  );
}
