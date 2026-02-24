'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { Text } from '@/components/ui/text'

export function ContactForm() {
  const [formState, setFormState] = useState<
    'idle' | 'submitting' | 'sent' | 'error'
  >('idle')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    business: '',
    problem: '',
    budget: '',
    message: '',
  })

  async function handleSubmit(e: React.FormEvent) {
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

  if (formState === 'sent') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <svg
            className="h-8 w-8 text-green-500 dark:text-green-400 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="11"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M7.5 12.5L10.5 15.5L16.5 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <p className="text-base font-medium text-zinc-950 dark:text-white">
              Message sent!
            </p>
            <Text>Thanks for reaching out. I&apos;ll get in touch soon.</Text>
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
    )
  }

  return (
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
          What&apos;s the problem you&apos;d like help with?
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
          What&apos;s your budget range?
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
          <option value="" disabled>
            Select a range
          </option>
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
  )
}
