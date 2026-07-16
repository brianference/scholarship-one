/**
 * Shared app state for multi-page routes.
 * Pages read/write via useScholarship() — no prop-drilling monolith.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import type { AmountBucket } from '../lib/amountFilter'
import { track } from '../lib/analytics'
import {
  loadApplyStatus,
  saveApplyStatus,
  setStatusFor,
  type ApplyStatus,
} from '../lib/applyStatus'
import type { BackupPayload } from '../lib/dataBackup'
import { loadChecklist, saveChecklist, toggleCheckStep } from '../lib/checklist'
import { loadNotes, saveNotes, setNote } from '../lib/notes'
import { shouldShowOnboarding } from '../lib/onboarding'
import { loadProfile, saveProfile, saveShortlist, loadShortlist, type Profile } from '../lib/profile'
import { loadRecentlyViewed, pushRecentlyViewed } from '../lib/recentlyViewed'
import {
  deleteSavedSearch,
  loadSavedSearches,
  upsertSavedSearch,
  type SavedSearch,
} from '../lib/savedSearches'
import { parseSearchIntent } from '../lib/searchIntent'
import { buildProfileSearchPlan, pinsFromFreeTextSearch } from '../lib/profileSearch'
import type { EssayFilter, SortMode, UrgencyFilter } from '../features/matcher/MatcherFilters'
import { categoryCounts, queryCatalog } from '../lib/catalogQuery'
import { CATALOG } from '../data/catalog'
import { urgency } from '../lib/urgency'

export type ScholarshipContextValue = {
  // profile + lists
  profile: Profile
  setProfile: (p: Profile) => void
  shortlist: string[]
  applyMap: Record<string, ApplyStatus>
  notes: Record<string, string>
  checklist: ReturnType<typeof loadChecklist>
  recent: string[]
  savedSearches: SavedSearch[]

  // list UI filters
  listFilter: string
  setListFilter: (v: string) => void
  categoryId: string
  setCategoryId: (v: string) => void
  urgencyFilter: UrgencyFilter
  setUrgencyFilter: (v: UrgencyFilter) => void
  sort: SortMode
  setSort: (v: SortMode) => void
  amountBucket: AmountBucket
  setAmountBucket: (v: AmountBucket) => void
  essayFilter: EssayFilter
  setEssayFilter: (v: EssayFilter) => void
  onlyShort: boolean
  setOnlyShort: (v: boolean) => void
  onlyAi: boolean
  setOnlyAi: (v: boolean) => void
  pinnedIds: string[]
  compareIds: string[]
  lastSearchLabel: string | null
  headerQuery: string

  // chat / onboarding
  chatPrompt: string | null
  clearChatPrompt: () => void
  forceChatOpen: boolean
  showOnboarding: boolean
  skipOnboarding: () => void
  /** Re-open the welcome onboarding picker (Start over). */
  restartOnboarding: () => void

  // derived
  ranked: ReturnType<typeof queryCatalog>
  categoryCounts: Record<string, number>
  dueSoonInCatalog: number
  dueSoonSaved: number
  inProgressCount: number
  submittedCount: number
  pipelineItems: {
    id: string
    name: string
    deadline: string
    amount: string
    url: string
    status: ApplyStatus
  }[]

  // actions
  runSearch: (prompt: string) => void
  applyProfileSearch: (next: Profile, options?: { to?: string }) => void
  handlePinMatches: (ids: string[], saveToList?: boolean) => void
  toggleSave: (id: string) => void
  toggleCompare: (id: string) => void
  clearCompare: () => void
  removeCompare: (id: string) => void
  clearSuggestions: () => void
  clearFilters: () => void
  setApplyStatus: (id: string, status: ApplyStatus) => void
  setNoteFor: (id: string, note: string) => void
  toggleChecklistStep: (id: string, stepId: string) => void
  markOfficialOpen: (id: string) => void
  saveCurrentSearch: (name: string) => void
  restoreSearch: (search: SavedSearch) => void
  removeSavedSearch: (id: string) => void
  restoreBackup: (data: BackupPayload) => void
  /** Restore shortlist + profile from a share pack URL. */
  restoreSharePack: (pack: {
    profile: Profile
    shortlist: string[]
    applyMap?: Record<string, ApplyStatus>
  }) => void
  completeOnboarding: (next: Profile) => void
  /** Open Scholarship match with a full prompt (page AI actions). */
  askAi: (prompt: string) => void
  /** Replace compare selection (e.g. top 3 on Matches). */
  setCompareSelection: (ids: string[]) => void
}

