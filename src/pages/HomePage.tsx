import { useEffect, useMemo, useState } from 'react'
import type { SiteConfig } from '../config/site'
import { Shell } from '../components/Shell'
import { FeatureGrid } from '../components/FeatureGrid'
import { AiSearchHero } from '../components/AiSearchHero'
import { CategoryBrowse } from '../components/CategoryBrowse'
import { WorkspaceStrip } from '../components/WorkspaceStrip'
import { WeeklyDigestPanel } from '../components/WeeklyDigest'
import { ComparePanel } from '../components/ComparePanel'
import { DataTools } from '../components/DataTools'
import { OnboardingModal } from '../components/OnboardingModal'
import { PipelineBoard } from '../components/PipelineBoard'
import { AnalyticsPanel } from '../components/AnalyticsPanel'
import { CATALOG } from '../data/catalog'
import { loadProfile, loadShortlist, saveProfile, saveShortlist, type Profile } from '../lib/profile'
import { scoreBreakdown, scoreItem } from '../lib/scoring'
import { matchWhy } from '../lib/matchWhy'
import { fitTips } from '../lib/fitTips'
import { urgency } from '../lib/urgency'
import { shouldShowOnboarding } from '../lib/onboarding'
import { track } from '../lib/analytics'
import { ScholarshipCard } from '../features/matcher/ScholarshipCard'
import { ProfilePanel } from '../features/matcher/ProfilePanel'
import {
  MatcherFilters,
  type EssayFilter,
  type SortMode,
  type UrgencyFilter,
} from '../features/matcher/MatcherFilters'
import { SavedSearchesPanel } from '../features/matcher/SavedSearchesPanel'
import {
  deleteSavedSearch,
  loadSavedSearches,
  upsertSavedSearch,
  type SavedSearch,
} from '../lib/savedSearches'
import {
  loadApplyStatus,
  saveApplyStatus,
  setStatusFor,
  type ApplyStatus,
} from '../lib/applyStatus'
import { copyLinks, downloadCsv, downloadIcs, type ExportRow } from '../lib/exportTools'
import { BROWSE_CATEGORIES, itemMatchesCategory } from '../lib/categories'
import { parseSearchIntent } from '../lib/searchIntent'
import { matchCatalog } from '../lib/matchCatalog'
import { loadNotes, saveNotes, setNote } from '../lib/notes'
import { loadChecklist, saveChecklist, toggleCheckStep, checklistProgress } from '../lib/checklist'
import { loadRecentlyViewed, pushRecentlyViewed } from '../lib/recentlyViewed'
import { hasNoEssayTag, matchesAmountBucket, type AmountBucket } from '../lib/amountFilter'
import { APPLY_STATUS_LABEL } from '../lib/applyStatus'
import type { BackupPayload } from '../lib/dataBackup'

export type HomePageProps = { config: SiteConfig }

function deadlineSortKey(deadline: string): number {
  if (/fafsa|cycle|varies|rolling|portal|campus|priority|recommended|annually/i.test(deadline)) {
    return Number.MAX_SAFE_INTEGER - 1
  }
  const parsed = Date.parse(deadline)
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed
}

function scrollToId(id: string) {
  window.setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 60)
}

/**
 * Full product workspace: search → match → digest → save → track → compare → apply.
 */
