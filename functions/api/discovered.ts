/**
 * GET /api/discovered -- awards found on the web that passed verification.
 * Public: these are public awards with their official page, the same data the catalog holds.
 */
import type { FnCtx } from '../_lib/types'
import { json } from '../_lib/http'

type Row = {
  id: string
  url: string
  name: string
  amount: string
  deadline: string
  summary: string
  tags: string
  added_at: string
  verified_at: number
}

export async function onRequestGet({ env }: FnCtx) {
  const rows = (
    await env.DB.prepare(
      `select id, url, name, amount, deadline, summary, tags, added_at, verified_at
         from discovered_scholarships order by added_at desc, verified_at desc limit 2000`,
    ).all<Row>()
  ).results
  const items = rows.flatMap((r) => {
    try {
      const tags = JSON.parse(r.tags) as unknown
      if (!Array.isArray(tags)) return []
      return [
        {
          id: r.id,
          url: r.url,
          name: r.name,
          amount: r.amount,
          deadline: r.deadline,
          summary: r.summary,
          tags: tags.filter((t): t is string => typeof t === 'string'),
          addedAt: r.added_at,
          foundAtMs: r.verified_at,
        },
      ]
    } catch {
      return []
    }
  })
  // Public and identical for everyone: shared caches may keep it a minute, browsers always revalidate.
  return json({ items }, 200, { 'Cache-Control': 'public, max-age=0, s-maxage=60' })
}
