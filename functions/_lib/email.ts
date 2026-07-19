/** Email sending via Brevo. Stubs to a console log when BREVO_API_KEY is unset. */
import type { Env } from './types'

export type SendResult = { sent: boolean; stubbed?: boolean; error?: string }

function parseSender(from: string): { name: string; email: string } {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  if (m) return { name: m[1] || 'Scholarship One', email: m[2] }
  return { name: 'Scholarship One', email: from }
}

export async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<SendResult> {
  const key = env.BREVO_API_KEY
  const from = env.DIGEST_FROM_EMAIL || 'Scholarship One <no-reply@scholarship-one.pages.dev>'
  if (!key) {
    // Local / unconfigured: never send, just log so dev flows work.
    console.log(`[email stub] to=${to} subject=${subject}`)
    return { sent: false, stubbed: true }
  }
  const sender = parseSender(from)
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sender, to: [{ email: to }], subject, htmlContent: html }),
  })
  if (!res.ok) {
    const text = await res.text()
    return { sent: false, error: `brevo ${res.status}: ${text.slice(0, 200)}` }
  }
  return { sent: true }
}

const wrap = (inner: string) =>
  `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#2a1c14">
     <h2 style="color:#c45c26;margin:0 0 12px">Scholarship One</h2>${inner}
     <p style="color:#8a7365;font-size:12px;margin-top:24px">You received this because you use Scholarship One. Awards link to their official pages; we never invent scholarships.</p>
   </div>`

export function magicLinkHtml(link: string): string {
  return wrap(
    `<p>Click to sign in and sync your saved scholarships:</p>
     <p><a href="${link}" style="display:inline-block;background:#c45c26;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">Sign in to Scholarship One</a></p>
     <p style="color:#8a7365;font-size:13px">This link expires in 15 minutes. If you didn't request it, ignore this email.</p>`,
  )
}

export function passwordResetHtml(link: string): string {
  return wrap(
    `<p>Someone asked to reset the password on this account. Choose a new one:</p>
     <p><a href="${link}" style="display:inline-block;background:#c45c26;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">Set a new password</a></p>
     <p style="color:#8a7365;font-size:13px">This link expires in 60 minutes and can be used once. If you didn't request it, ignore this email — your password stays as it is.</p>`,
  )
}

export function contactNotificationHtml(msg: {
  name: string
  email: string
  subject: string
  message: string
}): string {
  return wrap(
    `<p><strong>New Contact Us message</strong></p>
     <p style="margin:0 0 4px"><strong>From:</strong> ${escapeHtml(msg.name)} &lt;${escapeHtml(msg.email)}&gt;</p>
     <p style="margin:0 0 12px"><strong>Subject:</strong> ${escapeHtml(msg.subject)}</p>
     <div style="white-space:pre-wrap;border-left:3px solid #e6d8cd;padding-left:12px">${escapeHtml(msg.message)}</div>`,
  )
}

export function reminderHtml(items: { name: string; deadline: string; daysLeft: number; amount: string; url: string }[]): string {
  const rows = items
    .map(
      (i) =>
        `<li style="margin:0 0 10px"><strong>${escapeHtml(i.name)}</strong> — due in ${i.daysLeft} day${i.daysLeft === 1 ? '' : 's'} (${escapeHtml(i.deadline)}) · ${escapeHtml(i.amount)}<br/><a href="${escapeHtml(i.url)}" style="color:#c45c26">Official site</a></li>`,
    )
    .join('')
  return wrap(
    `<p>Scholarship deadlines coming up for your saved awards:</p><ul style="padding-left:18px">${rows}</ul>
     <p><a href="https://scholarship-one.pages.dev/tracker" style="color:#c45c26">Open your tracker</a></p>`,
  )
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}
