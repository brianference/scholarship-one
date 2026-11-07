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
/**
 * Workers AI models, tried in order. Models are retired often (the first one used here,
 * @cf/meta/llama-3.1-8b-instruct, was deprecated on 2026-05-30 although a docs page still listed it),
 * so this is a list, and WORKERS_AI_MODEL in the environment goes first. The IDs come from
 * Cloudflare's model catalog slugs (llama-3.3-70b-instruct-fp8-fast, llama-3.1-8b-instruct-fp8,
 * qwen3-30b-a3b-fp8, gpt-oss-20b); the live run reports which ones answer.
 */
export const WORKERS_AI_MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct-fp8',
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/openai/gpt-oss-20b',
]

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

/** The first {...} block in a model's text answer, parsed. Models sometimes wrap JSON in prose or fences. */
function jsonFromText(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    const value: unknown = JSON.parse(text.slice(start, end + 1))
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** One model, once. With `schema` it asks for JSON mode; without, it parses JSON out of the text. */
async function runWorkersAiModel(
  env: Env,
  model: string,
  pageText: string,
  allowedTags: readonly string[],
  schema: boolean,
): Promise<Record<string, unknown>> {
  const input: Record<string, unknown> = {
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Allowed tags: ${allowedTags.join(', ')}\n\nPAGE TEXT:\n${pageText.slice(0, MAX_MODEL_CHARS)}` },
    ],
    max_tokens: 700,
    temperature: 0,
  }
  if (schema) input.response_format = { type: 'json_schema', json_schema: WORKERS_AI_SCHEMA }
  // The binding takes no abort signal, so a stuck call is cut off by a timer instead.
  const out = await Promise.race([
    (env.AI as NonNullable<Env['AI']>).run(model, input),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out')), EXTRACT_TIMEOUT_MS)),
  ])
  // Docs: the answer sits under a top-level `response` key, as an object (JSON mode) or as text.
  const raw = (out as { response?: unknown } | null)?.response
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  const parsed = typeof raw === 'string' ? jsonFromText(raw) : null
  if (!parsed) throw new Error('no JSON in the answer')
  return parsed
}

async function readWithWorkersAi(env: Env, pageText: string, allowedTags: readonly string[]): Promise<ReaderOutcome> {
  if (!env.AI) return { kind: 'unavailable', reason: 'workers-ai: no AI binding' }
  const models = [...(env.WORKERS_AI_MODEL ? [env.WORKERS_AI_MODEL] : []), ...WORKERS_AI_MODELS]
  const failures: string[] = []
  for (const model of models) {
    // JSON mode first; a model that rejects it (or ignores it) gets one more try as plain text.
    for (const schema of [true, false]) {
      try {
        const parsed = await runWorkersAiModel(env, model, pageText, allowedTags, schema)
        return { kind: 'answer', result: toResult(parsed, 'workers-ai') }
      } catch (err) {
        failures.push(`${model}${schema ? '' : ' (text)'}: ${(err as Error).message.slice(0, 90)}`)
      }
    }
  }
  return { kind: 'unavailable', reason: `workers-ai failed: ${failures.join(' | ')}` }
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
