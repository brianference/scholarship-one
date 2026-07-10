import { CATALOG } from '../data/catalog'
import type { Profile } from './profile'
import { profileSummary } from './profile'

/**
 * Build chat grounding payload: catalog + optional live profile for smarter LLM replies.
 */
export function buildChatContext(profile?: Profile): string {
  const programs = CATALOG.map((item) => ({
    id: item.id,
    name: item.name,
    amount: item.amount,
    deadline: item.deadline,
    tags: item.tags,
    url: item.url,
    summary: item.summary,
  }))
  return JSON.stringify(
    {
      product: 'Scholarship One',
      rule: 'Only recommend programs listed in catalog. Never invent scholarships, amounts, or deadlines.',
      userProfile: profile ? profileSummary(profile) : null,
      catalogCount: programs.length,
      catalog: programs,
    },
    null,
    0,
  )
}
