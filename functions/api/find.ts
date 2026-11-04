/**
 * POST /api/find -- "Find new scholarships" for the signed-in student.
 * Body: { profile, variant: 0|1 }. The search query is built here from the validated profile.
 * One call reads at most a few pages; the client calls it once per variant.
 * Limited to 8 calls per 15 minutes per account.
 */
import type { FnCtx } from '../_lib/types'
import { json } from '../_lib/http'
import { getSession } from '../_lib/auth'
import { findRequestSchema, parseBody } from '../_lib/validate'
import { clientIp, consume } from '../_lib/ratelimit'
import { runFinder } from '../_lib/finder/run'
import { profileQuery } from '../_lib/finder/queries'

/** Per account, per network address, and across the whole site (each call can cost model and search spend). */
const MAX_FINDS_PER_WINDOW = 8
const MAX_FINDS_PER_IP = 20
const MAX_FINDS_SITEWIDE = 150

export async function onRequestPost({ request, env }: FnCtx) {
  const session = await getSession(env, request)
  if (!session) return json({ error: 'auth required' }, 401)
  const parsed = await parseBody(request, findRequestSchema)
  if (!parsed.ok) return parsed.response
  const gates = [
    await consume(env, 'find', session.userId, MAX_FINDS_PER_WINDOW),
    await consume(env, 'find:ip', clientIp(request), MAX_FINDS_PER_IP),
    await consume(env, 'find:site', 'all', MAX_FINDS_SITEWIDE),
  ]
  const gate = gates.find((g) => !g.allowed)
  if (gate) {
    return json({ error: 'You have searched a lot just now. Try again in a few minutes.' }, 429, {
      'Retry-After': String(gate.retryAfterSeconds),
    })
  }
  const query = profileQuery(parsed.data.profile, parsed.data.variant)
  const report = await runFinder(env, query)
  return json({
    provider: report.provider,
    searched: report.searched,
    read: report.read,
    added: report.added.map((a) => ({ id: a.id, name: a.name })),
    errors: report.errors.slice(0, 3),
  })
}
