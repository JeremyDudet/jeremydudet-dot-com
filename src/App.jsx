import { BrowserRouter as Router } from 'react-router-dom'
import GitHubStats from '@/components/GitHubStats'
import { Container } from "@/components/Container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

export default function App() {
  return (
    <Router>
      <main className="flex flex-1 flex-col pb-2 min-w-0 pt-2 pr-2 pl-2 min-h-screen h-full">
        <div className="grow px-6 py-12 rounded-lg bg-white ring-1 shadow-xs ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10 h-full min-h-full">
          
              <Container className="text-lg text-zinc-800 dark:text-zinc-200">
                <Heading level={1}>Jeremy Dudet</Heading>                
                <Text className="mt-1">Software Developer</Text>                                
                <div className="mt-8">
                  <Heading level={3}>recent employment</Heading>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <Text>Uber</Text>
                      <Text>Integration Engineer </Text>
                      <Text>jun '24 - present</Text>
                      <Text>
                        Onboard and maintain integrations between UberEats and POS
                        systems.
                      </Text>
                    </li>
                    <li>
                      <Text>Konditorei Cafe</Text>
                      <Text>IT guy | Operations Manager</Text>
                      <Text>apr '23 - jun '24</Text>
                      <Text>
                        Built custom full-stack inventory management system.
                      </Text>
                    </li>
                    <li>
                      <Text>Zola + BarZola</Text>
                      <Text>IT guy | Staff Member</Text>
                      <Text>dec '21 - may '23</Text>
                      <Text>
                        Developed an internal web application for restaurant staff.
                      </Text>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <Heading level={3}>products</Heading>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <a
                        href="https://stockcount.io"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Text>stockcount.io</Text>
                      </a>
                      <Text className="mt-1">
                        Helping restaurant operators save time on restaurant inventory, cost management, and accounting tasks.
                        Just speak or type to let our AI handle stock counts, cost tracking, and financial reports in seconds.
                      </Text>
                    </li>
                  </ul>
                </div>
                <div className="mt-10">
                <Heading level={3}>github stats</Heading>
                  <GitHubStats />
                </div>
                <div className="mt-8">
                  <Heading level={3}>socials</Heading>
                  <div className="flex gap-4 mt-4">
                    <a
                      href="https://github.com/JeremyDudet"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Text className="!text-blue-600 dark:!text-blue-400 hover:underline">GitHub →</Text>
                    </a>
                    <a
                      href="https://www.linkedin.com/in/jeremydudet/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Text className="!text-blue-600 dark:!text-blue-400 hover:underline">LinkedIn →</Text>
                    </a>
                    <a
                      href="https://x.com/jeremyfdudet"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Text className="!text-blue-600 dark:!text-blue-400 hover:underline">X →</Text>
                    </a>
                  </div>
                </div>
              </Container>
          </div>
        
      </main>
    </Router>
  )
}
