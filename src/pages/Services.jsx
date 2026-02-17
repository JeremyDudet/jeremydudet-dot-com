import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Container } from '@/components/Container'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/Button'

function useIsDesktop() {
  const [desktop, setDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e) => setDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return desktop
}

function ProjectCard({ title, url, tilt = -3, offset = 0, desktopOffset = 0, isDesktop }) {
  const cardWidth = isDesktop ? 360 : 220
  const cardRatio = isDesktop ? '7 / 5' : '5 / 7'
  const iframeW = isDesktop ? 1280 : 430
  const iframeH = isDesktop ? 900 : 900
  const iframeScale = isDesktop ? 0.281 : 0.512
  const cardOffset = isDesktop ? desktopOffset : offset

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group absolute rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-md hover:shadow-xl hover:z-30 transition-all duration-300"
      style={{
        width: cardWidth,
        aspectRatio: cardRatio,
        transform: `rotate(${tilt}deg) translateY(0px)`,
        left: cardOffset,
        background: 'white',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'rotate(0deg) translateY(-12px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = `rotate(${tilt}deg) translateY(0px)`
      }}
    >
      <div className="relative w-full h-full overflow-hidden bg-white dark:bg-zinc-800">
        <iframe
          src={url}
          title={title}
          scrolling="no"
          className="pointer-events-none absolute top-0 left-0 origin-top-left"
          style={{
            width: iframeW,
            height: iframeH,
            transform: `scale(${iframeScale})`,
          }}
          tabIndex={-1}
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
      </div>
    </a>
  )
}

