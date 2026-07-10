import { useEffect, useMemo, useState } from 'react'
import type { SiteConfig } from '../config/site'
import { Shell } from '../components/Shell'
import { CATALOG } from '../data/catalog'
import { loadProfile, loadShortlist, saveProfile, saveShortlist, type Profile } from '../lib/profile'
import { scoreItem } from '../lib/scoring'
import { urgency } from '../lib/urgency'
import { ScholarshipCard } from '../features/matcher/ScholarshipCard'
import { ProfilePanel } from '../features/matcher/ProfilePanel'
import { MatcherFilters } from '../features/matcher/MatcherFilters'

export type ProductPageProps = { config: SiteConfig }

/**
 * Matcher workspace.
 * Domain logic: lib/* · presentation: features/matcher/* · shell: components/Shell.
 */
export function ProductPage({ config }: ProductPageProps) {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('all')
  const [profile, setProfile] = useState<Profile>(loadProfile)
  const [shortlist, setShortlist] = useState<string[]>(loadShortlist)
  const [onlyShort, setOnlyShort] = useState(false)

  useEffect(() => {
    saveProfile(profile)
  }, [profile])

  useEffect(() => {
    saveShortlist(shortlist)
  }, [shortlist])

  const tags = useMemo(() => {
    const set = new Set<string>()
    CATALOG.forEach((item) => item.tags.forEach((value) => set.add(value)))
    return ['all', ...Array.from(set).sort()]
  }, [])

  const ranked = useMemo(() => {
    return CATALOG.map((item) => ({
      ...item,
      score: scoreItem(item.tags, profile),
      urg: urgency(item.deadline),
    }))
      .filter((item) => {
        const okTag = tag === 'all' || item.tags.includes(tag)
        const okQuery = !query || `${item.name} ${item.summary}`.toLowerCase().includes(query.toLowerCase())
        const okShort = !onlyShort || shortlist.includes(item.id)
        return okTag && okQuery && okShort
      })
      .sort((a, b) => b.score - a.score)
  }, [query, tag, profile, onlyShort, shortlist])

  return (
    <Shell config={config}>
      <section className="panel">
        <h1>Scholarship matcher</h1>
        <p className="lede">Ranked from your profile. Every program has an official URL — nothing invented.</p>
        <ProfilePanel profile={profile} onChange={setProfile} />
        <MatcherFilters
          query={query}
          onQueryChange={setQuery}
          tag={tag}
          onTagChange={setTag}
          tags={tags}
          onlyShort={onlyShort}
          onOnlyShortChange={setOnlyShort}
          shortlistCount={shortlist.length}
        />
        {onlyShort && shortlist.length === 0 ? (
          <p className="lede empty-hint">Your shortlist is empty — star a program to save it on this device.</p>
        ) : null}
        <div className="list">
          {ranked.map((item) => (
            <ScholarshipCard
              key={item.id}
              item={item}
              saved={shortlist.includes(item.id)}
              onToggleSave={() =>
                setShortlist((prev) => (prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]))
              }
            />
          ))}
        </div>
      </section>
    </Shell>
  )
}
