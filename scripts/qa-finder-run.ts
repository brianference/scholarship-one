/**
 * End-to-end test of the finder pipeline with a fake search engine, fake pages and a fake model.
 * Run: npx tsx scripts/qa-finder-run.ts
 *
 * What it proves: a good page is listed; a page where the model invents a figure, a list page,
 * an aggregator, an already-known award and a duplicate name are all rejected; nothing is
 * written to the database for a rejected page. The pages are synthetic fixtures, not real awards.
 */
import { CATALOG } from '../src/data/catalog'
import { runFinder, todayIso } from '../functions/_lib/finder/run'
import { parseDuckDuckGo, searchWeb } from '../functions/_lib/finder/search'
import type { Env } from '../functions/_lib/types'

let failures = 0
function check(name: string, cond: boolean, extra = '') {
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${cond ? '' : extra ? ' -> ' + extra : ''}`)
  if (!cond) failures++
}

const YEAR = Number(todayIso().slice(0, 4)) + 1
const FILLER =
  'Our foundation has supported students across the state for many years and welcomes first-time applicants. Please read the full eligibility guidelines before applying online.'

const page = (body: string) =>
  `<html><head><title>x</title><script>var a=1</script></head><body>${body}<p>${FILLER}</p><p>${FILLER}</p></body></html>`

const PAGES: Record<string, string> = {
  'https://good.example.org/awards/lopez-nursing': page(
    `<h1>Lopez Nursing Scholarship</h1><p>The Lopez Nursing Scholarship supports undergraduate nursing students who demonstrate financial need.</p><p>Award amount: $4,500 per year. Applications close on March 1, ${YEAR}.</p>`,
  ),
  'https://liar.example.org/awards/park-stem': page(
    `<h1>Park STEM Scholarship</h1><p>The Park STEM Scholarship supports undergraduate engineering students who live in Arizona.</p><p>Award amount: $2,000. Applications close on April 10, ${YEAR}.</p>`,
  ),
  'https://list.example.org/all-awards': page(`<h1>Twelve scholarships you can apply for</h1><p>Browse the list below.</p>`),
  'https://dupe.example.org/awards/lopez-nursing-again': page(
    `<h1>Lopez Nursing Scholarship</h1><p>The Lopez Nursing Scholarship supports undergraduate nursing students who demonstrate financial need.</p><p>Award amount: $4,500 per year. Applications close on March 1, ${YEAR}.</p>`,
  ),
}
// A real catalog URL: must be skipped as already known without being fetched.
const KNOWN_URL = CATALOG[0].url
const AGG_URL = 'https://www.fastweb.com/college-scholarships/lopez'

const fetched: string[] = []
const modelCalls: string[] = []

/** Fake network: DuckDuckGo results, the pages above, and a model that answers per page. */
const fakeFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (url.startsWith('https://html.duckduckgo.com/html/')) {
    const hits = [KNOWN_URL, AGG_URL, ...Object.keys(PAGES)]
    const html = hits.map((h) => `<a rel="nofollow" class="result__a" href="${h}">Result</a>`).join('\n')
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } })
  }
  if (url === 'https://api.openai.com/v1/chat/completions') {
    const body = JSON.parse(String(init?.body)) as { messages: { content: string }[] }
    const text = body.messages[1].content
    modelCalls.push(text.slice(0, 40))
    let out: Record<string, unknown> = { isScholarship: false }
    if (text.includes('Lopez Nursing Scholarship')) {
      out = {
        isScholarship: true,
        name: 'Lopez Nursing Scholarship',
        amount: '$4,500 per year',
        deadline: `March 1, ${YEAR}`,
        summaryQuote: 'supports undergraduate nursing students who demonstrate financial need',
        tags: ['undergrad', 'nursing', 'need-based', 'not-a-real-tag'],
      }
    } else if (text.includes('Park STEM Scholarship')) {
      // The model invents a bigger number than the page states.
      out = {
        isScholarship: true,
        name: 'Park STEM Scholarship',
        amount: '$20,000',
        deadline: `April 10, ${YEAR}`,
        summaryQuote: 'supports undergraduate engineering students who live in Arizona',
        tags: ['undergrad', 'engineering', 'arizona'],
      }
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(out) } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  fetched.push(url)
  const html = PAGES[url]
  if (!html) return new Response('not found', { status: 404 })
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

/** The smallest D1 stand-in the finder touches: one table, insert-or-ignore, and a select. */
function fakeDb() {
  const rows: Record<string, unknown>[] = []
  const db = {
    rows,
    prepare(sql: string) {
      let args: unknown[] = []
      const stmt = {
        bind(...a: unknown[]) {
          args = a
          return stmt
        },
        async all() {
          return { results: rows.map((r) => ({ url: r.url, name: r.name })), success: true }
        },
        async first() {
          return null
        },
        async run() {
          if (/insert into discovered_scholarships/i.test(sql)) {
            // Like the real table: url and id are unique, a duplicate is an error.
            if (rows.some((r) => r.url === args[1] || r.id === args[0])) throw new Error('UNIQUE constraint failed: discovered_scholarships.url')
            rows.push({ id: args[0], url: args[1], name: args[2], amount: args[3], deadline: args[4], summary: args[5], tags: args[6], added_at: args[7], provider: args[9] })
          }
          return { success: true }
        },
      }
      return stmt
    },
    async batch() {
      return []
    },
  }
  return db
}

const db = fakeDb()
const env = { DB: db, OPENAI_API_KEY: 'test-key' } as unknown as Env

// the search layer on its own
check('parses direct DuckDuckGo result links', parseDuckDuckGo('<a class="result__a" href="https://a.org/x">A</a>')[0]?.url === 'https://a.org/x')
check('unwraps a DuckDuckGo redirect link', parseDuckDuckGo('<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fa.org%2Fx&amp;rut=1">A</a>')[0]?.url === 'https://a.org/x')
const noKeys = await searchWeb({ DB: db } as unknown as Env, 'nursing scholarship', fakeFetch)
check('with no API keys the keyless provider is used', noKeys.provider === 'duckduckgo' && noKeys.hits.length > 0, noKeys.provider)
let brokenFirecrawlCalls = 0
const fallback = await searchWeb({ DB: db, FIRECRAWL_API_KEY: 'k' } as unknown as Env, 'nursing scholarship', async (input, init) => {
  const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (u.startsWith('https://api.firecrawl.dev')) {
    brokenFirecrawlCalls++
    return new Response('boom', { status: 500 })
  }
  return fakeFetch(input, init)
})
check('a failing provider falls through to the next', brokenFirecrawlCalls === 1 && fallback.provider === 'duckduckgo' && fallback.errors.some((e) => e.includes('firecrawl 500')))

// the whole pass
const report = await runFinder(env, 'undergraduate nursing scholarship application', fakeFetch)
const reasonFor = (needle: string) => report.rejected.find((r) => r.url.includes(needle))?.reason ?? 'NOT REJECTED'

check('exactly one award is listed', report.added.length === 1, JSON.stringify(report.added.map((a) => a.name)))
check('the good page is the one listed', report.added[0]?.name === 'Lopez Nursing Scholarship' && report.added[0]?.url === 'https://good.example.org/awards/lopez-nursing')
check('its deadline is stored as ISO', report.added[0]?.deadline === `${YEAR}-03-01`, report.added[0]?.deadline)
check('unknown tags are dropped', report.added[0]?.tags.join() === 'undergrad,nursing,need-based', report.added[0]?.tags.join())
check('the database has that one row', db.rows.length === 1 && db.rows[0].name === 'Lopez Nursing Scholarship')
check('invented amount is rejected', reasonFor('liar.example') === 'amount not on page', reasonFor('liar.example'))
check('list page is rejected', /not one specific award/.test(reasonFor('list.example')), reasonFor('list.example'))
check('aggregator is rejected without being fetched', reasonFor('fastweb.com') === 'aggregator or social host' && !fetched.some((u) => u.includes('fastweb')))
check('award already in the catalog is skipped without being fetched', reasonFor(new URL(KNOWN_URL).hostname) === 'already known' && !fetched.includes(KNOWN_URL))
check('same award name on another page is rejected as a duplicate', reasonFor('dupe.example') === 'same award name already listed', reasonFor('dupe.example'))
check('rejected pages wrote nothing', !db.rows.some((r) => String(r.url).includes('liar') || String(r.url).includes('list.') || String(r.url).includes('dupe')))
check('at most 4 pages are read per call', fetched.length <= 4, String(fetched.length))

// run it again: nothing new, nothing duplicated
const second = await runFinder(env, 'undergraduate nursing scholarship application', fakeFetch)
check('a second pass adds nothing and duplicates nothing', second.added.length === 0 && db.rows.length === 1, `${second.added.length} added, ${db.rows.length} rows`)

// ---- hardening found in review ----
const GOOD_URL = 'https://good.example.org/awards/lopez-nursing'
const searchOnly = (hits: string[], pageFor: (url: string) => Response | undefined): typeof fetch => async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (url.startsWith('https://html.duckduckgo.com/html/')) {
    const html = hits.map((h) => `<a class="result__a" href="${h}">Result</a>`).join('\n')
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } })
  }
  const page = pageFor(url)
  return page ?? fakeFetch(input, init)
}

// a redirect to another host is not followed into the database
{
  const redirected = () => {
    const res = new Response(PAGES[GOOD_URL], { status: 200, headers: { 'content-type': 'text/html' } })
    Object.defineProperty(res, 'url', { value: 'https://elsewhere.example.net/landing' })
    return res
  }
  const r = await runFinder({ DB: fakeDb(), OPENAI_API_KEY: 'k' } as unknown as Env, 'redirect test query', searchOnly([GOOD_URL], (u) => (u === GOOD_URL ? redirected() : undefined)))
  check('a redirect to another host is rejected, nothing stored', r.added.length === 0 && r.rejected.some((x) => /redirected to another host/.test(x.reason)), JSON.stringify(r.rejected))
}

// a same-site redirect (www, path change) is allowed and the stored link is the page that answered
{
  const dbSame = fakeDb()
  const sameSite = () => {
    const res = new Response(PAGES[GOOD_URL], { status: 200, headers: { 'content-type': 'text/html' } })
    Object.defineProperty(res, 'url', { value: 'https://www.good.example.org/awards/lopez-nursing-2027' })
    return res
  }
  const r = await runFinder({ DB: dbSame, OPENAI_API_KEY: 'k' } as unknown as Env, 'same-site redirect query', searchOnly([GOOD_URL], (u) => (u === GOOD_URL ? sameSite() : undefined)))
  check('a same-site redirect is accepted and the final URL is stored', r.added.length === 1 && dbSame.rows[0]?.url === 'https://www.good.example.org/awards/lopez-nursing-2027', JSON.stringify(r.added))
}

// the database failing is reported, never thrown
{
  const brokenDb = { prepare() { throw new Error('no such table: discovered_scholarships') }, async batch() { return [] } }
  let threw = false
  let r: Awaited<ReturnType<typeof runFinder>> | null = null
  try {
    r = await runFinder({ DB: brokenDb, OPENAI_API_KEY: 'k' } as unknown as Env, 'db failure query', fakeFetch)
  } catch {
    threw = true
  }
  check('a database failure does not throw', !threw && r !== null && r.added.length === 0 && r.errors.some((e) => /database unavailable/.test(e)))
}

// a unique-constraint clash is reported as not stored, never as an addition
{
  const clashDb = fakeDb()
  const { normalizeUrlKey, webId } = await import('../functions/_lib/finder/verify')
  clashDb.rows.push({ id: webId(normalizeUrlKey(GOOD_URL)), url: 'https://other.example.org/x', name: 'Some Other Award' })
  const r = await runFinder({ DB: clashDb, OPENAI_API_KEY: 'k' } as unknown as Env, 'collision query', searchOnly([GOOD_URL], () => undefined))
  check('an id clash is reported as already stored, not as added', r.added.length === 0 && r.rejected.some((x) => /already stored/.test(x.reason)), JSON.stringify({ added: r.added.length, rejected: r.rejected }))
}

// a huge response is read only up to the cap
{
  const { fetchPageHtml } = await import('../functions/_lib/finder/search')
  let pulls = 0
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls++
      controller.enqueue(new TextEncoder().encode('a'.repeat(65_536)))
      if (pulls >= 400) controller.close()
    },
  })
  const huge: typeof fetch = async () => new Response(stream, { status: 200, headers: { 'content-type': 'text/html' } })
  const page = await fetchPageHtml('https://big.example.org/a', huge)
  check('a huge body is cut off at the cap', !!page && page.html.length <= 500_000, String(page?.html.length))
  check('and the rest of the body is never pulled', pulls < 40, String(pulls))
}

// the per-call page budget holds even when every result is a fresh page
{
  const many = Array.from({ length: 10 }, (_, i) => `https://many${i}.example.org/awards/x`)
  let reads = 0
  const counting = searchOnly(many, (u) => {
    if (!u.startsWith('https://many')) return undefined
    reads++
    return new Response(page('<h1>Nothing here</h1>'), { status: 200, headers: { 'content-type': 'text/html' } })
  })
  await runFinder({ DB: fakeDb(), OPENAI_API_KEY: 'k' } as unknown as Env, 'budget query', counting)
  check('at most 4 pages are fetched per call even with 10 results', reads <= 4, String(reads))
}

