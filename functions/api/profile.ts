/**
 * /api/profile -- the signed-in user's ranking profile, so it survives a cleared
 * browser or a new device.
 *   GET -> { profile: {...} | null, updatedAt }
 *   PUT -> { profile, updatedAt } stores it unless the server copy is newer.
 * Every query is scoped to the session's user_id.
 */
import type { FnCtx } from '../_lib/types'
import { json } from '../_lib/http'
import { getSession } from '../_lib/auth'
import { parseBody, profileSchema } from '../_lib/validate'

type ProfileRow = { profile: string; updated_at: number }

export async function onRequestGet({ request, env }: FnCtx) {
  const session = await getSession(env, request)
  if (!session) return json({ error: 'auth required' }, 401)
  const row = await env.DB.prepare('select profile, updated_at from user_profiles where user_id = ?')
    .bind(session.userId)
    .first<ProfileRow>()
  if (!row) return json({ profile: null, updatedAt: 0 })
  try {
    return json({ profile: JSON.parse(row.profile), updatedAt: row.updated_at })
  } catch {
    // A corrupt row is treated as absent; the client re-uploads its own copy.
    return json({ profile: null, updatedAt: 0 })
  }
}

export async function onRequestPut({ request, env }: FnCtx) {
  const session = await getSession(env, request)
  if (!session) return json({ error: 'auth required' }, 401)
  const parsed = await parseBody(request, profileSchema)
  if (!parsed.ok) return parsed.response
  const { profile, updatedAt } = parsed.data
  const body = JSON.stringify(profile)
  // The WHERE keeps a stale device from overwriting a newer profile. The replaced
  // value is kept in previous_profile only when the content actually changed.
  await env.DB.prepare(
    `insert into user_profiles (user_id, profile, previous_profile, updated_at)
       values (?, ?, null, ?)
     on conflict(user_id) do update set
       previous_profile = case when user_profiles.profile <> excluded.profile
                               then user_profiles.profile else user_profiles.previous_profile end,
       profile = excluded.profile,
       updated_at = excluded.updated_at
     where excluded.updated_at >= user_profiles.updated_at`,
  )
    .bind(session.userId, body, updatedAt)
    .run()
  const row = await env.DB.prepare('select profile, updated_at from user_profiles where user_id = ?')
    .bind(session.userId)
    .first<ProfileRow>()
  return json({ ok: true, updatedAt: row?.updated_at ?? updatedAt, applied: row?.profile === body })
}
