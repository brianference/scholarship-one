/**
 * POST /api/find-cron -- the daily finder job. Authenticated by the X-Cron-Secret header
 * (compared in constant time), not by a user session. Body: { query }.
 * The GitHub Action loops over a list of queries and calls this once per query.
 */
import type { FnCtx } from '../_lib/types'
import { json } from '../_lib/http'
import { cronBodySchema, parseBody } from '../_lib/validate'
import { runFinder } from '../_lib/finder/run'

/** Constant-time string comparison, so response timing does not leak the secret. */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

export async function onRequestPost({ request, env }: FnCtx) {
  const expected = env.CRON_SECRET
  const sent = request.headers.get('X-Cron-Secret') || ''
  // An unset or short secret must never match, least of all an empty header.
  if (!expected || expected.length < 24 || !safeEqual(sent, expected)) return json({ error: 'forbidden' }, 403)
  const parsed = await parseBody(request, cronBodySchema)
  if (!parsed.ok) return parsed.response
  const report = await runFinder(env, parsed.data.query)
  return json({
    provider: report.provider,
    searched: report.searched,
    read: report.read,
    added: report.added.map((a) => ({ id: a.id, name: a.name, url: a.url })),
    rejected: report.rejected.slice(0, 20),
    errors: report.errors.slice(0, 5),
  })
}
