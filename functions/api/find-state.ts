/**
 * /api/find-state -- when the student last tapped "Find new scholarships" and which awards
 * they have already looked at (so they lose the New badge on every device).
 *   GET  -> { firstCheckedAt, checkedAt, seenIds }
 *   POST -> { firstCheckedAt?, checkedAt?, seenIds? } merges: seen ids are added, checkedAt only
 *           moves forward, firstCheckedAt only moves backward (the earliest tap wins).
 */
import type { FnCtx } from '../_lib/types'
import { json } from '../_lib/http'
import { getSession } from '../_lib/auth'
import { findStateSchema, parseBody } from '../_lib/validate'

export async function onRequestGet({ request, env }: FnCtx) {
  const session = await getSession(env, request)
  if (!session) return json({ error: 'auth required' }, 401)
  const state = await env.DB.prepare('select first_checked_at as firstCheckedAt, checked_at as checkedAt from user_find_state where user_id = ?')
    .bind(session.userId)
    .first<{ firstCheckedAt: number; checkedAt: number }>()
  const seen = (
    await env.DB.prepare('select scholarship_id as id from seen_scholarships where user_id = ?')
      .bind(session.userId)
      .all<{ id: string }>()
  ).results
  return json({ firstCheckedAt: state?.firstCheckedAt ?? 0, checkedAt: state?.checkedAt ?? 0, seenIds: seen.map((r) => r.id) })
}

export async function onRequestPost({ request, env }: FnCtx) {
  const session = await getSession(env, request)
  if (!session) return json({ error: 'auth required' }, 401)
  const parsed = await parseBody(request, findStateSchema)
  if (!parsed.ok) return parsed.response
  const { firstCheckedAt, checkedAt, seenIds } = parsed.data
  const now = Date.now()
  const stmts = []
  if (checkedAt || firstCheckedAt) {
    const latest = checkedAt ?? firstCheckedAt ?? 0
    const first = firstCheckedAt ?? checkedAt ?? 0
    stmts.push(
      env.DB.prepare(
        `insert into user_find_state (user_id, first_checked_at, checked_at) values (?, ?, ?)
         on conflict(user_id) do update set
           first_checked_at = min(user_find_state.first_checked_at, excluded.first_checked_at),
           checked_at = max(user_find_state.checked_at, excluded.checked_at)`,
      ).bind(session.userId, first, latest),
    )
  }
  for (const id of Array.from(new Set(seenIds ?? []))) {
    stmts.push(
      env.DB.prepare(
        `insert into seen_scholarships (user_id, scholarship_id, seen_at) values (?, ?, ?)
         on conflict(user_id, scholarship_id) do nothing`,
      ).bind(session.userId, id, now),
    )
  }
  if (stmts.length) await env.DB.batch(stmts)
  return json({ ok: true })
}
