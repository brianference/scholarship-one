/** /scholarship/:id — full detail view for a single award. */
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CATALOG } from '../data/catalog'
import { Breadcrumbs } from './legal/LegalLayout'
import { CategoryArt, themeForTags } from '../features/matcher/CategoryArt'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { TextAreaField } from '../components/ui/Field'
import { Alert } from '../components/ui/Alert'
import { useToast } from '../components/ui/Toast'
import { useScholarship } from '../state/ScholarshipContext'
import { DEFAULT_CHECKLIST } from '../lib/checklist'
import { matchWhy } from '../lib/matchWhy'
import { classifyDeadline } from '../lib/urgency'
import { safeJsonLd, SITE_ORIGIN } from '../lib/jsonLd'
import { applyMeta } from '../lib/seo'


export function ScholarshipDetailPage() {
  const { id = '' } = useParams()
  const store = useScholarship()
  const { notify } = useToast()

  const award = useMemo(() => CATALOG.find((item) => item.id === id), [id])

  const [draftNote, setDraftNote] = useState('')
  const [confirmUnsave, setConfirmUnsave] = useState(false)
  const [confirmClearNote, setConfirmClearNote] = useState(false)

  const savedNote = award ? store.notes[award.id] || '' : ''
  useEffect(() => setDraftNote(savedNote), [savedNote])

  // applyMeta rather than useMeta: this runs before the early return for an
  // unknown id, so both the found and not-found states get correct metadata.
  useEffect(() => {
    if (award) {
      applyMeta({
        title: award.name,
        description: `${award.summary} Amount: ${award.amount}. Deadline: ${award.deadline}. Apply on the official page.`,
        path: `/scholarship/${award.id}`,
        type: 'article',
      })
    } else {
      applyMeta({ title: 'Scholarship not found', path: `/scholarship/${id}`, noindex: true })
    }
  }, [award, id])

  // Awards are looked up by URL, so an unknown or stale id is a real case, not
  // an edge case — someone can bookmark or share a link to a removed award.
  if (!award) {
    return (
      <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8">
        <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Browse catalog', to: '/results' }, { label: 'Not found' }]} />
        <div className="surface mt-6 p-6">
          <h1 className="m-0 text-2xl font-extrabold tracking-tight text-[var(--text)]">We couldn't find that award</h1>
          <p className="mt-2 text-[var(--font-size-sm)] leading-relaxed text-[var(--muted)]">
            The link may be out of date, or the program may have been removed from our catalog. Browsing the full list is
            the fastest way to find what you were after.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/results" className="no-underline">
              <Button>Browse all scholarships</Button>
            </Link>
            <Link to="/matches" className="no-underline">
              <Button variant="secondary">See my matches</Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const isSaved = store.shortlist.includes(award.id)
  const theme = themeForTags(award.tags)
  const urgency = classifyDeadline(award.deadline)
  const reasons = matchWhy(award.tags, store.profile)
  const completedSteps = store.checklist[award.id] || []
  const status = store.applyMap[award.id] || 'none'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOccupationalProgram',
    name: award.name,
    description: award.summary,
    url: `${SITE_ORIGIN}/scholarship/${award.id}`,
    provider: { '@type': 'Organization', name: award.name },
    offers: { '@type': 'Offer', category: 'Scholarship', price: award.amount },
  }

  function onSaveToggle() {
    if (isSaved) {
      setConfirmUnsave(true)
      return
    }
    store.toggleSave(award!.id)
    notify(`Saved ${award!.name} to your list.`, 'success')
  }

  function onSaveNote() {
    store.setNoteFor(award!.id, draftNote.trim())
    notify(draftNote.trim() ? 'Note saved.' : 'Note cleared.', 'success')
  }

  return (
    <main id="main" className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6">
      <Breadcrumbs
        trail={[
          { label: 'Home', to: '/' },
          { label: 'Browse catalog', to: '/results' },
          { label: award.name },
        ]}
      />

      <CategoryArt id={award.id} tags={award.tags} className="mt-4 h-28 sm:h-36" />

      <header className="mt-5">
        <p className="m-0 text-[var(--font-size-xs)] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {theme.label}
        </p>
        <h1 className="mt-1.5 mb-0 text-2xl font-extrabold leading-tight tracking-tight text-[var(--text)] sm:text-3xl">
          {award.name}
        </h1>
        <p className="mt-3 mb-0 text-base leading-relaxed text-[var(--muted)]">{award.summary}</p>
      </header>

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <Fact label="Award amount" value={award.amount} />
        <Fact
          label="Deadline"
          value={award.deadline}
          // classifyDeadline returns an object: 'passed' means the window closed,
          // and a fixed date inside two weeks is worth flagging as urgent.
          tone={urgency.kind === 'passed' ? 'danger' : urgency.daysLeft !== null && urgency.daysLeft <= 14 ? 'warn' : 'plain'}
          note={urgency.confirmOfficial ? 'Confirm on the official page' : urgency.label}
        />
        <Fact label="Your status" value={STATUS_LABEL[status] || 'Not started'} />
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        <a href={award.url} target="_blank" rel="noreferrer noopener" className="no-underline" onClick={() => store.markOfficialOpen(award.id)}>
          <Button size="lg">Open official page ↗</Button>
        </a>
        <Button size="lg" variant={isSaved ? 'secondary' : 'primary'} onClick={onSaveToggle}>
          {isSaved ? 'Saved — remove' : 'Save to my list'}
        </Button>
      </div>

      <div className="mt-5">
        <Alert tone="info">
        Deadlines and eligibility change without notice. Confirm everything on the official page before you apply, and
        never pay a fee to apply for a scholarship.
        </Alert>
      </div>

      {reasons.length > 0 && (
        <Section title="Why this matches you">
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[var(--font-size-sm)] leading-relaxed text-[var(--muted)]">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Eligibility tags">
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {award.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-[var(--radius-pill)] border border-[var(--border-strong)] bg-[var(--accent-soft)] px-2.5 py-1 text-[var(--font-size-xs)] font-medium text-[var(--text)]"
            >
              {tag.replace(/-/g, ' ')}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Application checklist">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {DEFAULT_CHECKLIST.map((step) => {
            const done = completedSteps.includes(step.id)
            return (
              <li key={step.id}>
                <label className="flex min-h-[36px] cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-1 text-[var(--font-size-sm)] text-[var(--text)] transition-colors hover:bg-[var(--accent-soft)]">
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => store.toggleChecklistStep(award.id, step.id)}
                    className="size-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className={done ? 'text-[var(--muted)] line-through' : ''}>{step.label}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section title="Your notes">
        <TextAreaField
          label="Notes for this award"
          rows={4}
          value={draftNote}
          onChange={(e) => setDraftNote(e.target.value)}
          hint="Only you can see this. Stored on this device, and synced if you are signed in."
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button onClick={onSaveNote} disabled={draftNote === savedNote}>
            Save note
          </Button>
          {savedNote && (
            <Button variant="ghost" onClick={() => setConfirmClearNote(true)}>
              Clear note
            </Button>
          )}
        </div>
      </Section>

      <ConfirmDialog
        open={confirmUnsave}
        title="Remove from your list?"
        body={
          <>
            <strong>{award.name}</strong> will be removed from your saved list. Any notes and checklist progress for it
            are kept, so saving it again restores them.
          </>
        }
        confirmLabel="Remove"
        onCancel={() => setConfirmUnsave(false)}
        onConfirm={() => {
          store.toggleSave(award.id)
          setConfirmUnsave(false)
          notify(`Removed ${award.name} from your list.`, 'info')
        }}
      />

      <ConfirmDialog
        open={confirmClearNote}
        title="Clear this note?"
        body="Your note for this award will be deleted. This cannot be undone."
        confirmLabel="Clear note"
        onCancel={() => setConfirmClearNote(false)}
        onConfirm={() => {
          store.setNoteFor(award.id, '')
          setDraftNote('')
          setConfirmClearNote(false)
          notify('Note cleared.', 'info')
        }}
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
    </main>
  )
}

const STATUS_LABEL: Record<string, string> = {
  none: 'Not started',
  interested: 'Interested',
  applied: 'Applied',
  submitted: 'Submitted',
}

function Fact({
  label,
  value,
  tone = 'plain',
  note,
}: {
  label: string
  value: string
  tone?: 'plain' | 'warn' | 'danger'
  note?: string
}) {
  const toneClass =
    tone === 'danger' ? 'text-[var(--danger)]' : tone === 'warn' ? 'text-[var(--accent)]' : 'text-[var(--text)]'
  return (
    <div className="surface p-3.5">
      <dt className="m-0 text-[var(--font-size-xs)] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </dt>
      <dd className={`m-0 mt-1 text-[var(--font-size)] font-bold ${toneClass}`}>{value}</dd>
      {note && <p className="m-0 mt-1 text-[var(--font-size-xs)] text-[var(--muted)]">{note}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="m-0 mb-2.5 text-lg font-bold tracking-tight text-[var(--text)]">{title}</h2>
      {children}
    </section>
  )
}