const ScholarshipContext = createContext<ScholarshipContextValue | null>(null)

/**
 * Provider must sit under BrowserRouter (uses navigate).
 */
export function ScholarshipProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  const [profile, setProfileState] = useState<Profile>(loadProfile)
  const [shortlist, setShortlist] = useState<string[]>(loadShortlist)
  const [applyMap, setApplyMap] = useState<Record<string, ApplyStatus>>(loadApplyStatus)
  const [notes, setNotes] = useState<Record<string, string>>(loadNotes)
  const [checklist, setChecklist] = useState(loadChecklist)
  const [recent, setRecent] = useState<string[]>(loadRecentlyViewed)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(loadSavedSearches)

  const [listFilter, setListFilter] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all')
  const [sort, setSort] = useState<SortMode>('match')
  const [amountBucket, setAmountBucket] = useState<AmountBucket>('all')
  const [essayFilter, setEssayFilter] = useState<EssayFilter>('all')
  const [onlyShort, setOnlyShort] = useState(false)
  const [onlyAi, setOnlyAi] = useState(false)
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [lastSearchLabel, setLastSearchLabel] = useState<string | null>(null)
  const [headerQuery, setHeaderQuery] = useState('')
  const [chatPrompt, setChatPrompt] = useState<string | null>(null)
  const [forceChatOpen, setForceChatOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding)

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

  const setProfile = useCallback((p: Profile) => setProfileState(p), [])

  const ranked = useMemo(
    () =>
      queryCatalog({
        profile,
        listFilter,
        categoryId,
        onlyShort,
        onlyAi,
        shortlist,
        pinnedIds,
        urgencyFilter,
        sort,
        amountBucket,
        essayFilter,
      }),
    [
      profile,
      listFilter,
      categoryId,
      onlyShort,
      onlyAi,
      shortlist,
      pinnedIds,
      urgencyFilter,
      sort,
      amountBucket,
      essayFilter,
    ],
  )

  const counts = useMemo(() => categoryCounts(), [])

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

  const clearFilters = useCallback(() => {
    setListFilter('')
    setCategoryId('all')
    setUrgencyFilter('all')
    setSort('match')
    setOnlyShort(false)
    setOnlyAi(false)
    setAmountBucket('all')
    setEssayFilter('all')
    setLastSearchLabel(null)
  }, [])

  const runSearch = useCallback(
    (prompt: string) => {
      const trimmed = prompt.trim()
      if (!trimmed) return
      track({ type: 'search', q: trimmed.slice(0, 120), at: Date.now() })
      setHeaderQuery(trimmed)
      const intent = parseSearchIntent(trimmed, profile)
      setProfileState(intent.profile)
      setCategoryId(intent.categoryId)
      if (intent.categoryId !== 'all') track({ type: 'category', id: intent.categoryId, at: Date.now() })
      setListFilter('')
      setOnlyShort(false)
      setOnlyAi(false)
      setUrgencyFilter('all')
      setSort('match')
      setAmountBucket('all')
      setEssayFilter('all')
      setLastSearchLabel(intent.summary)
      // Same pin gates as onboarding (senior-entry + identity) — never raw matchCatalog alone
      const local = pinsFromFreeTextSearch(trimmed, intent.profile, 8)
      const pins = local.length ? local.map((h) => h.id) : []
      setPinnedIds(pins)
      // Show suggested cards only at first so the left column clearly changes
      setOnlyAi(pins.length > 0)
      setChatPrompt(trimmed)
      // Desktop: open match panel; mobile: keep list primary
      const preferChat =
        typeof window !== 'undefined' ? window.matchMedia('(min-width: 901px)').matches : true
      setForceChatOpen(preferChat)
      navigate('/matches')
      window.requestAnimationFrame(() => {
        window.scrollTo(0, 0)
        document.getElementById('main-content')?.scrollTo?.(0, 0)
      })
    },
    [navigate, profile],
  )

  /**
   * Apply About you / onboarding profile: pin matches, open Matches (for-you list).
   * Does NOT over-filter to state-only (that hid the list after onboarding).
   */
  const applyProfileSearch = useCallback(
    (next: Profile, options?: { to?: string }) => {
      const plan = buildProfileSearchPlan(next, 8)
      setProfileState(next)
      track({ type: 'search', q: `profile:${plan.searchText}`.slice(0, 120), at: Date.now() })
      const pins = plan.pins.map((h) => h.id)
      setPinnedIds(pins)
      setOnlyShort(false)
      // Suggested mode for Results if user browses catalog next
      setOnlyAi(pins.length > 0)
      setListFilter('')
      setUrgencyFilter('all')
      setSort('match')
      setAmountBucket('all')
      setEssayFilter('all')
      setCategoryId(plan.categoryId)
      setLastSearchLabel(plan.displayLabel)
      setHeaderQuery(plan.searchText)
      // Prefer chat open on desktop only — match panel steals half the mobile viewport
      const preferChat =
        typeof window !== 'undefined' ? window.matchMedia('(min-width: 901px)').matches : true
      setForceChatOpen(preferChat)
      if (preferChat) setChatPrompt(plan.searchText)
      navigate(options?.to || '/matches')
      window.requestAnimationFrame(() => {
        window.scrollTo(0, 0)
        document.getElementById('main-content')?.scrollTo?.(0, 0)
      })
    },
    [navigate],
  )

  const handlePinMatches = useCallback(
    (ids: string[], saveToList = false) => {
      setPinnedIds((prev) => Array.from(new Set([...prev, ...ids])))
      if (saveToList) {
        setShortlist((prev) => Array.from(new Set([...ids, ...prev])))
        for (const id of ids) track({ type: 'save', id, at: Date.now() })
      }
      setOnlyShort(false)
      setOnlyAi(false)
      navigate('/matches')
    },
    [navigate],
  )

  const toggleSave = useCallback((id: string) => {
    setShortlist((prev) => {
      const saved = prev.includes(id)
      track({ type: saved ? 'unsave' : 'save', id, at: Date.now() })
      return saved ? prev.filter((x) => x !== id) : [...prev, id]
    })
  }, [])

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 4) return prev
      const next = [...prev, id]
      if (next.length >= 2) track({ type: 'compare', count: next.length, at: Date.now() })
      return next
    })
  }, [])

  /** Always open match panel with a contextual prompt (mobile + desktop). */
  const askAi = useCallback((prompt: string) => {
    const trimmed = prompt.trim()
    if (!trimmed) return
    track({ type: 'search', q: `ai:${trimmed.slice(0, 100)}`, at: Date.now() })
    setForceChatOpen(true)
    setChatPrompt(trimmed)
  }, [])

  const value: ScholarshipContextValue = {
    profile,
    setProfile,
    shortlist,
    applyMap,
    notes,
    checklist,
    recent,
    savedSearches,
    listFilter,
    setListFilter,
    categoryId,
    setCategoryId: (id) => {
      setCategoryId(id)
      track({ type: 'category', id, at: Date.now() })
    },
    urgencyFilter,
    setUrgencyFilter,
    sort,
    setSort,
    amountBucket,
    setAmountBucket,
    essayFilter,
    setEssayFilter,
    onlyShort,
    setOnlyShort,
    onlyAi,
    setOnlyAi,
    pinnedIds,
    compareIds,
    lastSearchLabel,
    headerQuery,
    chatPrompt,
    clearChatPrompt: () => setChatPrompt(null),
    forceChatOpen,
    showOnboarding,
    skipOnboarding: () => setShowOnboarding(false),
    restartOnboarding: () => {
      setShowOnboarding(true)
      window.requestAnimationFrame(() => {
        window.scrollTo(0, 0)
        document.getElementById('main-content')?.scrollTo?.(0, 0)
      })
    },
    ranked,
    categoryCounts: counts,
    dueSoonInCatalog,
    dueSoonSaved,
    inProgressCount,
    submittedCount,
    pipelineItems,
    runSearch,
    applyProfileSearch,
    handlePinMatches,
    toggleSave,
    toggleCompare,
    clearCompare: () => setCompareIds([]),
    removeCompare: (id) => setCompareIds((prev) => prev.filter((x) => x !== id)),
    clearSuggestions: () => {
      setPinnedIds([])
      setLastSearchLabel(null)
      setOnlyAi(false)
    },
    clearFilters,
    setApplyStatus: (id, status) => {
      setApplyMap((m) => setStatusFor(m, id, status))
      track({ type: 'pipeline_move', id, status, at: Date.now() })
    },
    setNoteFor: (id, note) => setNotes((m) => setNote(m, id, note)),
    toggleChecklistStep: (id, stepId) => setChecklist((m) => toggleCheckStep(m, id, stepId)),
    markOfficialOpen: (id) => {
      track({ type: 'official_click', id, at: Date.now() })
      setRecent((r) => pushRecentlyViewed(r, id))
    },
    saveCurrentSearch: (name) => {
      setSavedSearches(
        upsertSavedSearch({
          name,
          query: listFilter,
          tag: categoryId,
          urgency: urgencyFilter,
          sort,
          onlyShort,
          profile,
        }),
      )
    },
    restoreSearch: (search) => {
      setListFilter(search.query)
      setCategoryId(search.tag || 'all')
      setUrgencyFilter((search.urgency as UrgencyFilter) || 'all')
      setSort((search.sort as SortMode) || 'match')
      setOnlyShort(search.onlyShort)
      setProfileState(search.profile)
      setOnlyAi(false)
      setHeaderQuery(search.query || search.name)
      navigate('/results')
    },
    removeSavedSearch: (id) => setSavedSearches(deleteSavedSearch(id)),
    restoreBackup: (data) => {
      setProfileState(data.profile)
      setShortlist(data.shortlist || [])
      setApplyMap(data.applyMap || {})
      setNotes(data.notes || {})
      setChecklist(data.checklist || {})
      setSavedSearches(data.savedSearches || [])
      setRecent(data.recentlyViewed || [])
    },
    restoreSharePack: (pack) => {
      setProfileState(pack.profile)
      setShortlist(pack.shortlist || [])
      if (pack.applyMap) setApplyMap(pack.applyMap)
      track({ type: 'search', q: 'import:share-pack', at: Date.now() })
    },
    completeOnboarding: (next) => {
      // Close modal first so user sees Matches (for-you), not a raw 69-row catalog
      setShowOnboarding(false)
      applyProfileSearch(next, { to: '/matches' })
    },
    askAi,
    setCompareSelection: (ids) => {
      setCompareIds(ids.slice(0, 4))
      if (ids.length >= 2) track({ type: 'compare', count: ids.length, at: Date.now() })
    },
  }

  return <ScholarshipContext.Provider value={value}>{children}</ScholarshipContext.Provider>
}

/** Access shared scholarship state from any page. */
export function useScholarship(): ScholarshipContextValue {
  const ctx = useContext(ScholarshipContext)
  if (!ctx) throw new Error('useScholarship must be used within ScholarshipProvider')
  return ctx
}
