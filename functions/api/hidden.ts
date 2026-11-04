/**
 * /api/hidden -- awards the signed-in user marked "not interested".
 *   GET    -> { ids: string[] }
 *   POST   -> { ids } add (idempotent)
 *   DELETE -> ?id= restore one
 * Every query is scoped to the session's user_id.
 */
import type { FnCtx } from '../_lib/types'
import { json } from '../_lib/http'
import { getSession } from '../_lib/auth'
import { hiddenAddSchema, hiddenIdSchema, parseBody } from '../_lib/validate'

export async function onRequestGet({ request, env }: FnCtx) {
  const session = await getSession(env, request)
  if (!session) return json({ error: 'auth required' }, 401)
  const rows = (
    await env.DB.prepare('select scholarship_id as id from hidden_scholarships where user_id = ? order by hidden_at desc')
      .bind(session.userId)
      .all<{ id: string }>()
  ).results
  return json({ ids: rows.map((r) => r.id) })
}

export async function onRequestPost({ request, env }: FnCtx) {
  const session = await getSession(env, request)
  if (!session) return json({ error: 'auth required' }, 401)
  const parsed = await parseBody(request, hiddenAddSchema)
  if (!parsed.ok) return parsed.response
  const now = Date.now()
  const ids = Array.from(new Set(parsed.data.ids))
  await env.DB.batch(
    ids.map((id) =>
      env.DB.prepare(
        `insert into hidden_scholarships (user_id, scholarship_id, hidden_at) values (?, ?, ?)
         on conflict(user_id, scholarship_id) do nothing`,
      ).bind(session.userId, id, now),
    ),
  )
  return json({ ok: true, count: ids.length })
}

export async function onRequestDelete({ request, env }: FnCtx) {
  const session = await getSession(env, request)
  if (!session) return json({ error: 'auth required' }, 401)
  const parsed = hiddenIdSchema.safeParse({ id: new URL(request.url).searchParams.get('id') ?? '' })
  if (!parsed.success) return json({ error: 'valid id required' }, 400)
  await env.DB.prepare('delete from hidden_scholarships where user_id = ? and scholarship_id = ?')
    .bind(session.userId, parsed.data.id)
    .run()
  return json({ ok: true })
}
