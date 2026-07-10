export async function onRequestPost({ request, env }: { request: Request; env: Record<string, string | undefined> }) {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

  let payload: { message?: string; context?: string; product?: string }
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const message = (payload.message || '').trim().slice(0, 800)
  if (!message) return json({ error: 'message required' }, 400)
  const dataContext = (payload.context || '').slice(0, 12000)
  const product = (payload.product || 'app').slice(0, 40)

  const key = env.OPENAI_API_KEY
  if (!key) {
    return json({
      message:
        'AI is not configured on this deploy (missing OPENAI_API_KEY). The app UI still works with grounded on-page data.',
    })
  }

  const system = `You are the public product assistant for ${product}. Answer helpfully in 2-5 short sentences. Use ONLY the CONTEXT data. Never invent catalog rows, metrics, posts, or secrets. If CONTEXT lacks the answer, say what is missing.`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.AI_MODEL || 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 350,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `CONTEXT:\n${dataContext}\n\nUSER:\n${message}` },
        ],
      }),
    })
    if (!res.ok) {
      return json({ error: `upstream ${res.status}` }, 502)
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const text = body.choices?.[0]?.message?.content?.trim() || 'No response.'
    return json({ message: text })
  } catch {
    return json({ error: 'chat failed' }, 500)
  }
}
