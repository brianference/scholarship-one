/**
 * Path route — progress + AI plan coach + jump links.
 */
import { Link, useNavigate } from 'react-router-dom'
import { WorkspaceStrip } from '../components/WorkspaceStrip'
import { PageAiActions } from '../components/PageAiActions'
import { useScholarship } from '../state/ScholarshipContext'
import { useMeta } from '../lib/seo'

export function PathPage() {
  useMeta({
    title: 'Your path',
    description:
      'Your personalised scholarship plan.',
    path: '/path',
    noindex: true,
  })
  const s = useScholarship()
  const navigate = useNavigate()

  const profileBits = [s.profile.level, s.profile.major, s.profile.state, s.profile.identity, s.profile.need]
    .filter((v) => v && v !== 'any')
    .join(', ')

  return (
    <div className="page-stack">
      <p className="meta page-crumb">
        <Link to="/results">Results</Link> · Your path
      </p>
      <WorkspaceStrip
        savedCount={s.shortlist.length}
        dueSoonCount={s.dueSoonSaved}
        inProgressCount={s.inProgressCount}
        submittedCount={s.submittedCount}
        suggestionCount={s.pinnedIds.length}
        onShowSaved={() => {
          s.setOnlyShort(true)
          s.setOnlyAi(false)
          navigate('/results')
        }}
        onShowDueSoon={() => {
          s.setOnlyShort(true)
          s.setUrgencyFilter('soon')
          s.setOnlyAi(false)
          navigate('/results')
        }}
        onShowSuggestions={() => {
          s.setOnlyAi(true)
          s.setOnlyShort(false)
          navigate('/results')
        }}
        onShowAll={() => {
          s.clearFilters()
          navigate('/results')
        }}
      />
      <PageAiActions
        title="AI path coach"
        actions={[
          {
            label: 'Coach my overall plan',
            prompt: `My Scholarship One path: profile (${profileBits || 'mostly open'}), ${s.shortlist.length} saved, ${s.dueSoonSaved} due soon among saved, ${s.inProgressCount} in progress, ${s.submittedCount} submitted, ${s.pinnedIds.length} current match suggestions. Give a clear ordered plan for the next 14 days: which page to use (Matches, Deadlines, Tracker) and which catalog awards to open — no invented awards.`,
          },
          {
            label: 'Fill profile gaps',
            prompt: `My profile is: level=${s.profile.level}, major=${s.profile.major}, state=${s.profile.state}, background=${s.profile.identity}, need=${s.profile.need}. Which 2 fields should I set next to improve matches in the catalog, and why?`,
          },
        ]}
        onAsk={s.askAi}
      />
      <section className="panel">
        <h2 className="h2-section">Jump to</h2>
        <ul className="path-links">
          <li>
            <Link to="/matches">Matches for you</Link>
          </li>
          <li>
            <Link to="/results">Full catalog (Results)</Link>
          </li>
          <li>
            <Link to="/digest">Deadline digest</Link>
          </li>
          <li>
            <Link to="/tracker">Application tracker</Link>
          </li>
          <li>
            <Link to="/activity">Your activity</Link>
          </li>
        </ul>
      </section>
    </div>
  )
}
