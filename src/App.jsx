import { BrowserRouter as Router } from 'react-router-dom'
import { Contact } from './components/Contact'
import { Footer } from '@/components/Footer'
import { Introduction } from '@/components/Introduction'
import { NavBar } from '@/components/NavBar'
import { Projects } from '@/components/Projects'
import { Skills } from '@/components/Skills'
import { Experience } from '@/components/Experience'

export default function App() {
  return (
    <Router>
      <main className="flex flex-1 flex-col pb-2 min-w-0 pt-2 pr-2 pl-2 h-screen min-h-screen overflow-y-hidden">
        <div className="grow p-6 rounded-lg bg-white ring-1 shadow-xs ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10 h-full min-h-full overflow-y-auto ">
          <div className="mx-auto max-w-6xl my-8">
          <Introduction />
          </div>
        </div>
      </main>
    </Router>
  )
}
