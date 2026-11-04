// v5.3.0 API tests: profile, hidden awards and remind-to-apply on saves.
// Needs a running `wrangler pages dev dist` with migrations applied (local D1).
//   BASE=http://127.0.0.1:8799 node scripts/test-account-sync-e2e.mjs
const BASE = process.env.BASE || 'http://127.0.0.1:8788'
let pass = 0
let fail = 0
const check = (name, cond, extra = '') => {
  if (cond) {
    pass++
    console.log(`  ok   ${name}`)
  } else {
    fail++
    console.log(`  FAIL ${name}${extra ? ' -> ' + extra : ''}`)
  }
}

async function call(method, path, { body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
  let json = null
  try {
    json = await res.json()
  } catch {
    /* empty body */
  }
  return { status: res.status, json, setCookie: res.headers.get('set-cookie') }
}

async function register() {
  const email = `sync${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`
  const r = await call('POST', '/api/auth/register', { body: { email, password: 'a-really-good-password-9' } })
  if (r.status !== 201) throw new Error(`register failed: ${r.status} ${JSON.stringify(r.json)}`)
  return (r.setCookie || '').split(';')[0]
}

const PROFILE = { major: 'engineering', state: 'AZ', level: 'undergrad', identity: 'any', need: 'any' }
const T1 = Date.now() - 600_000

const a = await register()
const b = await register()

console.log('\n-- auth required --')
for (const [m, p] of [
  ['GET', '/api/profile'],
  ['PUT', '/api/profile'],
  ['GET', '/api/hidden'],
  ['POST', '/api/hidden'],
  ['DELETE', '/api/hidden?id=pell'],
]) {
  const r = await call(m, p, { body: m === 'GET' || m === 'DELETE' ? undefined : {} })
  check(`${m} ${p} without a cookie is 401`, r.status === 401, String(r.status))
}
const forged = await call('GET', '/api/profile', { cookie: 'so_session=forged' })
check('forged session cookie is 401', forged.status === 401)

console.log('\n-- profile --')
let r = await call('GET', '/api/profile', { cookie: a })
check('new account has no profile', r.status === 200 && r.json?.profile === null)
r = await call('PUT', '/api/profile', { cookie: a, body: { profile: PROFILE, updatedAt: T1 } })
check('PUT stores the profile', r.status === 200 && r.json?.applied === true, JSON.stringify(r.json))
r = await call('GET', '/api/profile', { cookie: a })
check('GET returns what was stored', r.json?.profile?.major === 'engineering' && r.json?.updatedAt === T1, JSON.stringify(r.json))
r = await call('GET', '/api/profile', { cookie: b })
check("another account cannot see it", r.json?.profile === null)

const stale = await call('PUT', '/api/profile', {
  cookie: a,
  body: { profile: { ...PROFILE, major: 'stale-device' }, updatedAt: T1 - 1000 },
})
check('stale write is not applied', stale.status === 200 && stale.json?.applied === false, JSON.stringify(stale.json))
r = await call('GET', '/api/profile', { cookie: a })
check('stale write left the newer profile intact', r.json?.profile?.major === 'engineering')

r = await call('PUT', '/api/profile', { cookie: a, body: { profile: { ...PROFILE, major: 'nursing' }, updatedAt: T1 + 5000 } })
check('newer write is applied', r.json?.applied === true)
r = await call('GET', '/api/profile', { cookie: a })
check('newer write replaced the profile', r.json?.profile?.major === 'nursing' && r.json?.updatedAt === T1 + 5000)

for (const [name, body] of [
  ['missing field', { profile: { major: 'x' }, updatedAt: T1 }],
  ['empty field', { profile: { ...PROFILE, state: '' }, updatedAt: T1 }],
  ['oversize field', { profile: { ...PROFILE, major: 'x'.repeat(65) }, updatedAt: T1 }],
  ['non-numeric time', { profile: PROFILE, updatedAt: 'now' }],
  ['negative time', { profile: PROFILE, updatedAt: -5 }],
  ['timestamp a year ahead', { profile: PROFILE, updatedAt: Date.now() + 365 * 86_400_000 }],
]) {
  const bad = await call('PUT', '/api/profile', { cookie: a, body })
  check(`rejects ${name}`, bad.status === 400, String(bad.status))
}
const junk = await call('PUT', '/api/profile', { cookie: a, body: 'not json' })
check('rejects non-JSON body', junk.status === 400)

console.log('\n-- hidden awards --')
r = await call('GET', '/api/hidden', { cookie: a })
check('starts empty', Array.isArray(r.json?.ids) && r.json.ids.length === 0)
r = await call('POST', '/api/hidden', { cookie: a, body: { ids: ['pell', 'gates', 'pell'] } })
check('POST adds (duplicates collapsed)', r.status === 200 && r.json?.count === 2, JSON.stringify(r.json))
r = await call('POST', '/api/hidden', { cookie: a, body: { ids: ['pell'] } })
check('POST is idempotent', r.status === 200)
r = await call('GET', '/api/hidden', { cookie: a })
check('GET lists both once', r.json?.ids?.length === 2 && r.json.ids.includes('pell') && r.json.ids.includes('gates'), JSON.stringify(r.json))
r = await call('GET', '/api/hidden', { cookie: b })
check("another account's list is empty", r.json?.ids?.length === 0)
r = await call('DELETE', '/api/hidden?id=pell', { cookie: b })
check("another account's DELETE does not remove mine", r.status === 200)
r = await call('GET', '/api/hidden', { cookie: a })
check('my list is untouched by their DELETE', r.json?.ids?.length === 2)
r = await call('DELETE', '/api/hidden?id=pell', { cookie: a })
r = await call('GET', '/api/hidden', { cookie: a })
check('DELETE restores one', r.json?.ids?.length === 1 && r.json.ids[0] === 'gates', JSON.stringify(r.json))
for (const [name, body] of [
  ['sql-ish id', { ids: ["x'; drop table users;--"] }],
  ['empty list', { ids: [] }],
  ['non-array', { ids: 'pell' }],
  ['oversize list', { ids: Array.from({ length: 501 }, (_, i) => `id${i}`) }],
]) {
  const bad = await call('POST', '/api/hidden', { cookie: a, body })
  check(`rejects ${name}`, bad.status === 400, String(bad.status))
}
r = await call('DELETE', '/api/hidden', { cookie: a })
check('DELETE without id is 400', r.status === 400)

console.log('\n-- remind-to-apply on saves --')
const save = (extra) => call('POST', '/api/saves', { cookie: a, body: { saves: [{ id: 'gates', ...extra }] } })
const readGates = async () => (await call('GET', '/api/saves', { cookie: a })).json?.saves?.find((s) => s.id === 'gates')
r = await save({ notes: 'n1', remind_on: '2026-12-01' })
check('save with a reminder date succeeds', r.status === 200)
check('reminder date is returned', (await readGates())?.remindOn === '2026-12-01')
r = await save({ notes: 'n2' })
let g = await readGates()
check('a save with no remind_on keeps the stored date', g?.remindOn === '2026-12-01' && g?.notes === 'n2', JSON.stringify(g))
r = await save({ notes: 'n2', remind_on: 'next tuesday' })
g = await readGates()
check('an invalid date is ignored, not stored', g?.remindOn === '2026-12-01', JSON.stringify(g))
r = await save({ notes: 'n2', remind_on: '2026-02-31' })
g = await readGates()
check('an impossible date (Feb 31) is ignored', g?.remindOn === '2026-12-01', JSON.stringify(g))
r = await save({ notes: 'n2', remind_on: '2027-01-15' })
check('a new date replaces the old one', (await readGates())?.remindOn === '2027-01-15')
r = await save({ notes: 'n2', remind_on: '' })
check("empty string clears the reminder", (await readGates())?.remindOn === '')
const mine = await call('GET', '/api/saves', { cookie: b })
check("another account sees none of my saves", mine.json?.saves?.length === 0)

console.log('\n-- find state (first tap, last tap, seen) --')
for (const [m, p] of [['GET', '/api/find-state'], ['POST', '/api/find-state'], ['POST', '/api/find']]) {
  const noAuth = await call(m, p, { body: m === 'GET' ? undefined : {} })
  check(`${m} ${p} without a cookie is 401`, noAuth.status === 401, String(noAuth.status))
}
r = await call('GET', '/api/find-state', { cookie: a })
check('starts empty', r.json?.checkedAt === 0 && r.json?.firstCheckedAt === 0 && r.json?.seenIds?.length === 0, JSON.stringify(r.json))
const F1 = Date.now() - 500_000
const F2 = Date.now() - 100_000
r = await call('POST', '/api/find-state', { cookie: a, body: { firstCheckedAt: F1, checkedAt: F1, seenIds: ['web-aaaa0001', 'pell'] } })
check('POST stores the first tap and seen ids', r.status === 200, JSON.stringify(r.json))
r = await call('POST', '/api/find-state', { cookie: a, body: { checkedAt: F2, seenIds: ['web-aaaa0002'] } })
r = await call('GET', '/api/find-state', { cookie: a })
check('latest tap moves forward', r.json?.checkedAt === F2, JSON.stringify(r.json))
check('first tap stays the earliest', r.json?.firstCheckedAt === F1, JSON.stringify(r.json))
check('seen ids accumulate', r.json?.seenIds?.length === 3, JSON.stringify(r.json))
r = await call('POST', '/api/find-state', { cookie: a, body: { firstCheckedAt: F2 + 50_000, checkedAt: F1 } })
r = await call('GET', '/api/find-state', { cookie: a })
check('an older tap cannot move the latest tap back', r.json?.checkedAt === F2)
check('a later first tap cannot move the first tap forward', r.json?.firstCheckedAt === F1)
r = await call('GET', '/api/find-state', { cookie: b })
check('another account sees none of it', r.json?.checkedAt === 0 && r.json?.seenIds?.length === 0)
for (const [name, body] of [
  ['future timestamp', { checkedAt: Date.now() + 5 * 86_400_000 }],
  ['sql-ish seen id', { seenIds: ["x'; drop table users;--"] }],
  ['non-array seen ids', { seenIds: 'pell' }],
]) {
  const bad = await call('POST', '/api/find-state', { cookie: a, body })
  check(`rejects ${name}`, bad.status === 400, String(bad.status))
}

console.log('\n-- discovered awards and the finder endpoints --')
r = await call('GET', '/api/discovered')
check('discovered list is public and well formed', r.status === 200 && Array.isArray(r.json?.items), JSON.stringify(r.json)?.slice(0, 80))
const goodProfile = { major: 'nursing', state: 'any', level: 'undergrad', identity: 'any', need: 'any' }
for (const [name, body] of [
  ['bad variant', { profile: goodProfile, variant: 2 }],
  ['missing profile', { variant: 0 }],
  ['oversize profile field', { profile: { ...goodProfile, major: 'x'.repeat(65) }, variant: 0 }],
]) {
  const bad = await call('POST', '/api/find', { cookie: a, body })
  check(`find rejects ${name}`, bad.status === 400, String(bad.status))
}
const cronQuery = 'undergraduate nursing scholarship application official'
r = await call('POST', '/api/find-cron', { body: { query: cronQuery } })
check('find-cron with no secret is 403', r.status === 403, String(r.status))
r = await call('POST', '/api/find-cron', { body: { query: cronQuery }, cookie: a })
check('a user session is not a cron secret', r.status === 403)
const wrong = await fetch(BASE + '/api/find-cron', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Cron-Secret': 'wrong-secret-wrong-secret-wrong' },
  body: JSON.stringify({ query: cronQuery }),
})
check('find-cron with a wrong secret is 403', wrong.status === 403, String(wrong.status))
if (process.env.CRON_SECRET) {
  const cronCall = (query) =>
    fetch(BASE + '/api/find-cron', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Cron-Secret': process.env.CRON_SECRET },
      body: JSON.stringify({ query }),
    })
  const short = await cronCall('x')
  check('find-cron validates the body even with the right secret', short.status === 400, String(short.status))
  const real = await cronCall(cronQuery)
  const body = await real.json().catch(() => null)
  check('find-cron with the right secret runs a real search pass', real.status === 200 && typeof body?.searched === 'number', JSON.stringify(body)?.slice(0, 160))
  // The keyless provider is rate limited by its host after many requests, so "no results" is an
  // external condition. What must hold is that it is reported, not hidden.
  const gotResults = !!body?.provider && body.provider !== 'none'
  check(
    gotResults ? 'the real search returned results from some provider' : 'an empty search is reported with its reason',
    gotResults || (Array.isArray(body?.errors) && body.errors.length > 0),
    JSON.stringify(body)?.slice(0, 160),
  )
  if (!gotResults) console.log('  note: no provider returned results this time (' + JSON.stringify(body?.errors) + ')')
}

console.log(`\n${fail === 0 ? 'ALL CLEAN' : fail + ' FAILURES'} (${pass} passed)`)
process.exit(fail === 0 ? 0 : 1)
