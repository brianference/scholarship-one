/** POST /api/auth/request { email } — create user if new, email a magic link. */
import type { FnCtx } from '../../_lib/types'
import { json } from '../../_lib/http'
import { randomToken, sha256hex } from '../../_lib/auth'
import { sendEmail, magicLinkHtml } from '../../_lib/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TOKEN_TTL_MS = 15 * 60 * 1000

export async function onRequestPost({ request, env }: FnCtx) {
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const email = String(body?.email || '')
    .trim()
    .toLowerCase()
    .slice(0, 160)
  if (!EMAIL_RE.test(email)) return json({ error: 'valid email required' }, 400)

  const now = Date.now()
  // Upsert the user (email is unique).
  await env.DB.prepare('insert into users (id, email, created_at) values (?, ?, ?) on conflict(email) do nothing')
    .bind(crypto.randomUUID(), email, now)
    .run()
  const user = await env.DB.prepare('select id from users where email = ?').bind(email).first<{ id: string }>()
  if (!user) return json({ error: 'could not create account' }, 500)

  const token = randomToken(32)
  const hash = await sha256hex(token)
  await env.DB.prepare('insert into auth_tokens (token_hash, user_id, expires_at) values (?, ?, ?)')
    .bind(hash, user.id, now + TOKEN_TTL_MS)
    .run()

  const origin = env.SITE_URL || new URL(request.url).origin
  const link = `${origin}/auth?token=${token}`
  const result = await sendEmail(env, email, 'Sign in to Scholarship One', magicLinkHtml(link))

  // Always 200 so the endpoint can't be used to probe which emails have accounts.
  // Only expose the link in explicit local-dev mode.
  const dev = env.EXPOSE_DEV_MAGIC_LINK === '1' && result.stubbed
  return json({ ok: true, ...(dev ? { devLink: link } : {}) })
}
