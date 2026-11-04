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

console.log(`\n${fail === 0 ? 'ALL CLEAN' : fail + ' FAILURES'} (${pass} passed)`)
process.exit(fail === 0 ? 0 : 1)