export function HomePage({ config }: HomePageProps) {
  const [chatPrompt, setChatPrompt] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all')
  const [sort, setSort] = useState<SortMode>('match')
  const [amountBucket, setAmountBucket] = useState<AmountBucket>('all')
  const [essayFilter, setEssayFilter] = useState<EssayFilter>('all')
  const [profile, setProfile] = useState<Profile>(loadProfile)
  const [shortlist, setShortlist] = useState<string[]>(loadShortlist)
  const [onlyShort, setOnlyShort] = useState(false)
  const [onlyAi, setOnlyAi] = useState(false)
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(loadSavedSearches)
  const [applyMap, setApplyMap] = useState<Record<string, ApplyStatus>>(loadApplyStatus)
  const [notes, setNotes] = useState<Record<string, string>>(loadNotes)
  const [checklist, setChecklist] = useState(loadChecklist)
  const [recent, setRecent] = useState<string[]>(loadRecentlyViewed)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [copyNote, setCopyNote] = useState<string | null>(null)
  const [lastSearchLabel, setLastSearchLabel] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding)
  const [forceChatOpen, setForceChatOpen] = useState(false)

  useEffect(() => {
    saveProfile(profile)
  }, [profile])
  useEffect(() => {
    saveShortlist(shortlist)
  }, [shortlist])
  useEffect(() => {
    saveApplyStatus(applyMap)
  }, [applyMap])
  useEffect(() => {
    saveNotes(notes)
  }, [notes])
  useEffect(() => {
    saveChecklist(checklist)
  }, [checklist])

  useEffect(() => {
    const scrollHash = () => {
      const id = window.location.hash.replace(/^#/, '')
      if (!id) return
      const target =
        id === 'matcher' || id === 'ai-matches' || id === 'app'
          ? 'results'
          : id === 'saved'
            ? 'my-list'
            : id
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    scrollHash()
    window.addEventListener('hashchange', scrollHash)
    return () => window.removeEventListener('hashchange', scrollHash)
  }, [])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: CATALOG.length }
    for (const cat of BROWSE_CATEGORIES) {
      if (cat.id === 'all') continue
      counts[cat.id] = CATALOG.filter((item) => itemMatchesCategory(item.tags, cat.id)).length
    }
    return counts
  }, [])

  const ranked = useMemo(() => {
    const rows = CATALOG.map((item) => {
      const breakdown = scoreBreakdown(item.tags, profile)
      return {
        ...item,
        score: breakdown.total,
        scoreParts: breakdown.parts,
        scorePenalties: breakdown.penalties,
        urg: urgency(item.deadline),
        pinned: pinnedIds.includes(item.id),
        why: matchWhy(item.tags, profile),
        tips: fitTips(item.tags, profile, breakdown.total),
      }
    }).filter((item) => {
      const okCategory = itemMatchesCategory(item.tags, categoryId)
      const okQuery =
        !query ||
        `${item.name} ${item.summary} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())
      const okShort = !onlyShort || shortlist.includes(item.id)
      const okAi = !onlyAi || item.pinned
      const okAmount = matchesAmountBucket(item.amount, amountBucket)
      const okEssay = essayFilter === 'all' || hasNoEssayTag(item.tags)
      let okUrg = true
      if (urgencyFilter === 'soon') okUrg = item.urg.kind === 'fixed' && (item.urg.daysLeft ?? 99) <= 45
      if (urgencyFilter === 'rolling') okUrg = item.urg.kind === 'cycle' || item.urg.kind === 'soft'
      if (urgencyFilter === 'passed') okUrg = item.urg.kind === 'passed'
      return okCategory && okQuery && okShort && okAi && okUrg && okAmount && okEssay
    })

    rows.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'deadline') return deadlineSortKey(a.deadline) - deadlineSortKey(b.deadline)
      return b.score - a.score
    })
    return rows
  }, [
    query,
    categoryId,
    profile,
    onlyShort,
    onlyAi,
    shortlist,
    pinnedIds,
    urgencyFilter,
    sort,
    amountBucket,
    essayFilter,
  ])

  const exportRows: ExportRow[] = useMemo(
    () =>
      ranked.map((item) => ({
        id: item.id,
        name: item.name,
        amount: item.amount,
        deadline: item.deadline,
        url: item.url,
        score: item.score,
        tags: item.tags,
        status: applyMap[item.id] || 'none',
      })),
    [ranked, applyMap],
  )

  const dueSoonInCatalog = useMemo(
    () =>
      CATALOG.filter((item) => {
        const u = urgency(item.deadline)
        return u.tone === 'chip-warn' || u.tone === 'chip-ok'
      }).length,
    [],
  )

  const dueSoonSaved = useMemo(
    () =>
      shortlist.filter((id) => {
        const item = CATALOG.find((c) => c.id === id)
        if (!item) return false
        const u = urgency(item.deadline)
        return u.tone === 'chip-warn' || u.tone === 'chip-ok'
      }).length,
    [shortlist],
  )

  const inProgressCount = useMemo(
    () => Object.values(applyMap).filter((s) => s === 'interested' || s === 'applied').length,
    [applyMap],
  )
  const submittedCount = useMemo(
    () => Object.values(applyMap).filter((s) => s === 'submitted').length,
    [applyMap],
  )

  const compareRows = useMemo(() => {
    return compareIds
      .map((id) => {
        const item = CATALOG.find((c) => c.id === id)
        if (!item) return null
        const score = scoreItem(item.tags, profile)
        return {
          id: item.id,
          name: item.name,
          amount: item.amount,
          deadline: item.deadline,
          score,
          urgLabel: urgency(item.deadline).label,
          tags: item.tags,
          status: APPLY_STATUS_LABEL[applyMap[id] || 'none'],
          note: notes[id],
          checklistPercent: checklistProgress(checklist[id]).percent,
          url: item.url,
        }
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
  }, [compareIds, profile, applyMap, notes, checklist])

  const recentItems = useMemo(
    () =>
      recent
        .map((id) => CATALOG.find((c) => c.id === id))
        .filter((x): x is (typeof CATALOG)[number] => Boolean(x))
        .slice(0, 6),
    [recent],
  )

  function runUnifiedSearch(prompt: string) {
    const trimmed = prompt.trim()
    if (!trimmed) return

    track({ type: 'search', q: trimmed.slice(0, 120), at: Date.now() })
    const intent = parseSearchIntent(trimmed, profile)
    setProfile(intent.profile)
    setCategoryId(intent.categoryId)
    if (intent.categoryId !== 'all') track({ type: 'category', id: intent.categoryId, at: Date.now() })
    setQuery('')
    setOnlyShort(false)
    setOnlyAi(false)
    setUrgencyFilter('all')
    setSort('match')
    setAmountBucket('all')
    setEssayFilter('all')
    setLastSearchLabel(intent.summary)

    const local = matchCatalog(trimmed, 8)
    setPinnedIds(local.length ? local.map((h) => h.id) : [])
    setChatPrompt(trimmed)
    setForceChatOpen(true)
    scrollToId('results')
  }

  function handlePinMatches(ids: string[], saveToList = false) {
    setPinnedIds((prev) => Array.from(new Set([...prev, ...ids])))
    if (saveToList) {
      setShortlist((prev) => Array.from(new Set([...ids, ...prev])))
      for (const id of ids) track({ type: 'save', id, at: Date.now() })
    }
    setOnlyShort(false)
    setOnlyAi(false)
    scrollToId('results')
  }

  function toggleSave(id: string) {
    setShortlist((prev) => {
      const saved = prev.includes(id)
      track({ type: saved ? 'unsave' : 'save', id, at: Date.now() })
      return saved ? prev.filter((x) => x !== id) : [...prev, id]
    })
  }

  function handleOnboardingComplete(next: Profile) {
    setProfile(next)
    setShowOnboarding(false)
    setForceChatOpen(true)
    const label = [next.level, next.state, next.major, next.identity].filter((v) => v && v !== 'any').join(' ')
    const local = matchCatalog(label || 'undergraduate scholarships', 8)
    setPinnedIds(local.map((h) => h.id))
    setLastSearchLabel('Your onboarding profile')
    if (next.state !== 'any') setCategoryId('state')
    scrollToId('results')
  }

  const pipelineItems = useMemo(
    () =>
      shortlist
        .map((id) => {
          const item = CATALOG.find((c) => c.id === id)
          if (!item) return null
          return {
            id: item.id,
            name: item.name,
            deadline: item.deadline,
            amount: item.amount,
            url: item.url,
            status: applyMap[id] || ('none' as ApplyStatus),
          }
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x)),
    [shortlist, applyMap],
  )

  function clearFilters() {
    setQuery('')
    setCategoryId('all')
    setUrgencyFilter('all')
    setSort('match')
    setOnlyShort(false)
    setOnlyAi(false)
    setAmountBucket('all')
    setEssayFilter('all')
    setLastSearchLabel(null)
  }

  function handleSaveSearch() {
    const name = window.prompt(
      'Name this search',
      query.trim() || lastSearchLabel || `${profile.major} · ${profile.level}`,
    )
    if (name === null) return
    setSavedSearches(
      upsertSavedSearch({
        name,
        query,
        tag: categoryId,
        urgency: urgencyFilter,
        sort,
        onlyShort,
        profile,
      }),
    )
  }

  function restoreSearch(search: SavedSearch) {
    setQuery(search.query)
    setCategoryId(search.tag || 'all')
    setUrgencyFilter((search.urgency as UrgencyFilter) || 'all')
    setSort((search.sort as SortMode) || 'match')
    setOnlyShort(search.onlyShort)
    setProfile(search.profile)
    setOnlyAi(false)
    scrollToId('results')
  }

  async function handleCopyLinks() {
    const ok = await copyLinks(exportRows)
    setCopyNote(ok ? `Copied ${exportRows.length} link${exportRows.length === 1 ? '' : 's'}` : 'Could not copy')
    window.setTimeout(() => setCopyNote(null), 2000)
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 4) return prev
      const next = [...prev, id]
      if (next.length >= 2) track({ type: 'compare', count: next.length, at: Date.now() })
      return next
    })
  }

  function handleRestore(data: BackupPayload) {
    setProfile(data.profile)
    setShortlist(data.shortlist || [])
    setApplyMap(data.applyMap || {})
    setNotes(data.notes || {})
    setChecklist(data.checklist || {})
    setSavedSearches(data.savedSearches || [])
    setRecent(data.recentlyViewed || [])
  }

  function printWeeklyPlan() {
    window.print()
  }

  const pinnedCount = pinnedIds.length

  return (
    <Shell
      config={config}
      profile={profile}
      onProfileChange={setProfile}
      chatPrompt={chatPrompt}
      onChatPromptConsumed={() => setChatPrompt(null)}
      onPinMatches={handlePinMatches}
      forceChatOpen={forceChatOpen}
    >
      {showOnboarding ? (
        <OnboardingModal
          profile={profile}
          onComplete={handleOnboardingComplete}
          onSkip={() => setShowOnboarding(false)}
        />
      ) : null}

      <AiSearchHero config={config} onAsk={runUnifiedSearch} />

      <WorkspaceStrip
        savedCount={shortlist.length}
        dueSoonCount={dueSoonSaved}
        inProgressCount={inProgressCount}
        submittedCount={submittedCount}
        suggestionCount={pinnedCount}
        onShowSaved={() => {
          setOnlyShort(true)
          setOnlyAi(false)
          scrollToId('results')
        }}
        onShowDueSoon={() => {
          setOnlyShort(true)
          setUrgencyFilter('soon')
          setOnlyAi(false)
          scrollToId('results')
        }}
        onShowSuggestions={() => {
          setOnlyAi(true)
          setOnlyShort(false)
          scrollToId('results')
        }}
        onShowAll={() => {
          clearFilters()
          scrollToId('results')
        }}
      />

      <WeeklyDigestPanel
        catalog={CATALOG}
        savedIds={shortlist}
        onFocusSaved={() => {
          setOnlyShort(true)
          scrollToId('results')
        }}
      />

      <PipelineBoard
        items={pipelineItems}
        onStatusChange={(id, status) => {
          setApplyMap((m) => setStatusFor(m, id, status))
          track({ type: 'pipeline_move', id, status, at: Date.now() })
        }}
        onOpenOfficial={(id) => {
          track({ type: 'official_click', id, at: Date.now() })
          setRecent((r) => pushRecentlyViewed(r, id))
        }}
      />

      {compareRows.length >= 2 ? (
        <ComparePanel
          rows={compareRows}
          onClose={() => setCompareIds([])}
          onRemove={(id) => setCompareIds((prev) => prev.filter((x) => x !== id))}
        />
      ) : null}

      <section className="panel results-board" id="results" aria-labelledby="results-heading">
        <div className="results-board__head">
          <div>
            <h2 id="results-heading" className="h2-section">
              Scholarships
            </h2>
            <p className="lede">
              {lastSearchLabel
                ? `Showing best fits for “${lastSearchLabel}”. Suggested programs are listed first.`
                : pinnedCount > 0
                  ? `${pinnedCount} suggestion${pinnedCount === 1 ? '' : 's'} listed first. Save, compare, track, or open the official site.`
                  : 'Browse categories (including State / regional), refine About you, or search in plain language.'}
            </p>
          </div>
          <div className="results-board__head-actions">
            {compareIds.length > 0 ? (
              <button type="button" className="btn btn-ghost" onClick={() => scrollToId('compare')}>
                Compare ({compareIds.length})
              </button>
            ) : null}
            <button type="button" className="btn btn-ghost" onClick={printWeeklyPlan}>
              Print plan
            </button>
            {pinnedCount > 0 || lastSearchLabel ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setPinnedIds([])
                  setLastSearchLabel(null)
                  setOnlyAi(false)
                }}
              >
                Clear suggestions
              </button>
            ) : null}
          </div>
        </div>

        <CategoryBrowse
          activeId={categoryId}
          onSelect={(id) => {
            setCategoryId(id)
            setOnlyAi(false)
            track({ type: 'category', id, at: Date.now() })
          }}
          counts={categoryCounts}
        />

        <div className="quick-chips" aria-label="Quick filters">
          <button
            type="button"
            className={`canned__chip${urgencyFilter === 'soon' ? ' canned__chip--on' : ''}`}
            onClick={() => setUrgencyFilter(urgencyFilter === 'soon' ? 'all' : 'soon')}
          >
            Due soon ({dueSoonInCatalog})
          </button>
          <button
            type="button"
            className={`canned__chip${onlyShort ? ' canned__chip--on' : ''}`}
            onClick={() => setOnlyShort((v) => !v)}
          >
            Saved ({shortlist.length})
          </button>
          <button
            type="button"
            className={`canned__chip${onlyAi ? ' canned__chip--on' : ''}`}
            onClick={() => setOnlyAi((v) => !v)}
            disabled={!pinnedCount}
          >
            Suggestions only ({pinnedCount})
          </button>
          <button
            type="button"
            className={`canned__chip${categoryId === 'state' ? ' canned__chip--on' : ''}`}
            onClick={() => setCategoryId(categoryId === 'state' ? 'all' : 'state')}
          >
            State awards ({categoryCounts.state || 0})
          </button>
          <button
            type="button"
            className={`canned__chip${essayFilter === 'no-essay' ? ' canned__chip--on' : ''}`}
            onClick={() => setEssayFilter(essayFilter === 'no-essay' ? 'all' : 'no-essay')}
          >
            No essay preferred
          </button>
        </div>

        <ProfilePanel profile={profile} onChange={setProfile} />
        <MatcherFilters
          query={query}
          onQueryChange={setQuery}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          urgencyFilter={urgencyFilter}
          onUrgencyChange={setUrgencyFilter}
          sort={sort}
          onSortChange={setSort}
          amountBucket={amountBucket}
          onAmountBucketChange={setAmountBucket}
          essayFilter={essayFilter}
          onEssayFilterChange={setEssayFilter}
          onlyShort={onlyShort}
          onOnlyShortChange={setOnlyShort}
          shortlistCount={shortlist.length}
          resultCount={ranked.length}
          onClear={clearFilters}
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
            profile={profile}
            shortlist={shortlist}
            applyMap={applyMap}
            notes={notes}
            checklist={checklist}
            savedSearches={savedSearches}
            recentlyViewed={recent}
            onRestore={handleRestore}
          />
          {copyNote ? (
            <span className="export-bar__note" role="status">
              {copyNote}
            </span>
          ) : null}
        </div>

        <SavedSearchesPanel
          searches={savedSearches}
          onRestore={restoreSearch}
          onDelete={(id) => setSavedSearches(deleteSavedSearch(id))}
        />

        {recentItems.length > 0 ? (
          <div className="recent-strip" aria-label="Recently viewed">
            <p className="meta recent-strip__label">Recently viewed</p>
            <div className="recent-strip__row">
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="canned__chip"
                  onClick={() => {
                    setQuery(item.name)
                    setOnlyShort(false)
                    setOnlyAi(false)
                    scrollToId('results')
                  }}
                >
                  {item.name.length > 36 ? `${item.name.slice(0, 34)}…` : item.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {onlyShort && shortlist.length === 0 ? (
          <p className="lede empty-hint">
            You have not saved any programs yet. Use the star on a card, or search and save suggestions.
          </p>
        ) : null}
        {onlyAi && pinnedCount === 0 ? (
          <p className="lede empty-hint">No suggestions yet. Describe your situation in search or Scholarship match.</p>
        ) : null}
        {ranked.length === 0 ? (
          <p className="lede empty-hint">Nothing matches these filters. Clear filters or broaden your profile.</p>
        ) : (
          <div className="list">
            {ranked.map((item) => (
              <div key={item.id} className={item.pinned ? 'result-row result-row--pinned' : 'result-row'}>
                {item.pinned ? <p className="result-row__badge">Suggested</p> : null}
                <ScholarshipCard
                  item={item}
                  saved={shortlist.includes(item.id)}
                  onToggleSave={() => toggleSave(item.id)}
                  applyStatus={applyMap[item.id] || 'none'}
                  onApplyStatusChange={(status) => setApplyMap((m) => setStatusFor(m, item.id, status))}
                  note={notes[item.id] || ''}
                  onNoteChange={(value) => setNotes((m) => setNote(m, item.id, value))}
                  checklistDone={checklist[item.id] || []}
                  onToggleChecklistStep={(stepId) => setChecklist((m) => toggleCheckStep(m, item.id, stepId))}
                  compareSelected={compareIds.includes(item.id)}
                  onToggleCompare={() => toggleCompare(item.id)}
                  onOpenOfficial={() => {
                    track({ type: 'official_click', id: item.id, at: Date.now() })
                    setRecent((r) => pushRecentlyViewed(r, item.id))
                  }}
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
        )}
      </section>

      <AnalyticsPanel />

      <section className="panel panel-muted" id="how-it-works" aria-labelledby="how-heading">
        <h2 id="how-heading" className="h2-section">
          How Scholarship One works
        </h2>
        <ol className="how-steps">
          <li>
            <strong>Describe yourself</strong> — major, state, background, disability, sports, or need.
          </li>
          <li>
            <strong>Review suggestions + weekly digest</strong> — ranked list, match panel, and this week’s deadlines.
          </li>
          <li>
            <strong>Save, note, checklist, compare</strong> — build a real application plan on this device.
          </li>
          <li>
            <strong>Apply on the official site</strong> — export calendar/CSV or restore from backup anytime.
          </li>
        </ol>
        <div className="grid-2 feature-grid">
          <FeatureGrid features={config.features} />
        </div>
      </section>
    </Shell>
  )
}
