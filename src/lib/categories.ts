/**
 * Human browse categories for the results board.
 * Each category maps to one or more catalog tags (any-tag match).
 */
export type BrowseCategory = {
  id: string
  label: string
  /** Empty = match all */
  tags: string[]
  description: string
}

export const BROWSE_CATEGORIES: BrowseCategory[] = [
  {
    id: 'all',
    label: 'All',
    tags: [],
    description: 'Full catalog',
  },
  {
    id: 'stem',
    label: 'STEM & math',
    tags: ['stem', 'engineering', 'computer-science', 'science', 'math'],
    description: 'Engineering, CS, math, science',
  },
  {
    id: 'nursing',
    label: 'Nursing',
    tags: ['nursing', 'healthcare'],
    description: 'Nursing and healthcare programs',
  },
  {
    id: 'sports',
    label: 'Sports',
    tags: ['sports', 'athletics', 'athlete', 'ncaa'],
    description: 'Student-athletes and athletics pathways',
  },
  {
    id: 'disability',
    label: 'Disability',
    tags: ['disability', 'disabled', 'accessibility', 'blind', 'deaf'],
    description: 'Students with disabilities',
  },
  {
    id: 'black',
    label: 'Black students',
    tags: ['black', 'african-american'],
    description: 'Black and African American students',
  },
  {
    id: 'hispanic',
    label: 'Hispanic / Latino',
    tags: ['hispanic', 'latino', 'latina', 'mexican'],
    description: 'Hispanic, Latino, Latina, Mexican students',
  },
  {
    id: 'women',
    label: 'Women',
    tags: ['women'],
    description: 'Women and girls',
  },
  {
    id: 'need',
    label: 'Need / FAFSA',
    tags: ['need-based', 'pell-eligible', 'federal'],
    description: 'Need-based aid and federal gateways',
  },
  {
    id: 'high-school',
    label: 'High school',
    tags: ['high-school'],
    description: 'High school seniors and rising first-years',
  },
  {
    id: 'business',
    label: 'Business',
    tags: ['business', 'marketing', 'accounting'],
    description: 'Business, marketing, accounting',
  },
  {
    id: 'first-gen',
    label: 'First-gen',
    tags: ['first-gen', 'need-based', 'all-majors'],
    description: 'Often a good fit for first-generation students',
  },
  {
    id: 'state',
    label: 'State / regional',
    tags: [
      'state',
      'california',
      'texas',
      'florida',
      'illinois',
      'new-york',
      'washington',
      'arizona',
      'georgia',
      'ohio',
      'pennsylvania',
      'massachusetts',
      'oregon',
      'michigan',
      'colorado',
      'north-carolina',
      'virginia',
      'new-jersey',
      'minnesota',
    ],
    description: 'State grants and regional programs',
  },
]

/** True when a catalog item belongs to the selected browse category. */
export function itemMatchesCategory(itemTags: readonly string[], categoryId: string): boolean {
  if (!categoryId || categoryId === 'all') return true
  const cat = BROWSE_CATEGORIES.find((c) => c.id === categoryId)
  if (!cat || !cat.tags.length) return true
  const normalized = itemTags.map((t) => t.toLowerCase())
  return cat.tags.some((t) => normalized.includes(t.toLowerCase()))
}

export function categoryLabel(categoryId: string): string {
  return BROWSE_CATEGORIES.find((c) => c.id === categoryId)?.label || 'All'
}
