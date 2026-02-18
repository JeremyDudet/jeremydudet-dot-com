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
        <title>Services for Restaurants &amp; F&amp;B | Jeremy Dudet</title>
      </Helmet>
      <Container>
        {/* Header */}
        <section>
          <Heading level={1}>
            AI tools and websites for restaurants, cafes, and F&amp;B businesses.
          </Heading>
          <Text className="mt-4">
            AI automation and fast websites for the food industry.
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
              You run an F&amp;B business with manual processes eating up
              hours. Off-the-shelf software doesn't fit.
            </Text>
            <Text>
              You need a fast, professional website without months of
              agency back-and-forth.
            </Text>
            <Text>
              You have a tool idea but need someone technical to build it.
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
                Voice-powered inventory, sales reports, invoice processing,
                chatbots trained on your menu and ops data.
              </Text>
            </div>

            <div>
              <Heading level={3}>Landing Pages &amp; Marketing Sites</Heading>
              <Text className="mt-2">
                Fast websites for restaurants, cafes, and F&amp;B brands.
                Menus, location info, online ordering. No bloat.
              </Text>
            </div>

            <div>
              <Heading level={3}>Custom Dev Work</Heading>
              <Text className="mt-2">
                Internal tools, dashboards, POS integrations, vendor management.
                Whatever your operation needs.
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

                You tell me what you need. No jargon, no upsells.
              </Text>
            </li>
            <li>
              <Text>
                <span className="font-medium text-zinc-950 dark:text-white">
                  2. I build it.
                </span>{' '}


                Short cycles, regular updates. You give feedback, I adjust.
              </Text>
            </li>
            <li>
              <Text>
                <span className="font-medium text-zinc-950 dark:text-white">
                  3. You use it.
                </span>{' '}

                I hand it off ready to go. If something breaks, I fix it.
              </Text>
            </li>
          </ol>
        </section>

        {/* About */}
        <section className="mt-16">
          <Heading level={2}>About me</Heading>
          <Text className="mt-4">
            Former Integration Engineer at Uber (UberEats + restaurant POS)
            and cafe ops manager. Built the inventory system from scratch.
          </Text>
          <Text className="mt-4">
            Now I build Stockcount, a voice-powered inventory app for F&amp;B,
            and help food businesses get custom tools.
          </Text>
        </section>

        {/* Contact / Booking */}
        <section id="contact" className="mt-16 scroll-mt-8">
          <Heading level={2}>Get in touch</Heading>
          <Text className="mt-4">
            Tell me about your project. Book a call after submitting.
          </Text>

          <div className="mt-10">
            {formState === 'sent' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <svg className="h-8 w-8 text-green-500 dark:text-green-400 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M7.5 12.5L10.5 15.5L16.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div>
                    <p className="text-base font-medium text-zinc-950 dark:text-white">
                      Message sent!
                    </p>
                    <Text>
                      Thanks for reaching out. I'll get in touch soon.
                    </Text>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Text>Want to skip the wait?</Text>
                  <a
                    href={`https://cal.com/jeremydudet?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button color="blue">Book a Call Now</Button>
                  </a>
                </div>
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
                    pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                    title="Please enter a valid email address"
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
                    Tell me about your restaurant or business
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
                    <option value="$5,000+">$5,000+</option>
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
