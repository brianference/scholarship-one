// Verifies the PBKDF2 password module against real Web Crypto.
import { execSync } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'pwtest-'))
const out = join(dir, 'password.mjs')
execSync(`npx esbuild functions/_lib/password.ts --format=esm --target=es2022 --outfile="${out}"`, { stdio: 'pipe' })
const { hashPassword, verifyPassword, needsRehash, PBKDF2_ITERATIONS } = await import('file://' + out)

let pass = 0, fail = 0
const check = (name, cond) => { if (cond) { pass++; console.log(`  ok  ${name}`) } else { fail++; console.log(`  FAIL ${name}`) } }

const rec = await hashPassword('correct horse battery staple')
check('hash is base64 and non-empty', typeof rec.hash === 'string' && rec.hash.length > 20)
check('salt is distinct per call', (await hashPassword('x')).salt !== (await hashPassword('x')).salt)
check('iterations recorded', rec.iterations === PBKDF2_ITERATIONS && rec.iterations >= 210000)
check('correct password verifies', await verifyPassword('correct horse battery staple', rec))
check('wrong password rejected', !(await verifyPassword('Correct horse battery staple', rec)))
check('empty password rejected', !(await verifyPassword('', rec)))
check('null record rejected', !(await verifyPassword('anything', null)))
check('magic-link-only account rejected', !(await verifyPassword('anything', { hash: null, salt: null, iterations: null })))
check('corrupt salt rejected, no throw', !(await verifyPassword('correct horse battery staple', { ...rec, salt: '!!!!' })))
check('same password + same salt is deterministic', (await (async () => {
  const a = await verifyPassword('correct horse battery staple', rec)
  const b = await verifyPassword('correct horse battery staple', rec)
  return a && b
})()))
check('needsRehash false at current iters', !needsRehash(rec))
check('needsRehash true at lower iters', needsRehash({ ...rec, iterations: 1000 }))
check('unicode password round-trips', await (async () => {
  const r = await hashPassword('пароль-日本語-🔐-long-enough')
  return verifyPassword('пароль-日本語-🔐-long-enough', r)
})())

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
