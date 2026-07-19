/**
 * Tracker route `/tracker` — application stages for saved awards + AI coach with real names.
 */
import { Link } from 'react-router-dom'
import { TrackerBoard } from '../components/TrackerBoard'
import { PageAiActions } from '../components/PageAiActions'
import { useScholarship } from '../state/ScholarshipContext'
import { useMeta } from '../lib/seo'

export function TrackerPage() {
  useMeta({
    title: 'Application tracker',
    description:
      'Track where you are in every scholarship application.',
    path: '/tracker',
    noindex: true,
  })
  const { pipelineItems, setApplyStatus, markOfficialOpen, askAi, shortlist } = useScholarship()

  const interested = pipelineItems.filter((i) => i.status === 'interested')
  const started = pipelineItems.filter((i) => i.status === 'applied')
  const submitted = pipelineItems.filter((i) => i.status === 'submitted')
  const savedOnly = pipelineItems.filter((i) => i.status === 'none')

  const nameList = (items: typeof pipelineItems, limit = 5) =>
    items
      .slice(0, limit)
      .map((i) => i.name)
      .join('; ') || 'none'

  return (
    <div className="page-stack">
      <p className="meta page-crumb">
        <Link to="/matches">Matches</Link> · Application tracker
      </p>
      <PageAiActions
        title="AI application coach"
        actions={[
          {
            label: 'What should I do next?',
            prompt: `On Scholarship One Application tracker I have ${shortlist.length} saved awards.
Saved (not started): ${savedOnly.length} — ${nameList(savedOnly)}.
Interested: ${interested.length} — ${nameList(interested)}.
Started: ${started.length} — ${nameList(started)}.
Submitted: ${submitted.length} — ${nameList(submitted)}.
Using only catalog programs (do not invent awards), name the best 3 next actions this week with which award and what step (docs, essay, portal, official site).`,
          },
          {
            label: 'Unstick started apps',
            prompt: `I marked these applications as started: ${nameList(started, 8)}.
Give a short finish checklist (documents, essay, recommender, portal submit) per award if listed, otherwise a general finish checklist. Use only Scholarship One catalog facts — no invented awards.`,
          },
          {
            label: 'Prioritize by deadline',
            prompt: `Among my saved awards (${pipelineItems.map((i) => `${i.name} [${i.status}] deadline ${i.deadline}`).join('; ') || 'none yet'}), order what to work on by urgency. Confirm rolling dates on official sites. Catalog only.`,
          },
        ]}
        onAsk={askAi}
      />
      <TrackerBoard
        items={pipelineItems}
        onStatusChange={setApplyStatus}
        onOpenOfficial={markOfficialOpen}
      />
      <p className="meta">
        Looking for new programs? Start on <Link to="/matches">Matches</Link> or browse{' '}
        <Link to="/results">Results</Link>.
      </p>
    </div>
  )
}
