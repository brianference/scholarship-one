type ChatTurn = { role: 'user' | 'assistant'; content: string }
type MatchOut = { id: string; reason: string }

function extractCatalogIds(context: string): Set<string> {
  const ids = new Set<string>()
  try {
    const parsed = JSON.parse(context) as { catalog?: { id?: string }[] }
    for (const row of parsed.catalog || []) {
      if (row?.id) ids.add(String(row.id))
    }
  } catch {
    /* ignore */
  }
  return ids
}

export async function onRequestPost({ request, env }: { request: Request; env: Record<string, string | undefined> }) {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })

  let payload: {
    message?: string
    context?: string
    product?: string
    history?: ChatTurn[]
  }
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const message = (payload.message || '').trim().slice(0, 1000)
  if (!message) return json({ error: 'message required' }, 400)
  const dataContext = (payload.context || '').slice(0, 16000)
  const product = (payload.product || 'scholarship-one').slice(0, 40)
  const history = Array.isArray(payload.history) ? payload.history.slice(-12) : []
  const validIds = extractCatalogIds(dataContext)

  const key = env.OPENAI_API_KEY
  if (!key) {
    return json({
      stage: 'clarify',
      message:
        'The online assistant is not configured right now. Use the scholarship list and filters on this page — every award is real. Pick a school level, major, or need below to get started.',
      questions: [
        'Undergraduate',
        'High school senior',
        'Nursing',
        'Engineering / STEM',
        'Hispanic / Latino / Mexican',
        'Need-based aid',
      ],
      questionGroups: true,
      matches: [],
    })
  }

  const system = `You are the Scholarship match assistant for ${product}.
You help students find scholarships from CONTEXT.catalog only. CONTEXT may also include userProfile (level, major, identity, need, state) already set on the page.

Be a smart coach:
- Use the full conversation history and userProfile together.
- Short phrases about students, majors, sports, disability, or aid ARE on-topic (e.g. "handicapped student track math", "Latina sports", "nursing Pell"). Treat them as search queries and return stage "preview" with catalog matches.
- Only use the off-topic line for true non-scholarship chatter (trivia, weather, jokes with no student/aid intent). If in doubt, search the catalog.
- If you already know enough (from message + history + userProfile) to recommend 2-5 programs, use stage "preview". Do not over-ask.
- If the request is partial (e.g. Mexican women in sports, disability + math + track), return closest catalog ids with an honest one-sentence lead-in. Never invent programs.
- Prefer concrete, warm, plain English. No jargon like "grounded" or "Match AI".

Stages:
- clarify: need more detail. matches []. Ask for school level, major/field, and/or background/needs. Provide short chip labels in questions.
- preview: enough to recommend. matches 2-5 catalog ids with reasons. message is a short intro only (UI shows cards). Invite them to save programs they want.
- confirmed: user said save/yes/confirm. Return the same matches again.

STRICT JSON only:
{"stage":"clarify"|"preview"|"confirmed","message":"string","questions":["chip labels"],"matches":[{"id":"catalog-id","reason":"why it fits"}]}

Catalog guidance (ids must exist in CONTEXT.catalog):
- Hispanic / Mexican / Latina: hispanic, hsf-athletes, lulac-scholarship, la-raza-scholarships, shpe-scholarships, dream-us
- Women + sports / track: wsf-grants, ncaa-postgrad, hsf-athletes, lulac-scholarship, aauw-fellowships
- Black students: uncf, jackie-robinson, ron-brown, gates, thurgood, nbmbaa, nsbe-scholarships, nbna-scholarships, united-negro-college, acs-scholars
- Marketing/business: ama-foundation, nbmbaa, deloitte
- STEM / math: smart-scholarship, goldwater, swe-scholarships, nsbe-scholarships, shpe-scholarships, generation-google, acs-scholars
- Disability / handicapped / accessibility: google-lime, microsoft-disability, aahd-krause, incight-scholarship, nfb-scholarship
- Nursing: nurse-corps, aacn-nursing, nbna-scholarships, aftercollege-aacn
- Need / FAFSA / first-gen: pell, fastweb-note, jack-kent, uncf, dell-scholars, horatio-alger, burger-king-scholars, elks-mvs
- Community college transfer: jack-kent-transfer
- Asian / Pacific Islander: apia-scholarship
- LGBTQ: point-foundation
- Military family: nmfa-military
- DACA / undocumented: dream-us
- State / regional: cal-grant, texas-grant, excelsior-ny, bright-futures-fl, illinois-map, wa-college-grant, arizona-leap, hope-georgia, ohio-ocog, pa-state-grant, massgrant, oregon-opportunity, michigan-tuition-grant, colorado-student-grant, nc-need-based, virginia-schev, nj-tag, minnesota-state-grant

questions chips should be short answers a student can tap (e.g. "Undergraduate", "Math", "Student with a disability", "Student athlete").
ASCII punctuation only.`

  const historyMessages = history
    .filter((h) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
    .map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content.slice(0, 1500) }))

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.AI_MODEL || 'gpt-4o-mini',
        temperature: 0.35,
        max_tokens: 750,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          {
            role: 'system',
            content: `CONTEXT JSON (catalog + optional userProfile):\n${dataContext || '{"catalog":[]}'}\n\nUse userProfile when present to avoid re-asking known facts.`,
          },
          ...historyMessages,
          { role: 'user', content: message },
        ],
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return json({ error: `upstream ${res.status}`, detail: errText.slice(0, 200) }, 502)
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const raw = body.choices?.[0]?.message?.content?.trim() || '{}'
    let parsed: {
      stage?: string
      message?: string
      questions?: string[]
      matches?: MatchOut[]
    }
    try {
      parsed = JSON.parse(raw) as typeof parsed
    } catch {
      return json({
        stage: 'clarify',
        message:
          'I hit a snag reading that reply. Tell me your school level, major or field, and any background or aid needs.',
        questions: ['Undergraduate', 'High school senior', 'Nursing', 'Hispanic / Latino / Mexican', 'Need-based aid'],
        matches: [],
      })
    }

    const stage =
      parsed.stage === 'preview' || parsed.stage === 'confirmed' || parsed.stage === 'clarify'
        ? parsed.stage
        : 'clarify'

    let matches = Array.isArray(parsed.matches)
      ? parsed.matches
          .filter((m) => m && typeof m.id === 'string')
          .map((m) => ({
            id: String(m.id).slice(0, 40),
            reason: String(m.reason || '').slice(0, 200),
          }))
          .slice(0, 6)
      : []

    if (validIds.size) {
      matches = matches.filter((m) => validIds.has(m.id))
    }

    let questions = Array.isArray(parsed.questions)
      ? parsed.questions.map((q) => String(q).slice(0, 80)).filter(Boolean).slice(0, 12)
      : []

    if (stage === 'clarify' && questions.length < 4) {
      questions = [
        'Undergraduate',
        'High school senior',
        'Nursing',
        'Engineering / STEM',
        'Hispanic / Latino / Mexican',
        'Woman / female student',
        'Need-based aid',
        'Student athlete',
        ...questions,
      ].slice(0, 12)
    }

    return json({
      stage,
      message: (parsed.message || 'Tell me a bit more about what you need.').slice(0, 2500),
      questions,
      matches,
      useOptionGroups: stage === 'clarify',
    })
  } catch {
    return json({ error: 'chat failed' }, 500)
  }
}
