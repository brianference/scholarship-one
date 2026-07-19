// End-to-end auth tests against a running `wrangler pages dev` + local D1.
const BASE = process.env.BASE || 'http://127.0.0.1:8788'
let pass = 0, fail = 0
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`) }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' -> ' + extra : ''}`) }
}
const post = async (path, body, cookie) => {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json, setCookie: res.headers.get('set-cookie'), retryAfter: res.headers.get('retry-after') }
}
const uniq = () => `t${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`

console.log('\n-- validation --')
let r = await post('/api/auth/register', { email: 'not-an-email', password: 'longenoughpassword' })
check('rejects malformed email', r.status === 400 && !!r.json?.fields?.email, JSON.stringify(r.json))
r = await post('/api/auth/register', { email: uniq(), password: 'short' })
check('rejects short password', r.status === 400 && !!r.json?.fields?.password)
r = await post('/api/auth/register', { email: uniq() })
check('rejects missing password', r.status === 400)
const res = await fetch(BASE + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'not json' })
check('rejects non-JSON body', res.status === 400)

console.log('\n-- register --')
const email = uniq(), password = 'a-really-good-password-9'
r = await post('/api/auth/register', { email, password })
check('registers new account (201)', r.status === 201, JSON.stringify(r.json))
check('sets httpOnly session cookie', /so_session=/.test(r.setCookie || '') && /HttpOnly/i.test(r.setCookie || ''), r.setCookie)
check('cookie is Secure + SameSite', /Secure/i.test(r.setCookie || '') && /SameSite/i.test(r.setCookie || ''))
check('normalizes email to lowercase', r.json?.email === email.toLowerCase())
const cookie = (r.setCookie || '').split(';')[0]

r = await post('/api/auth/register', { email, password })
check('duplicate email conflicts (409)', r.status === 409, JSON.stringify(r.json))
r = await post('/api/auth/register', { email: email.toUpperCase(), password })
check('duplicate is case-insensitive', r.status === 409)

console.log('\n-- session --')
const sres = await fetch(BASE + '/api/auth/session', { headers: { Cookie: cookie } })
const sjson = await sres.json()
check('session resolves from cookie', sres.status === 200 && sjson?.email === email.toLowerCase(), JSON.stringify(sjson))
const nres = await fetch(BASE + '/api/auth/session')
const njson = await nres.json()
check('no cookie -> no session', !njson?.email, JSON.stringify(njson))
const bres = await fetch(BASE + '/api/auth/session', { headers: { Cookie: 'so_session=forged-session-id' } })
check('forged cookie rejected', !(await bres.json())?.email)

console.log('\n-- login --')
r = await post('/api/auth/login', { email, password })
check('correct password logs in', r.status === 200 && !!r.setCookie, JSON.stringify(r.json))
r = await post('/api/auth/login', { email, password: 'wrong-password-here' })
check('wrong password rejected (401)', r.status === 401)
const wrongPwMsg = r.json?.error
r = await post('/api/auth/login', { email: uniq(), password: 'wrong-password-here' })
check('unknown account rejected (401)', r.status === 401)
check('no account enumeration (identical message)', r.json?.error === wrongPwMsg, `${wrongPwMsg} vs ${r.json?.error}`)

console.log('\n-- magic-link account adopts a password --')
const mlEmail = uniq()
r = await post('/api/auth/request', { email: mlEmail })
check('magic-link request accepted', r.status === 200)
r = await post('/api/auth/login', { email: mlEmail, password: 'anything-at-all-x' })
check('passwordless account cannot password-login', r.status === 401)
r = await post('/api/auth/register', { email: mlEmail, password: 'now-i-have-a-password-1' })
check('passwordless account can adopt a password', r.status === 201, JSON.stringify(r.json))
r = await post('/api/auth/login', { email: mlEmail, password: 'now-i-have-a-password-1' })
check('adopted password then logs in', r.status === 200)

console.log('\n-- password reset --')
r = await post('/api/auth/password/reset-request', { email: uniq() })
check('reset for unknown email still 200', r.status === 200)
r = await post('/api/auth/password/reset-request', { email })
check('reset for known email 200', r.status === 200)
r = await post('/api/auth/password/reset', { token: 'bogus-token-that-is-long-enough', password: 'brand-new-password-2' })
check('bogus reset token rejected', r.status === 400)

console.log('\n-- rate limiting --')
const rlEmail = uniq()
await post('/api/auth/register', { email: rlEmail, password: 'the-real-password-77' })
let limitAt = 0
for (let i = 1; i <= 8; i++) {
  const rr = await post('/api/auth/login', { email: rlEmail, password: 'definitely-wrong-pw' })
  if (rr.status === 429) { limitAt = i; check('429 carries Retry-After', !!rr.retryAfter, String(rr.retryAfter)); break }
}
// Five wrong guesses are allowed, so the sixth is the one that must be refused.
check(`per-account limit trips on the 6th attempt (got ${limitAt})`, limitAt === 6)

// Regression: a successful sign-in must clear the failure counter. Otherwise
// signing in on several devices spends the same budget as password guessing
// and a legitimate user can lock themselves out.
const resetEmail = uniq(), resetPw = 'multi-device-user-42'
await post('/api/auth/register', { email: resetEmail, password: resetPw })
for (let i = 0; i < 4; i++) await post('/api/auth/login', { email: resetEmail, password: 'wrong-guess-here' })
const goodLogin = await post('/api/auth/login', { email: resetEmail, password: resetPw })
check('correct password still works after 4 failures', goodLogin.status === 200, String(goodLogin.status))
let trippedAfterSuccess = 0
for (let i = 1; i <= 8; i++) {
  const x = await post('/api/auth/login', { email: resetEmail, password: 'wrong-guess-here' })
  if (x.status === 429) { trippedAfterSuccess = i; break }
}
check(`success resets the counter (full 5 again, tripped at ${trippedAfterSuccess})`, trippedAfterSuccess === 6)

// Regression: students share NAT on school and library networks. A different
// account from the same IP must still be able to sign in after the above.
const natEmail = uniq(), natPw = 'shared-network-user-5'
await post('/api/auth/register', { email: natEmail, password: natPw })
const natLogin = await post('/api/auth/login', { email: natEmail, password: natPw })
check('shared IP does not lock out a different account', natLogin.status === 200, `status ${natLogin.status}`)

console.log('\n-- contact --')
r = await post('/api/contact', { name: 'Test', email: uniq(), subject: 'Hello', message: 'This is a real message body.' })
check('valid contact accepted', r.status === 200, JSON.stringify(r.json))
r = await post('/api/contact', { name: 'Bot', email: uniq(), subject: 'Spam', message: 'Buy things now please.', website: 'http://spam' })
check('honeypot silently accepted', r.status === 200)
r = await post('/api/contact', { name: '', email: 'bad', subject: '', message: 'x' })
check('invalid contact rejected', r.status === 400)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
