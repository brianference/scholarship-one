/**
 * Ask a model to read one page and quote its scholarship facts. The model is only a reader:
 * everything it returns is re-checked against the page text by verifyCandidate, so a wrong or
 * invented answer is dropped, never listed.
 *
 * Readers are tried in order and the next one runs only when the previous is UNAVAILABLE (no key,
 * out of credits, HTTP error, timeout):
 *   1. OpenAI chat completions (needs OPENAI_API_KEY)
 *   2. Cloudflare Workers AI through the `AI` binding (no key, free daily allowance)
 * A reader that answers "this page is not one specific award" ends the search; it is an answer.
 */
import type { Env } from '../types'
import type { Candidate } from './verify'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const EXTRACT_TIMEOUT_MS = 25_000
/** Page text sent to the model. Award facts sit near the top of an award page. */
const MAX_MODEL_CHARS = 12_000
/** Workers AI model with JSON mode, from Cloudflare's JSON mode documentation. */
export const WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct'

const SYSTEM = `You read one web page and report facts about the single scholarship, grant, fellowship or award it describes.
Rules:
- Copy text EXACTLY as it appears on the page, character for character. Do not paraphrase, summarize, reword, convert currencies, or fix typos.
- "amount" is the award value as written (for example "$5,000 per year" or "Full tuition"). "deadline" is the application deadline as written, including the year.
- "summaryQuote" is one sentence copied from the page that says who the award is for (30 to 300 characters).
- "tags" are chosen ONLY from the allowed list you are given. Include one school-level tag (undergrad, grad, high-school, community-college, transfer) and any that clearly apply.
- If the page is not about one specific award (a list of awards, a news article, a forum thread, an aggregator) or any field is not stated on the page, return {"isScholarship": false}.
- Never guess. A missing fact means isScholarship false.
Return JSON only: {"isScholarship": boolean, "name": string, "amount": string, "deadline": string, "summaryQuote": string, "tags": string[]}`

/** JSON schema handed to Workers AI JSON mode. */
const WORKERS_AI_SCHEMA = {
  type: 'object',
  properties: {
    isScholarship: { type: 'boolean' },
    name: { type: 'string' },
    amount: { type: 'string' },
    deadline: { type: 'string' },
    summaryQuote: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
  },
  required: ['isScholarship', 'name', 'amount', 'deadline', 'summaryQuote', 'tags'],
}

export type ExtractResult = { ok: true; candidate: Candidate; reader: 'openai' | 'workers-ai' } | { ok: false; reason: string }

/** One reader's outcome: an answer, or "unavailable" so the next reader can try. */
type ReaderOutcome = { kind: 'answer'; result: ExtractResult } | { kind: 'unavailable'; reason: string }

/** Turn a model's parsed JSON into a candidate, or the "not an award" answer. */
function toResult(parsed: Record<string, unknown>, reader: 'openai' | 'workers-ai'): ExtractResult {
  if (parsed.isScholarship !== true) return { ok: false, reason: 'model: page is not one specific award' }
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    ok: true,
    reader,
    candidate: {
      name: str(parsed.name),
      amount: str(parsed.amount),
      deadline: str(parsed.deadline),
      summaryQuote: str(parsed.summaryQuote),
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t): t is string => typeof t === 'string') : [],
    },
  }
}

async function readWithOpenAI(
  env: Env,
  pageText: string,
  allowedTags: readonly string[],
  fetchFn: typeof fetch,
): Promise<ReaderOutcome> {
  const key = env.OPENAI_API_KEY
  if (!key) return { kind: 'unavailable', reason: 'openai: no OPENAI_API_KEY configured' }
  let res: Response
  try {
    res = await fetchFn(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(EXTRACT_TIMEOUT_MS),
      body: JSON.stringify({
        model: env.AI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Allowed tags: ${allowedTags.join(', ')}\n\nPAGE TEXT:\n${pageText.slice(0, MAX_MODEL_CHARS)}` },
        ],
      }),
    })
  } catch (err) {
    return { kind: 'unavailable', reason: `openai request failed: ${(err as Error).message}` }
  }
  if (!res.ok) return { kind: 'unavailable', reason: `openai http ${res.status}` }
  try {
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    return { kind: 'answer', result: toResult(JSON.parse(body.choices?.[0]?.message?.content ?? '{}') as Record<string, unknown>, 'openai') }
  } catch {
    return { kind: 'unavailable', reason: 'openai returned unreadable JSON' }
  }
}

async function readWithWorkersAi(env: Env, pageText: string, allowedTags: readonly string[]): Promise<ReaderOutcome> {
  if (!env.AI) return { kind: 'unavailable', reason: 'workers-ai: no AI binding' }
  try {
    const run = env.AI.run(WORKERS_AI_MODEL, {
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Allowed tags: ${allowedTags.join(', ')}\n\nPAGE TEXT:\n${pageText.slice(0, MAX_MODEL_CHARS)}` },
      ],
      response_format: { type: 'json_schema', json_schema: WORKERS_AI_SCHEMA },
      max_tokens: 700,
      temperature: 0,
    })
    // The binding takes no abort signal, so a stuck call is cut off by a timer instead.
    const out = await Promise.race([
      run,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out')), EXTRACT_TIMEOUT_MS)),
    ])
    // Docs: the JSON sits under a top-level `response` key, as an object (JSON mode) or a string.
    const raw = (out as { response?: unknown } | null)?.response
    const parsed = typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw
    if (!parsed || typeof parsed !== 'object') return { kind: 'unavailable', reason: 'workers-ai returned no JSON' }
    return { kind: 'answer', result: toResult(parsed as Record<string, unknown>, 'workers-ai') }
  } catch (err) {
    return { kind: 'unavailable', reason: `workers-ai failed: ${(err as Error).message}` }
  }
}

/** Read one page's visible text with the first reader that is available. */
export async function extractCandidate(
  env: Env,
  pageText: string,
  allowedTags: readonly string[],
  fetchFn: typeof fetch = fetch,
): Promise<ExtractResult> {
  const reasons: string[] = []
  for (const read of [
    () => readWithOpenAI(env, pageText, allowedTags, fetchFn),
    () => readWithWorkersAi(env, pageText, allowedTags),
  ]) {
    const outcome = await read()
    if (outcome.kind === 'answer') return outcome.result
    reasons.push(outcome.reason)
  }
  return { ok: false, reason: `no reader available (${reasons.join('; ')})` }
}
