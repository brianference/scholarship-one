/**
 * /api/saves — the signed-in user's saved scholarships (workspace sync).
 *   GET     → list rows
 *   POST    → bulk upsert { saves: [...] } (used for sync + first-login merge)
 *   DELETE  → remove one by ?id=
 * Every query is scoped to the session's user_id (server-side access control).
 */
import type { FnCtx, D1Database } from '../_lib/types'
import { json } from '../_lib/http'
import { getSession } from '../_lib/auth'

type SaveInput = {
  id?: string
  saved_at?: number
  notes?: string | null
  checklist?: string[]
  apply_status?: string
  deadline?: string | null
}

type SaveRow = {
  id: string
  saved_at: number
  updated_at: number
  notes: string | null
  checklist: string | null
  apply_status: string
  deadline: string | null
  reminder_sent: string
}

function mapRow(r: SaveRow) {
  let checklist: string[] = []
  try {
    checklist = r.checklist ? (JSON.parse(r.checklist) as string[]) : []
  } catch {
    checklist = []
  }
  return {
    id: r.id,
    savedAt: r.saved_at,
    updatedAt: r.updated_at,
    notes: r.notes || '',
    checklist,
    applyStatus: r.apply_status || 'none',
    deadline: r.deadline || '',
    reminderSent: r.reminder_sent ? r.reminder_sent.split(',').filter(Boolean) : [],
  }
}

export async function onRequestGet({ request, env }: FnCtx) {
  const session = await getSession(env, request)
  if (!session) return json({ error: 'auth required' }, 401)
  const rows = (
    await env.DB.prepare(
      `select scholarship_id as id, saved_at, updated_at, notes, checklist, apply_status, deadline, reminder_sent
         from saved_scholarships where user_id = ? order by saved_at desc`,
    )
      .bind(session.userId)
      .all<SaveRow>()
  ).results
  return json({ saves: rows.map(mapRow) })
}

export async function onRequestPost({ request, env }: FnCtx) {
  const session = await getSession(env, request)
  if (!session) return json({ error: 'auth required' }, 401)
  let body: { saves?: SaveInput[] }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const saves = Array.isArray(body?.saves) ? body.saves.slice(0, 500) : []
  const now = Date.now()
  const db: D1Database = env.DB
  const stmts = saves
    .filter((it) => it.id)
    .map((it) =>
      db
        .prepare(
          `insert into saved_scholarships
             (user_id, scholarship_id, saved_at, updated_at, notes, checklist, apply_status, deadline)
           values (?, ?, ?, ?, ?, ?, ?, ?)
           on conflict(user_id, scholarship_id) do update set
             updated_at = excluded.updated_at,
             notes = excluded.notes,
             checklist = excluded.checklist,
             apply_status = excluded.apply_status,
             deadline = excluded.deadline`,
        )
        .bind(
          session.userId,
          String(it.id),
          Number(it.saved_at) || now,
          now,
          it.notes ?? null,
          JSON.stringify(Array.isArray(it.checklist) ? it.checklist : []),
          String(it.apply_status || 'none'),
          it.deadline ?? null,
        ),
    )
  if (stmts.length) await db.batch(stmts)
  return json({ ok: true, count: stmts.length })
}

export async function onRequestDelete({ request, env }: FnCtx) {
  const session = await getSession(env, request)
  if (!session) return json({ error: 'auth required' }, 401)
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return json({ error: 'id required' }, 400)
  await env.DB.prepare('delete from saved_scholarships where user_id = ? and scholarship_id = ?')
    .bind(session.userId, id)
    .run()
  return json({ ok: true })
}
