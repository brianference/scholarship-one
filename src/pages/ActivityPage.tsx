/**
 * Activity route — local analytics + digest status + AI interpretation.
 */
import { Link } from 'react-router-dom'
import { AnalyticsPanel } from '../components/AnalyticsPanel'
import { PageAiActions } from '../components/PageAiActions'
import { getAnalyticsSummary } from '../lib/analytics'
import { loadDigestActivity } from '../lib/digestActivity'
import { useScholarship } from '../state/ScholarshipContext'
import { useMeta } from '../lib/seo'

export function ActivityPage() {
  useMeta({
    title: 'Activity',
    description:
      'Your recent scholarship activity.',
    path: '/activity',
    noindex: true,
  })
  const { askAi, shortlist } = useScholarship()
  const summary = getAnalyticsSummary()
  const digest = loadDigestActivity()

  const digestLine = (() => {
    if (digest.lastSuccessAt) {
      return `Last digest emailed ${new Date(digest.lastSuccessAt).toLocaleString()}${digest.lastEmail ? ` to ${digest.lastEmail}` : ''}.`
    }
    if (digest.lastAttemptAt && digest.lastError) {
      return `Last digest attempt failed: ${digest.lastError}${digest.configured === false ? ' (server email not configured — set RESEND_API_KEY)' : ''}.`
    }
    return 'No email digest sent yet from this device.'
  })()

  return (
    <div className="page-stack">
      <p className="meta page-crumb">
        <Link to="/matches">Matches</Link> · Activity
      </p>
      <PageAiActions
        title="AI activity insights"
        actions={[
          {
            label: 'Interpret my activity',
            prompt: `On Scholarship One (device-only stats): ${summary.searches} searches, ${summary.saves} saves, ${summary.officialClicks} official-site clicks, ${summary.last7DaysEvents} events in 7 days. Saved list size: ${shortlist.length}. Top searches: ${summary.topQueries.map((q) => q.q).join('; ') || 'none'}. Digest status: ${digestLine} Suggest how I should use Matches, Results, Deadlines, and the Application tracker next — without inventing scholarships outside the catalog.`,
          },
          {
            label: 'Suggest smarter searches',
            prompt: `Based on typical strong matches in the Scholarship One catalog (STEM, nursing, state grants, disability, Hispanic/Black awards, need/FAFSA), give me 5 plain-language header searches I should try next and what each is looking for.`,
          },
        ]}
        onAsk={askAi}
      />
      <section className="panel" aria-labelledby="digest-status-heading">
        <h2 id="digest-status-heading" className="h2-section">
          Email digest status
        </h2>
        <p className="lede">{digestLine}</p>
        <p className="meta">
          Send from <Link to="/digest">Deadlines</Link>. Production needs <code>RESEND_API_KEY</code> on Cloudflare
          Pages. You can also <Link to="/import">import a share link</Link> to move saved awards to another device.
        </p>
      </section>
      <AnalyticsPanel defaultOpen />
    </div>
  )
}
