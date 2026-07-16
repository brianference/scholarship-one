/**
 * Deadlines route `/digest` — saved awards always listed + weekly fixed dates + AI coach.
 */
import { Link, useNavigate } from 'react-router-dom'
import { WeeklyDigestPanel } from '../components/WeeklyDigest'
import { CATALOG } from '../data/catalog'
import { useScholarship } from '../state/ScholarshipContext'

export function DigestPage() {
  const { shortlist, setOnlyShort, askAi } = useScholarship()
  const navigate = useNavigate()

  return (
    <div className="page-stack">
      <p className="meta page-crumb">
        <Link to="/matches">Matches</Link> · <Link to="/results">Results</Link> · Deadlines
      </p>
      <WeeklyDigestPanel
        catalog={CATALOG}
        savedIds={shortlist}
        onFocusSaved={() => {
          setOnlyShort(true)
          navigate('/results')
        }}
        onAskAi={askAi}
      />
    </div>
  )
}
