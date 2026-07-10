/** Shared option lists for profile form and Scholarship match chips. */

export const LEVEL_OPTIONS = [
  { value: 'high-school', label: 'High school senior' },
  { value: 'undergrad', label: 'Undergraduate' },
  { value: 'grad', label: 'Graduate / professional' },
  { value: 'community-college', label: 'Community college' },
] as const

export const MAJOR_OPTIONS = [
  { value: 'any', label: 'Any / undecided' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'engineering', label: 'Engineering / STEM' },
  { value: 'computer-science', label: 'Computer science' },
  { value: 'math', label: 'Math' },
  { value: 'business', label: 'Business' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'education', label: 'Education' },
  { value: 'arts', label: 'Arts / design' },
  { value: 'sports', label: 'Sports / athletics' },
  { value: 'healthcare', label: 'Healthcare (non-nursing)' },
  { value: 'social-science', label: 'Social sciences' },
] as const

export const IDENTITY_OPTIONS = [
  { value: 'any', label: 'No preference' },
  { value: 'black', label: 'Black / African American' },
  { value: 'hispanic', label: 'Hispanic / Latino / Mexican' },
  { value: 'women', label: 'Women / female students' },
  { value: 'disability', label: 'Student with a disability' },
  { value: 'first-gen', label: 'First-generation college' },
  { value: 'asian', label: 'Asian / Pacific Islander' },
  { value: 'native', label: 'Native American / Indigenous' },
  { value: 'lgbtq', label: 'LGBTQ+' },
  { value: 'military', label: 'Military family / veteran' },
  { value: 'undocumented', label: 'DACA / undocumented' },
] as const

export const NEED_OPTIONS = [
  { value: 'any', label: 'Any aid type' },
  { value: 'need', label: 'Need-based' },
  { value: 'merit', label: 'Merit-based' },
  { value: 'both', label: 'Need and merit' },
] as const

export const STATE_OPTIONS = [
  { value: 'any', label: 'Any state' },
  { value: 'arizona', label: 'Arizona' },
  { value: 'california', label: 'California' },
  { value: 'colorado', label: 'Colorado' },
  { value: 'florida', label: 'Florida' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'illinois', label: 'Illinois' },
  { value: 'massachusetts', label: 'Massachusetts' },
  { value: 'michigan', label: 'Michigan' },
  { value: 'minnesota', label: 'Minnesota' },
  { value: 'new-jersey', label: 'New Jersey' },
  { value: 'new-york', label: 'New York' },
  { value: 'north-carolina', label: 'North Carolina' },
  { value: 'ohio', label: 'Ohio' },
  { value: 'oregon', label: 'Oregon' },
  { value: 'pennsylvania', label: 'Pennsylvania' },
  { value: 'texas', label: 'Texas' },
  { value: 'virginia', label: 'Virginia' },
  { value: 'washington', label: 'Washington' },
] as const

/** Chip groups shown in Scholarship match when we need more detail. */
export const CHAT_OPTION_GROUPS: { title: string; chips: string[] }[] = [
  {
    title: 'School level',
    chips: ['High school senior', 'Undergraduate', 'Graduate student', 'Community college'],
  },
  {
    title: 'Major or field',
    chips: [
      'Nursing',
      'Engineering / STEM',
      'Computer science',
      'Math',
      'Business',
      'Marketing',
      'Education',
      'Sports / athletics',
      'Track & field',
      'Arts / design',
      'Undecided major',
    ],
  },
  {
    title: 'Background',
    chips: [
      'Black / African American',
      'Hispanic / Latino / Mexican',
      'Woman / female student',
      'Student with a disability',
      'First-generation college',
      'Student athlete',
    ],
  },
  {
    title: 'Needs',
    chips: ['Need-based aid', 'Merit-based', 'FAFSA / Pell', 'Deadline soon', 'No essay preferred'],
  },
]

export const DEFAULT_CLARIFY_CHIPS = CHAT_OPTION_GROUPS.flatMap((g) => g.chips).slice(0, 12)
