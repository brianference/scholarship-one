/**
 * Unit tests for the finder's verification rules. Run: npx tsx scripts/qa-finder-verify.ts
 *
 * The page below is a synthetic FIXTURE for exercising the rules, not a real award and never
 * stored anywhere. The point of this file is the bad inputs: each one must be REJECTED for its
 * own reason, because a validator that only ever sees good input proves nothing.
 */
import {
  appearsVerbatim,
  htmlToText,
  isAggregatorUrl,
  isSafePublicUrl,
  nameKey,
  normalizeUrlKey,
  parseDeadlineIso,
  verifyCandidate,
  webId,
  type Candidate,
} from '../functions/_lib/finder/verify'

let failures = 0
function check(name: string, cond: boolean, extra = '') {
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${cond ? '' : extra ? ' -> ' + extra : ''}`)
  if (!cond) failures++
}

const TODAY = '2026-11-04'
const VOCAB = new Set(['undergrad', 'grad', 'nursing', 'stem', 'need-based', 'women', 'arizona'])
const URL_OK = 'https://foundation.example.org/awards/rivera-nursing'

const PAGE = htmlToText(`<html><head><style>.x{color:red}</style><script>var amount="$99,999"</script></head><body>
  <h1>Rivera Nursing Scholarship</h1>
  <p>The Rivera Nursing Scholarship supports undergraduate nursing students who demonstrate financial need.</p>
  <p>Award amount: $5,000 per year. Applications close on March 1, 2027. Recipients are notified in May.</p>
  <p>Applicants must be enrolled full time and live in Arizona. Please read the full eligibility guidelines before applying online.</p>
  <p>Our foundation has supported students across the state for many years and welcomes first-time applicants.</p>
</body></html>`)

const GOOD: Candidate = {
  name: 'Rivera Nursing Scholarship',
  amount: '$5,000 per year',
  deadline: 'March 1, 2027',
  summaryQuote: 'supports undergraduate nursing students who demonstrate financial need',
  tags: ['undergrad', 'nursing', 'need-based', 'made-up-tag'],
}

const run = (c: Partial<Candidate>, url = URL_OK, page = PAGE) => verifyCandidate({ ...GOOD, ...c }, page, url, TODAY, VOCAB)
const reasonOf = (v: ReturnType<typeof run>) => (v.ok ? 'ACCEPTED' : v.reason)

// ---- the good case, and what it keeps ----
const good = run({})
check('good candidate is accepted', good.ok)
if (good.ok) {
  check('deadline stored as ISO', good.award.deadline === '2027-03-01', good.award.deadline)
  check('unknown tag dropped, valid tags kept', good.award.tags.join(',') === 'undergrad,nursing,need-based', good.award.tags.join(','))
  check('summary is the page quote, verbatim', good.award.summary === GOOD.summaryQuote)
}
check('script and style content is not page text', !PAGE.includes('99,999') && !PAGE.includes('color:red'))

// ---- the bad cases: each must fail for its own reason ----
const bad: [string, Partial<Candidate>, RegExp, string?][] = [
  ['invented amount', { amount: '$25,000 per year' }, /amount not on page/],
  ['amount only in a script block', { amount: '$99,999' }, /amount not on page/],
  ['invented name', { name: 'Garcia Nursing Scholarship' }, /name not on page/],
  ['invented deadline', { deadline: 'April 15, 2027' }, /deadline not on page/],
  ['deadline already passed', { deadline: 'March 1, 2027' }, /deadline already passed/, '2027-06-01'],
  ['deadline without a year', { deadline: 'March 1' }, /deadline not on page|neither a dated day/],
  ['invented summary', { summaryQuote: 'a generous award that changes lives for every nursing student in America' }, /summary quote not on page/],
  ['summary too short', { summaryQuote: 'supports nursing' }, /summary quote length/],
  ['only one valid tag', { tags: ['undergrad', 'made-up-tag'] }, /fewer than two valid tags/],
  ['no school-level tag', { tags: ['nursing', 'need-based'] }, /no school-level tag/],
  ['amount with no figure', { amount: 'per year' }, /amount has no figure/],
]
for (const [name, patch, re, today] of bad) {
  const v = today
    ? verifyCandidate({ ...GOOD, ...patch }, PAGE, URL_OK, today, VOCAB)
    : run(patch)
  check(`rejects ${name}`, !v.ok && re.test(v.reason), reasonOf(v))
}
check('rejects an aggregator host', reasonOf(run({}, 'https://www.fastweb.com/college-scholarships/rivera')) === 'aggregator or social host, not the provider')
check('rejects a reddit thread', !run({}, 'https://www.reddit.com/r/scholarships/comments/x').ok)
check('rejects http', reasonOf(run({}, 'http://foundation.example.org/a')) === 'unsafe url')
check('rejects a thin page', reasonOf(run({}, URL_OK, 'Rivera Nursing Scholarship $5,000 per year March 1, 2027')) === 'page text too short to verify')
check('rolling phrase is accepted only when on the page', (() => {
  const page = PAGE + ' Applications are accepted on a rolling basis throughout the year for all eligible students.'
  const ok = run({ deadline: 'rolling basis' }, URL_OK, page)
  const no = run({ deadline: 'rolling basis' })
  return ok.ok && ok.award.deadline === 'Rolling (check portal)' && !no.ok
})())

// ---- helpers ----
check('parses "March 1, 2027"', parseDeadlineIso('March 1, 2027') === '2027-03-01')
check('parses "Mar. 1st, 2027"', parseDeadlineIso('Mar. 1st, 2027') === '2027-03-01')
check('parses ISO', parseDeadlineIso('2027-03-01') === '2027-03-01')
check('parses 3/1/2027', parseDeadlineIso('3/1/2027') === '2027-03-01')
check('rejects Feb 31 (rollover)', parseDeadlineIso('February 31, 2027') === null)
check('rejects 2027-02-31', parseDeadlineIso('2027-02-31') === null)
check('no year -> null', parseDeadlineIso('March 1') === null)
check('curly quotes and dashes normalize', appearsVerbatim('it’s a – test', "it's a - test of the page"))
check('case and spacing normalize', appearsVerbatim('  RIVERA   nursing ', 'the rivera nursing scholarship'))
check('too-short needle never matches', !appearsVerbatim('ab', 'abab'))
for (const bad of ['https://localhost/a', 'https://10.0.0.5/a', 'https://192.168.1.1/a', 'https://[::1]/a', 'https://intranet/a', 'https://user:pw@example.org/a', 'https://example.org:8443/a', 'ftp://example.org/a', 'not a url']) {
  check(`unsafe url blocked: ${bad}`, !isSafePublicUrl(bad))
}
check('plain https page is safe', isSafePublicUrl('https://www.example.org/a?b=1'))
check('subdomain of an aggregator is flagged', isAggregatorUrl('https://m.fastweb.com/x'))
check('url key ignores www, query, hash, trailing slash, case', normalizeUrlKey('https://WWW.Example.org/Awards/X/?utm=1#top') === normalizeUrlKey('https://example.org/awards/x'))
check('webId is stable and distinct', webId('a.org/x') === webId('a.org/x') && webId('a.org/x') !== webId('a.org/y') && /^web-[0-9a-f]{16}$/.test(webId('a.org/x')))
check('webId differs across many similar urls (no 32-bit collisions)', (() => {
  const ids = new Set(Array.from({ length: 20000 }, (_, i) => webId(`foundation.example.org/awards/item-${i}`)))
  return ids.size === 20000
})())

// ---- hardening found in review: each of these must be rejected for its own reason ----
const padded = (extra: string) => htmlToText(`<html><body>${extra}<p>${'Please read the full eligibility guidelines before applying online. '.repeat(8)}</p></body></html>`)
const tokenPage = padded(
  '<h1>Rivera Nursing Scholarship</h1><p>The Rivera Nursing Scholarship supports undergraduate nursing students who demonstrate financial need.</p><p>Total pool: $5,000,000 across all awards. Deadline March 1, 2027.</p>',
)
check('"$5,000" is not found inside "$5,000,000"', reasonOf(run({ amount: '$5,000', deadline: 'March 1, 2027' }, URL_OK, tokenPage)) === 'amount not on page', reasonOf(run({ amount: '$5,000', deadline: 'March 1, 2027' }, URL_OK, tokenPage)))
const scrollPage = padded(
  '<h1>Rivera Nursing Scholarship</h1><p>The Rivera Nursing Scholarship supports undergraduate nursing students who demonstrate financial need. Award amount: $5,000 per year.</p><p>Keep scrolling for more news. Rolling admissions at our partner campus.</p>',
)
check('"rolling" is not found inside "scrolling"', reasonOf(run({ deadline: 'scrolling' }, URL_OK, scrollPage)) !== 'ACCEPTED')
check('a "rolling" deadline needs the word on its own', (() => {
  const noRolling = padded('<h1>Rivera Nursing Scholarship</h1><p>The Rivera Nursing Scholarship supports undergraduate nursing students who demonstrate financial need. Award amount: $5,000 per year. Keep scrolling for more news.</p>')
  return !run({ deadline: 'scrolling' }, URL_OK, noRolling).ok
})())

const farFiller = 'Unrelated news and event listings for the whole region. '.repeat(120)
const farPage = padded(`<h1>Rivera Nursing Scholarship</h1><p>The Rivera Nursing Scholarship supports undergraduate nursing students who demonstrate financial need.</p><p>${farFiller}</p><p>Our spring gala is on March 1, 2027 and tickets are $5,000 per table.</p>`)
check('an amount far from the award name is rejected', reasonOf(run({ amount: '$5,000 per table' }, URL_OK, farPage)) === 'amount not near the award name', reasonOf(run({ amount: '$5,000 per table' }, URL_OK, farPage)))
check('a deadline far from the award name is rejected', (() => {
  // The amount is stated next to the name; only the deadline sits far away, in the gala sentence.
  const page = padded(`<h1>Rivera Nursing Scholarship</h1><p>The Rivera Nursing Scholarship supports undergraduate nursing students who demonstrate financial need. Award amount: $5,000 per year.</p><p>${farFiller}</p><p>Our spring gala is on March 1, 2027.</p>`)
  return reasonOf(run({}, URL_OK, page)) === 'deadline not near the award name'
})())

check('a tag the page does not support is dropped (black)', (() => {
  const v = run({ tags: ['undergrad', 'nursing', 'black', 'need-based'] })
  return v.ok && !v.award.tags.includes('black')
})())
check('an identity tag with no support can leave too few tags', reasonOf(run({ tags: ['undergrad', 'black', 'hispanic'] })) === 'fewer than two valid tags')
check('a level tag the page does not support is rejected (grad on an undergraduate page)', /fewer than two valid tags|no school-level tag/.test(reasonOf(run({ tags: ['grad', 'nursing'] }))), reasonOf(run({ tags: ['grad', 'nursing'] })))

check('a throwaway .com host unrelated to the award is rejected', /host does not look like the award provider/.test(reasonOf(run({}, 'https://best-college-money-2027.com/rivera'))), reasonOf(run({}, 'https://best-college-money-2027.com/rivera')))
check('a .com host named for the award is accepted', run({}, 'https://riveranursing.com/apply').ok)
check('a .edu host is accepted', run({}, 'https://financialaid.example.edu/rivera').ok)
check('"Grantham" does not make a page a grant', reasonOf(run({ name: 'Grantham Nursing Prize' }, URL_OK, padded('<h1>Grantham Nursing Prize</h1><p>The Grantham Nursing Prize supports undergraduate nursing students who demonstrate financial need. Prize amount: $5,000 per year. Deadline March 1, 2027.</p>'))) === 'not described as a scholarship, grant, fellowship or award')
check('text hidden with display:none does not count', (() => {
  const hidden = htmlToText('<html><body><h1>Some page</h1><div style="display:none">Rivera Nursing Scholarship $5,000 per year March 1, 2027 supports undergraduate nursing students who demonstrate financial need</div><p>' + 'Filler sentence about nothing at all. '.repeat(20) + '</p></body></html>')
  return !hidden.includes('Rivera') && reasonOf(run({}, URL_OK, hidden)) !== 'ACCEPTED'
})())
check('aria-hidden text does not count', !htmlToText('<p aria-hidden="true">secret planted words</p><p>visible</p>').includes('planted'))
check('nameKey ignores filler words and punctuation', nameKey('The Rivera Nursing Scholarship Program') === nameKey('rivera nursing'))

console.log(`\n${failures === 0 ? 'ALL CLEAN' : failures + ' FAILURES'}`)
process.exit(failures === 0 ? 0 : 1)
