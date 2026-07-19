/** POST /api/auth/register { email, password } — create a password account and sign in. */
import type { FnCtx } from '../../_lib/types'
import { json, sessionCookie } from '../../_lib/http'
import { createSession, SESSION_TTL_SECONDS } from '../../_lib/auth'
import { hashPassword } from '../../_lib/password'
import { parseBody, registerSchema } from '../../_lib/validate'
import { guard } from '../../_lib/ratelimit'

export async function onRequestPost({ request, env }: FnCtx) {
  const parsed = await parseBody(request, registerSchema)
  if (!parsed.ok) return parsed.response
  const { email, password } = parsed.data

  const limited = await guard(env, request, 'register', email)
  if (limited) return limited

  const now = Date.now()
  const existing = await env.DB.prepare('select id, password_hash as passwordHash from users where email = ?')
    .bind(email)
    .first<{ id: string; passwordHash: string | null }>()

  // An account already carrying a password is a genuine conflict. An account
  // created through the passwordless magic-link flow can adopt a password here,
  // which is how existing v4 users upgrade without being locked out.
  if (existing?.passwordHash) {
    return json({ error: 'An account with that email already exists. Sign in instead.', field: 'email' }, 409)
  }

  const { hash, salt, iterations } = await hashPassword(password)

  let userId: string
  if (existing) {
    userId = existing.id
    await env.DB.prepare(
      'update users set password_hash = ?, password_salt = ?, password_iters = ?, updated_at = ? where id = ?',
    )
      .bind(hash, salt, iterations, now, userId)
      .run()
  } else {
    userId = crypto.randomUUID()
    await env.DB.prepare(
      `insert into users (id, email, created_at, updated_at, password_hash, password_salt, password_iters)
       values (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(userId, email, now, now, hash, salt, iterations)
      .run()
  }

  const sid = await createSession(env, userId)
  return json({ ok: true, email }, 201, { 'Set-Cookie': sessionCookie(sid, SESSION_TTL_SECONDS) })
}
