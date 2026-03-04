import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { ContactForm } from '@/components/ContactForm'
import { ProjectCard } from '@/components/ProjectCard'
import { JsonLd } from '@/components/JsonLd'
import { serviceJsonLd } from '@/lib/structured-data'
import { SITE } from '@/lib/metadata'

export const metadata: Metadata = {
  title: 'Services for Restaurants & F&B',
  description:
    'AI automation and fast websites for the food industry. Custom tools, landing pages, and integrations for restaurants, cafes, and F&B businesses.',
  openGraph: {
    title: 'Services for Restaurants & F&B | Jeremy Dudet',
    description:
      'AI automation and fast websites for the food industry.',
    url: `${SITE.url}/services`,
  },
  alternates: {
    canonical: `${SITE.url}/services`,
  },
}

export default function Services() {
  return (
    <>
      <JsonLd data={serviceJsonLd()} />
      <Container>
        {/* Header */}
        <section>
          <Heading level={1}>
            AI tools and websites for restaurants, cafes, and F&amp;B
            businesses.
          </Heading>
          <Text className="mt-4">
            AI automation and fast websites for the food industry.
          </Text>
          <div className="mt-6">
            <a
              href="#contact"
              className="inline-flex justify-center rounded-md py-1 px-4 text-base font-semibold tracking-tight shadow-sm focus:outline-none bg-zinc-800 text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-800 active:bg-zinc-900 active:text-white/80 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:active:bg-zinc-200"
            >
              Get in Touch
            </a>
          </div>
        </section>

        {/* Who This Is For */}
        <section className="mt-16">
          <Heading level={2}>Who this is for</Heading>
          <div className="mt-6 space-y-6">
            <Text>
              You run an F&amp;B business with manual processes eating up hours.
              Off-the-shelf software doesn&apos;t fit.
            </Text>
            <Text>
              You need a fast, professional website without months of agency
              back-and-forth.
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
                Fast websites for restaurants, cafes, and F&amp;B brands. Menus,
                location info, online ordering. No bloat.
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
          <ExampleWork />
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
            Former Integration Engineer at Uber (UberEats + restaurant POS) and
            cafe ops manager. Built the inventory system from scratch.
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
            <ContactForm />
          </div>
        </section>
      </Container>
    </>
  )
}

function ExampleWork() {
  return (
    <div className="relative mt-6" style={{ height: 340 }}>
      <ProjectCard
        title="Konditorei Cafe"
        url="https://konditoreicafe-com-jdudetgmailcoms-projects.vercel.app/"
        tilt={-4}
        offset={0}
        desktopOffset={0}
      />
      <ProjectCard
        title="Stockcount"
        url="https://stockcount.io"
        tilt={3}
        offset={200}
        desktopOffset={260}
        desktopImage="/images/stockcount-desktop.jpg"
        mobileImage="/images/stockcount-mobile.jpg"
      />
    </div>
  )
}
