/**
 * Results route — scholarship cards immediately under a short header.
 * Filters / About you stay collapsed until requested.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CategoryBrowse } from '../components/CategoryBrowse'
import { ComparePanel } from '../components/ComparePanel'
import { DataTools } from '../components/DataTools'
import { ProfilePanel } from '../features/matcher/ProfilePanel'
import { MatcherFilters } from '../features/matcher/MatcherFilters'
import { SavedSearchesPanel } from '../features/matcher/SavedSearchesPanel'
import { ScholarshipCard } from '../features/matcher/ScholarshipCard'
import { CATALOG } from '../data/catalog'
import { copyLinks, downloadCsv, downloadIcs, type ExportRow } from '../lib/exportTools'
import { checklistProgress } from '../lib/checklist'
import { APPLY_STATUS_LABEL } from '../lib/applyStatus'
import { scoreItem } from '../lib/scoring'
import { urgency } from '../lib/urgency'
import { PageAiActions } from '../components/PageAiActions'
import { useScholarship } from '../state/ScholarshipContext'
import { useConfirmedSave } from '../lib/useConfirmedSave'
import { LoadingRegion, SkeletonCard } from '../components/ui/Skeleton'
import { useMeta } from '../lib/seo'

function CardList({
  items,
  s,
}: {
  items: ReturnType<typeof useScholarship>['ranked']
  s: ReturnType<typeof useScholarship>
}) {
  const { requestToggle, dialog: unsaveDialog } = useConfirmedSave({ shortlist: s.shortlist, toggleSave: s.toggleSave })

  /**
   * Rendering ~200 cards takes a visible beat on a phone, and the profile and
   * saved list are read from localStorage on mount, so the first frame has no
   * items. Show card-shaped skeletons for that frame instead of a blank column,
   * which reads as "nothing matched".
   */
  const [ready, setReady] = useState(false)
  useEffect(() => {
    // A frame, not a timer: this waits for paint rather than guessing a delay.
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  if (!ready && items.length > 0) {
    return (
      <LoadingRegion label="Loading scholarships">
        <div className="list">
          {Array.from({ length: Math.min(6, items.length) }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </LoadingRegion>
    )
  }

  return (
    <div className="list">
      {unsaveDialog}
      {items.map((item) => (
        <div key={item.id} className={item.pinned ? 'result-row result-row--pinned' : 'result-row'}>
          {item.pinned ? <p className="result-row__badge">Suggested</p> : null}
          <ScholarshipCard
            item={item}
            saved={s.shortlist.includes(item.id)}
            onToggleSave={() => requestToggle({ id: item.id, name: item.name })}
            applyStatus={s.applyMap[item.id] || 'none'}
            onApplyStatusChange={(status) => s.setApplyStatus(item.id, status)}
            note={s.notes[item.id] || ''}
            onNoteChange={(value) => s.setNoteFor(item.id, value)}
            checklistDone={s.checklist[item.id] || []}
            onToggleChecklistStep={(stepId) => s.toggleChecklistStep(item.id, stepId)}
            compareSelected={s.compareIds.includes(item.id)}
            onToggleCompare={() => s.toggleCompare(item.id)}
            onOpenOfficial={() => s.markOfficialOpen(item.id)}
            onAskAi={() =>
              s.askAi(
                `Explain whether "${item.name}" (id ${item.id}, ${item.amount}, deadline ${item.deadline}) is a good fit for my profile. Use only catalog facts. List eligibility clues from tags/summary and one concrete next step to apply on the official site.`,
              )
            }
            onAddToCalendar={() =>
              downloadIcs(
                [
                  {
                    id: item.id,
                    name: item.name,
                    amount: item.amount,
                    deadline: item.deadline,
                    url: item.url,
                    score: item.score,
                    tags: item.tags,
                  },
                ],
                `${item.id}-deadline.ics`,
              )
            }
          />
        </div>
      ))}
    </div>
  )
}

export function ResultsPage() {
  useMeta({
    title: 'Browse all scholarships',
    description:
      'Browse and filter the full catalog of real scholarships. Every award links to its official page with verified amounts and deadlines.',
    path: '/results',
  })
  const s = useScholarship()
  const [copyNote, setCopyNote] = useState<string | null>(null)
  const [showTools, setShowTools] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  /** Local: after a search, only show suggested cards until user expands. */
  const [showAllCatalog, setShowAllCatalog] = useState(false)

  useEffect(() => {
    // New search/onboarding → collapse to suggested only (always, both viewports)
    if (s.pinnedIds.length > 0) setShowAllCatalog(false)
    window.scrollTo(0, 0)
  }, [s.lastSearchLabel, s.pinnedIds.join('|')])

  const exportRows: ExportRow[] = useMemo(
    () =>
      s.ranked.map((item) => ({
        id: item.id,
        name: item.name,
        amount: item.amount,
        deadline: item.deadline,
        url: item.url,
        score: item.score,
        tags: item.tags,
        status: s.applyMap[item.id] || 'none',
      })),
    [s.ranked, s.applyMap],
  )

  const compareRows = useMemo(
    () =>
      s.compareIds
        .map((id) => {
          const item = CATALOG.find((c) => c.id === id)
          if (!item) return null
          return {
            id: item.id,
            name: item.name,
            amount: item.amount,
            deadline: item.deadline,
            score: scoreItem(item.tags, s.profile),
            urgLabel: urgency(item.deadline).label,
            tags: item.tags,
            status: APPLY_STATUS_LABEL[s.applyMap[id] || 'none'],
            note: s.notes[id],
            checklistPercent: checklistProgress(s.checklist[id]).percent,
            url: item.url,
          }
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x)),
    [s.compareIds, s.profile, s.applyMap, s.notes, s.checklist],
  )

  async function handleCopyLinks() {
    const ok = await copyLinks(exportRows)
    setCopyNote(ok ? `Copied ${exportRows.length} link${exportRows.length === 1 ? '' : 's'}` : 'Could not copy')
    window.setTimeout(() => setCopyNote(null), 2000)
  }

  function handleSaveSearch() {
    const name = window.prompt(
      'Name this search',
      s.listFilter.trim() || s.lastSearchLabel || `${s.profile.major} · ${s.profile.level}`,
    )
    if (name === null) return
    s.saveCurrentSearch(name)
  }

  const pinnedCount = s.pinnedIds.length
  const suggested = s.ranked.filter((r) => r.pinned)
  const rest = s.ranked.filter((r) => !r.pinned)

  return (
    <>
      <div className="results-workspace-banner" role="status" aria-live="polite">
        <p className="meta">
          <strong>Your results</strong>
          {s.lastSearchLabel ? ` · “${s.lastSearchLabel}”` : ''}
          {pinnedCount > 0 ? ` · ${pinnedCount} suggested` : ''}
          {` · ${s.ranked.length} shown`}
          {' · '}
          <Link to="/matches">Matches for you</Link>
          {' · '}
          <Link to="/">How it works</Link>
        </p>
      </div>

      {compareRows.length >= 2 ? (
        <ComparePanel rows={compareRows} onClose={s.clearCompare} onRemove={s.removeCompare} />
      ) : null}

      <PageAiActions
        title="AI on Results"
        actions={[
          {
            label: 'Help me filter this list',
            prompt: `I am on Scholarship One Results (full catalog browser). Profile context and last search: ${s.lastSearchLabel || 'none'}. I have ${s.ranked.length} rows showing, ${pinnedCount} suggested. Suggest 3 plain-language filters or header searches to try next using only catalog themes (major, state, need, disability, etc.). Do not invent awards.`,
          },
          {
            label: 'Which of these should I save?',
            prompt: `From Scholarship One Results, top visible names: ${s.ranked
              .slice(0, 8)
              .map((r) => r.name)
              .join('; ') || 'none'}. Which 2–3 should I save to the Application tracker first and why? Catalog facts only.`,
          },
        ]}
        onAsk={s.askAi}
      />

      <section className="panel results-board" aria-labelledby="results-heading">
        <div className="results-board__head results-board__head--compact">
          <div>
            <h1 id="results-heading" className="h2-section">
              Results
            </h1>
            <p className="lede lede--tight">
              Browse and filter the full catalog. For a ranked “for you” list, open{' '}
              <Link to="/matches">Matches</Link>.
            </p>
          </div>
          <div className="results-board__head-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowCategories((v) => !v)}>
              {showCategories ? 'Hide categories' : 'Categories'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowTools((v) => !v)}>
              {showTools ? 'Hide filters' : 'Filters & profile'}
            </button>
            {pinnedCount > 0 ? (
              <button
                type="button"
                className={`btn btn-ghost${!showAllCatalog ? ' btn-ghost--on' : ''}`}
                onClick={() => setShowAllCatalog((v) => !v)}
              >
                {showAllCatalog ? `Suggestions only (${pinnedCount})` : `Show all catalog`}
              </button>
            ) : null}
          </div>
        </div>

        {showCategories ? (
          <CategoryBrowse activeId={s.categoryId} onSelect={s.setCategoryId} counts={s.categoryCounts} />
        ) : null}

        {/* LIST FIRST — immediately under title */}
        <div id="scholarship-list" className="scholarship-list-block">
          {s.ranked.length === 0 ? (
            <p className="lede empty-hint">Nothing matches. Open Filters &amp; profile or search again.</p>
          ) : (
            <>
              {suggested.length > 0 ? (
                <div className="list-section">
                  <h2 className="list-section__title">Suggested for you ({suggested.length})</h2>
                  <CardList items={suggested} s={s} />
                </div>
              ) : null}
              {(showAllCatalog || suggested.length === 0) && rest.length > 0 ? (
                <div className="list-section">
                  <h2 className="list-section__title">
                    {suggested.length > 0 ? `More from the catalog (${rest.length})` : `Matches (${rest.length})`}
                  </h2>
                  <CardList items={rest} s={s} />
                </div>
              ) : null}
              {suggested.length > 0 && !showAllCatalog ? (
                <p className="meta list-more-hint">
                  Showing {suggested.length} suggestions.{' '}
                  <button type="button" className="linkish" onClick={() => setShowAllCatalog(true)}>
                    Show full catalog
                  </button>
                </p>
              ) : null}
            </>
          )}
        </div>

        {showTools ? (
          <div className="results-tools__body">
            <ProfilePanel profile={s.profile} onChange={s.setProfile} onApply={s.applyProfileSearch} />
            <MatcherFilters
              query={s.listFilter}
              onQueryChange={s.setListFilter}
              categoryId={s.categoryId}
              onCategoryChange={s.setCategoryId}
              urgencyFilter={s.urgencyFilter}
              onUrgencyChange={s.setUrgencyFilter}
              sort={s.sort}
              onSortChange={s.setSort}
              amountBucket={s.amountBucket}
              onAmountBucketChange={s.setAmountBucket}
              essayFilter={s.essayFilter}
              onEssayFilterChange={s.setEssayFilter}
              onlyShort={s.onlyShort}
              onOnlyShortChange={s.setOnlyShort}
              shortlistCount={s.shortlist.length}
              resultCount={s.ranked.length}
              onClear={s.clearFilters}
              onSaveSearch={handleSaveSearch}
            />
            <div className="export-bar" aria-label="Export tools">
              <button type="button" className="btn btn-ghost" onClick={() => downloadCsv(exportRows)} disabled={!exportRows.length}>
                Export CSV
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => downloadIcs(exportRows)} disabled={!exportRows.length}>
                Calendar (.ics)
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void handleCopyLinks()} disabled={!exportRows.length}>
                Copy links
              </button>
              <DataTools
                profile={s.profile}
                shortlist={s.shortlist}
                applyMap={s.applyMap}
                notes={s.notes}
                checklist={s.checklist}
                savedSearches={s.savedSearches}
                recentlyViewed={s.recent}
                onRestore={s.restoreBackup}
              />
              {copyNote ? (
                <span className="export-bar__note" role="status">
                  {copyNote}
                </span>
              ) : null}
            </div>
            <SavedSearchesPanel
              searches={s.savedSearches}
              onRestore={s.restoreSearch}
              onDelete={s.removeSavedSearch}
            />
          </div>
        ) : null}
      </section>
    </>
  )
}
