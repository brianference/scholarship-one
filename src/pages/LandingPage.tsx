/**
 * Landing route `/` — product explainer only (no results board).
 */
import { HowItWorks } from '../components/HowItWorks'
import { siteConfig } from '../config/site'
import { useScholarship } from '../state/ScholarshipContext'
import { useMeta } from '../lib/seo'

export function LandingPage() {
  useMeta({
    title: 'Scholarship One — find scholarships that actually fit you',
    description:
      'Search real scholarships by major, state, and background. Save awards, track applications, get deadline reminders. Free, no sponsored listings, no sign-up wall.',
    path: '/',
  })
  const { runSearch } = useScholarship()

  return <HowItWorks config={siteConfig} onExample={runSearch} showExamples />
}
