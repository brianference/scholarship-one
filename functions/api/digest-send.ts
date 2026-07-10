type DigestItem = {
  name?: string
  deadline?: string
  amount?: string
  url?: string
  daysLeft?: number | null
}

/**
 * Email a weekly-style deadline digest via Resend (when RESEND_API_KEY is set).
 * Body is provided by the client from the user's saved list (privacy: no server-side profile store required).
 */
export async function onRequestPost({ request, env }: { request: Request; env: Record<string, string | undefined> }) {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })

  let payload: { email?: string; items?: DigestItem[]; weekLabel?: string }
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const email = String(payload.email || '')
    .trim()
    .toLowerCase()
    .slice(0, 120)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'valid email required' }, 400)
  }

  const items = Array.isArray(payload.items) ? payload.items.slice(0, 40) : []
  const weekLabel = String(payload.weekLabel || 'This week').slice(0, 80)
  const key = env.RESEND_API_KEY
  const from = env.DIGEST_FROM_EMAIL || 'Scholarship One <onboarding@resend.dev>'

  if (!key) {
    return json({
      ok: false,
      configured: false,
      error:
        'Email is not configured on the server yet. Use Copy digest or Email to myself (mailto) on the digest panel.',
    })
  }

  const rows =
    items.length === 0
      ? '<p>No fixed deadlines in the next week. Check rolling / FAFSA programs on Scholarship One.</p>'
      : `<ul>${items
          .map((item) => {
            const name = escapeHtml(String(item.name || 'Program'))
            const deadline = escapeHtml(String(item.deadline || ''))
            const amount = escapeHtml(String(item.amount || ''))
            const url = String(item.url || '').startsWith('https://') ? item.url : '#'
            const days =
              typeof item.daysLeft === 'number' ? ` · due in ${item.daysLeft} day(s)` : ''
            return `<li><strong>${name}</strong><br/>${deadline}${days} · ${amount}<br/><a href="${escapeHtml(String(url))}">Official site</a></li>`
          })
          .join('')}</ul>`

  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.45;color:#1a1a1a">
    <h1 style="font-size:1.25rem">Your scholarship deadline digest</h1>
    <p>${escapeHtml(weekLabel)}</p>
    ${rows}
    <p style="color:#555;font-size:13px">Always confirm deadlines on the official program site. Sent from Scholarship One.</p>
    <p><a href="https://scholarship-one.pages.dev/#digest">Open Scholarship One</a></p>
  </body></html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Scholarship deadlines · ${weekLabel}`,
        html,
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return json({ error: 'email send failed', detail: detail.slice(0, 200) }, 502)
    }
    return json({ ok: true, configured: true })
  } catch {
    return json({ error: 'email send failed' }, 500)
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
