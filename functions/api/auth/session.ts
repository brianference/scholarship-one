/** GET /api/auth/session — current signed-in email, or null. */
import type { FnCtx } from '../../_lib/types'
import { json } from '../../_lib/http'
import { getSession } from '../../_lib/auth'

export async function onRequestGet({ request, env }: FnCtx) {
  const session = await getSession(env, request)
  return json({ email: session?.email || null })
}