// links supplied by the caller skip the search but not the checks
{
  const dbSupplied = fakeDb()
  let searched = false
  const noSearch: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.startsWith('https://html.duckduckgo.com')) searched = true
    return fakeFetch(input, init)
  }
  const supplied = [GOOD_URL, 'https://liar.example.org/awards/park-stem', 'http://insecure.example.org/a', 'https://localhost/a', 'https://10.0.0.5/a']
  const r = await runFinder({ DB: dbSupplied, OPENAI_API_KEY: 'k' } as unknown as Env, 'supplied links query', noSearch, supplied)
  check('supplied links do not trigger a search', !searched && r.provider === 'supplied')
  check('unsafe supplied links are dropped before any fetch', r.searched === 2, String(r.searched))
  check('a supplied good page is verified and listed', r.added.length === 1 && r.added[0].name === 'Lopez Nursing Scholarship')
  check('a supplied page with an invented figure is still rejected', r.rejected.some((x) => /liar/.test(x.url) && x.reason === 'amount not on page'), JSON.stringify(r.rejected))
}

// ---- the free Workers AI fallback ----
{
  const openAi429: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url === 'https://api.openai.com/v1/chat/completions') return new Response('{"error":{"message":"You have no credits remaining."}}', { status: 429 })
    return fakeFetch(input, init)
  }
  let aiCalls = 0
  /** A stand-in for env.AI: answers per page, once as an object and once as a JSON string. */
  const fakeAi = (asString: boolean) => ({
    async run(_model: string, input: Record<string, unknown>) {
      aiCalls++
      const messages = input.messages as { content: string }[]
      const text = messages[1].content
      let out: Record<string, unknown> = { isScholarship: false }
      if (text.includes('Lopez Nursing Scholarship')) {
        out = { isScholarship: true, name: 'Lopez Nursing Scholarship', amount: '$4,500 per year', deadline: `March 1, ${YEAR}`, summaryQuote: 'supports undergraduate nursing students who demonstrate financial need', tags: ['undergrad', 'nursing', 'need-based'] }
      } else if (text.includes('Park STEM Scholarship')) {
        out = { isScholarship: true, name: 'Park STEM Scholarship', amount: '$20,000', deadline: `April 10, ${YEAR}`, summaryQuote: 'supports undergraduate engineering students who live in Arizona', tags: ['undergrad', 'engineering', 'arizona'] }
      }
      return { response: asString ? JSON.stringify(out) : out }
    },
  })

  for (const asString of [false, true]) {
    const db2 = fakeDb()
    const r = await runFinder({ DB: db2, OPENAI_API_KEY: 'k', AI: fakeAi(asString) } as unknown as Env, 'workers ai fallback query', openAi429, [GOOD_URL, 'https://liar.example.org/awards/park-stem'])
    check(`OpenAI out of credits -> Workers AI reads the page (${asString ? 'JSON string' : 'JSON object'} response)`, r.added.length === 1 && r.added[0].name === 'Lopez Nursing Scholarship', JSON.stringify({ added: r.added.length, rejected: r.rejected }))
    check(`the fallback model's invented amount is still rejected (${asString ? 'string' : 'object'})`, r.rejected.some((x) => /liar/.test(x.url) && x.reason === 'amount not on page'), JSON.stringify(r.rejected))
  }
  check('the fallback was actually called', aiCalls >= 4, String(aiCalls))

  // an answer is not an outage: OpenAI saying "not an award" must not trigger the fallback
  const before = aiCalls
  await runFinder({ DB: fakeDb(), OPENAI_API_KEY: 'k', AI: fakeAi(false) } as unknown as Env, 'not an award query', fakeFetch, ['https://list.example.org/all-awards'])
  check('a "not an award" answer from OpenAI does not call the fallback', aiCalls === before, `${aiCalls - before} extra calls`)

  // both unavailable: the reason names both, and nothing is listed
  const brokenAi = { async run() { throw new Error('model unavailable') } }
  const both = await runFinder({ DB: fakeDb(), OPENAI_API_KEY: 'k', AI: brokenAi } as unknown as Env, 'both down query', openAi429, [GOOD_URL])
  check('both readers down -> nothing listed, reason names both', both.added.length === 0 && both.rejected.some((x) => /openai http 429/.test(x.reason) && /workers-ai failed/.test(x.reason)), JSON.stringify(both.rejected))
  const garbage = { async run() { return { response: 'this is not json' } } }
  const bad = await runFinder({ DB: fakeDb(), AI: garbage } as unknown as Env, 'garbage query', fakeFetch, [GOOD_URL])
  check('unreadable fallback output lists nothing', bad.added.length === 0)
}

// no model key: nothing can be listed
const noModel = await runFinder({ DB: fakeDb(), } as unknown as Env, 'undergraduate nursing scholarship application', fakeFetch)
check('without a model key nothing is listed', noModel.added.length === 0 && noModel.rejected.some((r) => /OPENAI_API_KEY/.test(r.reason)))

console.log(`\n${failures === 0 ? 'ALL CLEAN' : failures + ' FAILURES'}`)
process.exit(failures === 0 ? 0 : 1)
