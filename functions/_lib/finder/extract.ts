/**
 * Ask a model to read one page and quote its scholarship facts. The model is only a reader:
 * everything it returns is re-checked against the page text by verifyCandidate, so a wrong or
 * invented answer is dropped, never listed.
 */
import type { Env } from '../types'
import type { Candidate } from './verify'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const EXTRACT_TIMEOUT_MS = 25_000
/** Page text sent to the model. Award facts sit near the top of an award page. */
const MAX_MODEL_CHARS = 12_000

const SYSTEM = `You read one web page and report facts about the single scholarship, grant, fellowship or award it describes.
Rules:
- Copy text EXACTLY as it appears on the page, character for character. Do not paraphrase, summarize, reword, convert currencies, or fix typos.
- "amount" is the award value as written (for example "$5,000 per year" or "Full tuition"). "deadline" is the application deadline as written, including the year.
- "summaryQuote" is one sentence copied from the page that says who the award is for (30 to 300 characters).
- "tags" are chosen ONLY from the allowed list you are given. Include one school-level tag (undergrad, grad, high-school, community-college, transfer) and any that clearly apply.
- If the page is not about one specific award (a list of awards, a news article, a forum thread, an aggregator) or any field is not stated on the page, return {"isScholarship": false}.
- Never guess. A missing fact means isScholarship false.
Return JSON only: {"isScholarship": boolean, "name": string, "amount": string, "deadline": string, "summaryQuote": string, "tags": string[]}`

export type ExtractResult = { ok: true; candidate: Candidate } | { ok: false; reason: string }

/** Read one page's visible text with the configured model. */
export async function extractCandidate(
  env: Env,
  pageText: string,
  allowedTags: readonly string[],
  fetchFn: typeof fetch = fetch,
): Promise<ExtractResult> {
  const key = env.OPENAI_API_KEY
  if (!key) return { ok: false, reason: 'no OPENAI_API_KEY configured' }
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
          {
            role: 'user',
            content: `Allowed tags: ${allowedTags.join(', ')}\n\nPAGE TEXT:\n${pageText.slice(0, MAX_MODEL_CHARS)}`,
          },
        ],
      }),
    })
  } catch (err) {
    return { ok: false, reason: `model request failed: ${(err as Error).message}` }
  }
  if (!res.ok) return { ok: false, reason: `model http ${res.status}` }
  try {
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const parsed = JSON.parse(body.choices?.[0]?.message?.content ?? '{}') as Record<string, unknown>
    if (parsed.isScholarship !== true) return { ok: false, reason: 'model: page is not one specific award' }
    const str = (v: unknown) => (typeof v === 'string' ? v : '')
    return {
      ok: true,
      candidate: {
        name: str(parsed.name),
        amount: str(parsed.amount),
        deadline: str(parsed.deadline),
        summaryQuote: str(parsed.summaryQuote),
        tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t): t is string => typeof t === 'string') : [],
      },
    }
  } catch {
    return { ok: false, reason: 'model returned unreadable JSON' }
  }
}
