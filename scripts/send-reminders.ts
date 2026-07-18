/**
 * Daily deadline reminders. Queries D1 (HTTP API) for saved awards with a fixed
 * deadline 7 or 1 days out that haven't been reminded at that mark, emails each
 * user via Brevo, and records the mark so it never repeats.
 *
 * Run: npx tsx scripts/send-reminders.ts [--dry-run]
 * Env: CF_ACCOUNT_ID, D1_DATABASE_ID, CLOUDFLARE_API_TOKEN, BREVO_API_KEY, DIGEST_FROM_EMAIL
 */
import { CATALOG } from '../src/data/catalog'
import { selectDueReminders, type ReminderRow } from './reminderSelect'

const {
  CF_ACCOUNT_ID,
  D1_DATABASE_ID,
  CLOUDFLARE_API_TOKEN,
  BREVO_API_KEY,
  DIGEST_FROM_EMAIL,
} = process.env

const DRY = process.argv.includes('--dry-run') || !BREVO_API_KEY

const catalogById = new Map(CATALOG.map((c) => [c.id as string, c]))

async function d1(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    },
  )
  const json = (await res.json()) as { success: boolean; result?: { results: Record<string, unknown>[] }[]; errors?: unknown }
  if (!res.ok || !json.success) throw new Error(`D1 query failed: ${JSON.stringify(json.errors || json).slice(0, 200)}`)
  return json.result?.[0]?.results || []
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

async function sendBrevo(to: string, subject: string, html: string): Promise<void> {
  const from = DIGEST_FROM_EMAIL || 'Scholarship One <no-reply@scholarship-one.pages.dev>'
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  const sender = m ? { name: m[1] || 'Scholarship One', email: m[2] } : { name: 'Scholarship One', email: from }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY as string, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sender, to: [{ email: to }], subject, htmlContent: html }),
  })
  if (!res.ok) throw new Error(`brevo ${res.status}: ${(await res.text()).slice(0, 160)}`)
}

async function main() {
  if (!CF_ACCOUNT_ID || !D1_DATABASE_ID || !CLOUDFLARE_API_TOKEN) {
    console.log('[reminders] D1 not configured (CF_ACCOUNT_ID / D1_DATABASE_ID / CLOUDFLARE_API_TOKEN). Skipping.')
    return
  }
  const raw = await d1(
    `select ss.user_id as userId, u.email as email, ss.scholarship_id as scholarshipId,
            ss.deadline as deadline, ss.reminder_sent as reminderSent
       from saved_scholarships ss join users u on u.id = ss.user_id
      where ss.deadline is not null and ss.deadline <> ''`,
  )
  const rows: ReminderRow[] = raw.map((r) => ({
    userId: String(r.userId),
    email: String(r.email),
    scholarshipId: String(r.scholarshipId),
    deadline: String(r.deadline || ''),
    reminderSent: String(r.reminderSent || '').split(',').filter(Boolean),
  }))

  const groups = selectDueReminders(rows, Date.now())
  console.log(`[reminders] ${rows.length} saved rows · ${groups.length} user(s) with due reminders${DRY ? ' · DRY RUN' : ''}`)

  let sent = 0
  for (const group of groups) {
    const items = group.items
      .map((it) => {
        const c = catalogById.get(it.scholarshipId)
        return c ? { ...it, name: c.name as string, amount: c.amount as string, url: c.url as string } : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
    if (!items.length) continue

    const li = items
      .map(
        (i) =>
          `<li style="margin:0 0 10px"><strong>${esc(i.name)}</strong> — due in ${i.daysLeft} day${i.daysLeft === 1 ? '' : 's'} · ${esc(i.amount)}<br/><a href="${esc(i.url)}" style="color:#c45c26">Official site</a></li>`,
      )
      .join('')
    const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#2a1c14">
      <h2 style="color:#c45c26">Scholarship deadlines coming up</h2>
      <ul style="padding-left:18px">${li}</ul>
      <p><a href="https://scholarship-one.pages.dev/tracker" style="color:#c45c26">Open your tracker</a></p></div>`
    const subject = items.length === 1 ? `${items[0].name} — due in ${items[0].daysLeft} day(s)` : `${items.length} scholarship deadlines coming up`

    if (DRY) {
      console.log(`  [dry] ${group.email}: ${items.map((i) => `${i.scholarshipId}(${i.mark})`).join(', ')}`)
      continue
    }
    try {
      await sendBrevo(group.email, subject, html)
      for (const i of items) {
        await d1(
          `update saved_scholarships set reminder_sent =
             case when reminder_sent = '' then ? else reminder_sent || ',' || ? end
           where user_id = ? and scholarship_id = ?`,
          [i.mark, i.mark, i.userId, i.scholarshipId],
        )
      }
      sent++
      console.log(`  sent ${group.email}: ${items.length} item(s)`)
    } catch (err) {
      console.error(`  FAILED ${group.email}: ${(err as Error).message}`)
    }
  }
  console.log(`[reminders] done. ${DRY ? 'dry-run (no email sent)' : `${sent} email(s) sent`}.`)
}

main().catch((err) => {
  console.error('[reminders] fatal:', (err as Error).message)
  process.exit(1)
})
