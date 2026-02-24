import { SITE } from '@/lib/metadata'

export function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Jeremy Dudet',
    url: SITE.url,
    jobTitle: 'Software Developer',
    sameAs: [SITE.social.linkedin, SITE.social.github, SITE.social.x],
    knowsAbout: [
      'AI Automation',
      'Web Development',
      'Restaurant Technology',
      'Inventory Management',
    ],
  }
}

export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
  }
}

export function serviceJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'AI Tools & Websites for F&B Businesses',
    provider: {
      '@type': 'Person',
      name: 'Jeremy Dudet',
      url: SITE.url,
    },
    description:
      'AI automation, landing pages, and custom development for restaurants, cafes, and F&B businesses.',
    areaServed: 'US',
    serviceType: 'Software Development',
  }
}

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Stockcount',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Voice-powered inventory management for F&B. Count inventory by speaking instead of typing into spreadsheets.',
    url: 'https://stockcount.io',
    author: {
      '@type': 'Person',
      name: 'Jeremy Dudet',
    },
  }
}