export default function Services() {
  const isDesktop = useIsDesktop()
  const [formState, setFormState] = useState('idle')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    business: '',
    problem: '',
    budget: '',
    message: '',
  })

  async function handleSubmit(e) {
    e.preventDefault()
    setFormState('submitting')
    try {
      const res = await fetch('https://formspree.io/f/mzdaglkg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setFormState('sent')
      } else {
        setFormState('error')
      }
    } catch {
      setFormState('error')
    }
  }

  return (
    <>
      <Helmet>
        <title>Services — Jeremy Dudet</title>
      </Helmet>
      <Container>
        {/* Header */}
        <section>
          <Heading level={1}>
            I build AI tools and websites for small businesses.
          </Heading>
          <Text className="mt-4">
            If you run a small business and need software that actually fits the
            way you work, I can help. I specialize in AI-powered automation and
            clean, fast websites.
          </Text>
          <div className="mt-6">
            <Button
              color="blue"
              onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })}
            >
              Get in Touch
            </Button>
          </div>
        </section>

        {/* Who This Is For */}
        <section className="mt-16">
          <Heading level={2}>Who this is for</Heading>
          <div className="mt-6 space-y-6">
            <Text>
              You have a manual process that eats up hours every week: data
              entry, inventory counts, report generation. You know there's
              a better way, but off-the-shelf software doesn't quite fit.
            </Text>
            <Text>
              You need a website that looks professional and loads fast, but
              you don't want to spend months going back and forth with an
              agency. You want something simple, clean, and done right.
            </Text>
            <Text>
              You have an idea for a tool or app that would make your team's
              life easier, but you need someone technical to actually build it.
            </Text>
          </div>
        </section>

        {/* What I Build */}
        <section className="mt-16">
          <Heading level={2}>What I build</Heading>

          <div className="mt-8 space-y-10">
            <div>
              <Heading level={3}>AI Workflow Automation</Heading>
              <Text className="mt-2">
                Custom AI tools that automate repetitive tasks in your
                business. Think voice-to-data entry, automated report
                generation, intelligent document processing, or chatbots
                trained on your own data.
              </Text>
            </div>

            <div>
              <Heading level={3}>Landing Pages &amp; Marketing Sites</Heading>
              <Text className="mt-2">
                Fast, responsive websites built with modern tools. Perfect for
                restaurants, cafes, retail shops, and service businesses that
                need a clean web presence without the bloat.
              </Text>
            </div>

            <div>
              <Heading level={3}>Custom Dev Work</Heading>
              <Text className="mt-2">
                Internal tools, dashboards, integrations between systems you
                already use. If you need two pieces of software to talk to each
                other, or a custom tool built from scratch, I can do that.
              </Text>
            </div>
          </div>
        </section>

        {/* Example Work */}
        <section className="mt-16">
          <Heading level={2}>Example work</Heading>
          <div className="relative mt-6" style={{ height: isDesktop ? 300 : 340 }}>
            <ProjectCard
              title="Konditorei Cafe"
              url="https://konditoreicafe-com-jdudetgmailcoms-projects.vercel.app/"
              tilt={-4}
              offset={0}
              desktopOffset={0}
              isDesktop={isDesktop}
            />
            <ProjectCard
              title="Stockcount"
              url="https://stockcount.io"
              tilt={3}
              offset={200}
              desktopOffset={260}
              isDesktop={isDesktop}
            />
          </div>
        </section>

        {/* How It Works */}
        <section className="mt-16">
          <Heading level={2}>How it works</Heading>
          <ol className="mt-6 space-y-6">
            <li>
              <Text>
                <span className="font-medium text-zinc-950 dark:text-white">
                  1. We talk.
                </span>{' '}
                You tell me what you need. I ask questions to make sure I
                understand the problem. No jargon, no upsells.
              </Text>
            </li>
            <li>
              <Text>
                <span className="font-medium text-zinc-950 dark:text-white">
                  2. I build it.
                </span>{' '}
                I work in short cycles and show you progress along the way. You
                give feedback, I adjust. Simple.
              </Text>
            </li>
            <li>
              <Text>
                <span className="font-medium text-zinc-950 dark:text-white">
                  3. You use it.
                </span>{' '}
                I hand it off with everything you need to run it. If something
                breaks, I fix it.
              </Text>
            </li>
          </ol>
        </section>

        {/* About */}
        <section className="mt-16">
          <Heading level={2}>About me</Heading>
          <Text className="mt-4">
            I'm a software developer who's spent the last few years building
            tools at the intersection of AI and small business operations. I've
            worked as an Integration Engineer at Uber, connecting UberEats with
            restaurant POS systems, and before that I ran operations at a cafe
            where I built the inventory management system from scratch.
          </Text>
          <Text className="mt-4">
            That experience showed me how much time small businesses waste on
            tasks that software could handle, if the software was actually
            built for them. So that's what I do now. I build Stockcount, a
            voice-powered inventory app, and I help other businesses get
            custom tools built too.
          </Text>
        </section>

        {/* Contact / Booking */}
        <section id="contact" className="mt-16 scroll-mt-8">
          <Heading level={2}>Get in touch</Heading>
          <Text className="mt-4">
            Tell me a bit about your project. Once you send the form, you can
            book a call.
          </Text>

          <div className="mt-10">
            {formState === 'sent' ? (
              <div className="space-y-4">
                <Text className="text-green-600 dark:text-green-400">
                  Sent. I'll get back to you within a day.
                </Text>
                <Text>Want to talk sooner? Book a call below.</Text>
                <a
                  href={`https://cal.com/jeremydudet?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button color="blue" className="mt-2">Book a Call</Button>
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, name: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, email: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="business"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    What does your business do?
                  </label>
                  <textarea
                    id="business"
                    name="business"
                    rows={2}
                    required
                    value={formData.business}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, business: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="problem"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    What's the problem you'd like help with?
                  </label>
                  <textarea
                    id="problem"
                    name="problem"
                    rows={3}
                    required
                    value={formData.problem}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, problem: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="budget"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    What's your budget range?
                  </label>
                  <select
                    id="budget"
                    name="budget"
                    required
                    value={formData.budget}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, budget: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="" disabled>Select a range</option>
                    <option value="Under $500">Under $500</option>
                    <option value="$500–$2,000">$500–$2,000</option>
                    <option value="$2,000–$5,000">$2,000–$5,000</option>
                    <option value="Not sure yet">Not sure yet</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Anything else? (optional)
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, message: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <Button
                  type="submit"
                  color="slate"
                  disabled={formState === 'submitting'}
                >
                  {formState === 'submitting' ? 'Sending...' : 'Send Message'}
                </Button>
                {formState === 'error' && (
                  <Text className="text-red-600 dark:text-red-400">
                    Something went wrong. Please try again.
                  </Text>
                )}
              </form>
            )}
          </div>

        </section>
      </Container>
    </>
  )
}
