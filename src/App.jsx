import { BrowserRouter as Router } from 'react-router-dom'
import { Contact } from './components/Contact'
import { Footer } from '@/components/Footer'
import { Introduction } from '@/components/Introduction'
import { NavBar } from '@/components/NavBar'
import { Pricing } from '@/components/Pricing'
import { Projects } from '@/components/Projects'
import { Skills } from '@/components/Skills'
import { Experience } from '@/components/Experience'
import { Testimonial } from '@/components/Testimonial'
import { Testimonials } from '@/components/Testimonials'

export default function App() {
  return (
    <Router>
      <Introduction />
      <NavBar />
      <Projects />
      <Experience />
      <Skills />
      <Contact />
      {/* <Footer /> */}
    </Router>
  )
}
