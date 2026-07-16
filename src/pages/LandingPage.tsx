/**
 * Landing route `/` — product explainer only (no results board).
 */
import { HowItWorks } from '../components/HowItWorks'
import { siteConfig } from '../config/site'
import { useScholarship } from '../state/ScholarshipContext'

export function LandingPage() {
  const { runSearch } = useScholarship()

  return <HowItWorks config={siteConfig} onExample={runSearch} showExamples />
}
