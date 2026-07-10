import type { Profile } from './profile'

/**
 * Map a tappable chat chip to profile field updates when possible.
 */
export function applyChipToProfile(profile: Profile, chip: string): Profile {
  const c = chip.toLowerCase()
  const next = { ...profile }

  if (/high school/.test(c)) next.level = 'high-school'
  else if (/community college/.test(c)) next.level = 'community-college'
  else if (/graduate|professional/.test(c)) next.level = 'grad'
  else if (/undergrad/.test(c)) next.level = 'undergrad'

  if (/nursing/.test(c)) next.major = 'nursing'
  else if (/computer science/.test(c)) next.major = 'computer-science'
  else if (/\bmath\b|mathematics/.test(c)) next.major = 'math'
  else if (/engineer|stem/.test(c)) next.major = 'engineering'
  else if (/marketing/.test(c)) next.major = 'marketing'
  else if (/accounting/.test(c)) next.major = 'accounting'
  else if (/business/.test(c)) next.major = 'business'
  else if (/education/.test(c)) next.major = 'education'
  else if (/arts|design/.test(c)) next.major = 'arts'
  else if (/track|sport|athletic|athlete/.test(c)) next.major = 'sports'
  else if (/healthcare/.test(c)) next.major = 'healthcare'
  else if (/social science/.test(c)) next.major = 'social-science'
  else if (/undecided/.test(c)) next.major = 'any'

  if (/black|african american/.test(c)) next.identity = 'black'
  else if (/hispanic|latino|mexican|latina/.test(c)) next.identity = 'hispanic'
  else if (/woman|female|women/.test(c)) next.identity = 'women'
  else if (/disabilit|disabled|handicap|accessibility/.test(c)) next.identity = 'disability'
  else if (/first-generation|first generation|first-gen|first gen/.test(c)) next.identity = 'first-gen'
  else if (/asian|pacific|aanhpi|apia/.test(c)) next.identity = 'asian'
  else if (/native american|indigenous/.test(c)) next.identity = 'native'
  else if (/lgbtq|lgbt|queer|gay|lesbian|trans/.test(c)) next.identity = 'lgbtq'
  else if (/military|veteran|spouse|army|navy|marine|air force/.test(c)) next.identity = 'military'
  else if (/daca|undocumented|dreamer|dream\.us|thedream/.test(c)) next.identity = 'undocumented'

  if (/need-based|fafsa|pell/.test(c)) next.need = 'need'
  else if (/merit-based|merit/.test(c) && !/need/.test(c)) next.need = 'merit'

  // State names (profile.state values)
  const stateMap: [RegExp, string][] = [
    [/\bcalifornia\b|\bcal grant\b/, 'california'],
    [/\btexas\b/, 'texas'],
    [/\bflorida\b|\bbright futures\b/, 'florida'],
    [/\billinois\b/, 'illinois'],
    [/\bnew york\b|\bexcelsior\b/, 'new-york'],
    [/\bwashington\b/, 'washington'],
    [/\barizona\b/, 'arizona'],
    [/\bgeorgia\b|\bhope\b/, 'georgia'],
    [/\bohio\b/, 'ohio'],
    [/\bpennsylvania\b/, 'pennsylvania'],
    [/\bmassachusetts\b|\bmassgrant\b/, 'massachusetts'],
    [/\boregon\b/, 'oregon'],
    [/\bmichigan\b/, 'michigan'],
    [/\bcolorado\b/, 'colorado'],
    [/\bnorth carolina\b/, 'north-carolina'],
    [/\bvirginia\b/, 'virginia'],
    [/\bnew jersey\b/, 'new-jersey'],
    [/\bminnesota\b/, 'minnesota'],
  ]
  for (const [re, value] of stateMap) {
    if (re.test(c)) {
      next.state = value
      break
    }
  }

  return next
}
