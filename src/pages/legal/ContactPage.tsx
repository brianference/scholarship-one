/** /contact — message form backed by /api/contact. */
import { useState, type FormEvent } from 'react'
import { Breadcrumbs, CONTACT_EMAIL } from './LegalLayout'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field, TextAreaField } from '../../components/ui/Field'
import { ApiError, sendContactMessage } from '../../lib/accountApi'
import { useMeta } from '../../lib/seo'

const MIN_MESSAGE = 10

export default function ContactPage() {
  useMeta({
    title: 'Contact Us',
    description:
      'Report a broken scholarship link, suggest an award, or ask a question. A real person reads every message.',
    path: '/contact',
  })

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  /** Honeypot. Left empty by people, filled by bots. */
  const [website, setWebsite] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError('')
    const local: Record<string, string> = {}
    if (!form.name.trim()) local.name = 'Tell us your name.'
    if (!form.email.trim()) local.email = 'We need an email to reply to.'
    if (!form.subject.trim()) local.subject = 'Add a subject.'
    if (form.message.trim().length < MIN_MESSAGE) local.message = 'Add a little more detail.'
    setErrors(local)
    if (Object.keys(local).length) return

    setBusy(true)
    try {
      await sendContactMessage({ ...form, website })
      setSent(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields)
        if (!Object.keys(err.fields).length) setFormError(err.message)
      } else {
        setFormError('Could not send that. Try again in a moment.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:pt-12">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Contact Us' }]} />

      <header className="mt-4">
        <h1 className="m-0 text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">Contact Us</h1>
        <p className="mt-3 mb-0 text-base leading-relaxed text-[var(--muted)]">
          Found a scholarship that has moved or closed? Spotted a bug? Want an award added? Send it over — a real person
          reads every message.
        </p>
      </header>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_260px]">
        <div className="surface p-5 sm:p-6">
          {sent ? (
            <div className="flex flex-col gap-4">
              <Alert tone="success">
                Thanks — your message is in. We reply to <strong>{form.email.trim()}</strong>, usually within a few days.
              </Alert>
              <Button
                variant="secondary"
                onClick={() => {
                  setForm({ name: '', email: '', subject: '', message: '' })
                  setSent(false)
                }}
                className="self-start"
              >
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
              {formError && <Alert tone="error">{formError}</Alert>}

              <Field label="Your name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" required />
              <Field
                label="Your email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.email}
                onChange={set('email')}
                error={errors.email}
                hint="Only used to reply to you."
                required
              />
              <Field label="Subject" value={form.subject} onChange={set('subject')} error={errors.subject} required />
              <TextAreaField
                label="Message"
                value={form.message}
                onChange={set('message')}
                error={errors.message}
                hint="If it's about a specific scholarship, include its name or link."
                required
              />

              {/* Honeypot: hidden from people, not from bots. aria-hidden and
                  tabIndex keep it away from screen readers and keyboard users. */}
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="website">Leave this field empty</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <Button type="submit" size="lg" loading={busy} className="self-start">
                {busy ? 'Sending' : 'Send message'}
              </Button>
            </form>
          )}
        </div>

        <aside className="flex flex-col gap-5 text-[var(--font-size-sm)] leading-relaxed text-[var(--muted)]">
          <div>
            <h2 className="m-0 text-[var(--font-size)] font-bold text-[var(--text)]">Prefer email?</h2>
            <p className="mt-1.5 mb-0">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-semibold text-[var(--accent)] hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
          <div>
            <h2 className="m-0 text-[var(--font-size)] font-bold text-[var(--text)]">Response time</h2>
            <p className="mt-1.5 mb-0">This is run by one person, so expect a few days rather than a few hours.</p>
          </div>
          <div>
            <h2 className="m-0 text-[var(--font-size)] font-bold text-[var(--text)]">Please don't send</h2>
            <p className="mt-1.5 mb-0">
              Social Security numbers, bank details, or copies of financial aid forms. We never need them, and no
              legitimate scholarship asks for them by email.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}
