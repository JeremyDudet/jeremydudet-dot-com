import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { PageNav } from '@/components/PageNav'
import Home from '@/pages/Home'
import Services from '@/pages/Services'
import Products from '@/pages/Products'

export default function App() {
  return (
    <Router>
      <HelmetProvider>
        <main className="flex flex-1 flex-col pb-2 min-w-0 pt-2 pr-2 pl-2 min-h-screen h-full">
          <div className="grow p-6 rounded-lg bg-white ring-1 shadow-xs ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10 h-full min-h-full">
            <div className="mx-auto max-w-6xl my-8">
              <PageNav />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/services" element={<Services />} />
                <Route path="/products" element={<Products />} />
              </Routes>
            </div>
          </div>
        </main>
      </HelmetProvider>
    </Router>
  )
}
