/** Inline status banner for form-level success, error, and informational messages. */
import type { ReactNode } from 'react'

type Tone = 'error' | 'success' | 'info'

const TONES: Record<Tone, { wrap: string; icon: string; label: string }> = {
  error: {
    wrap: 'border-[var(--danger)]/35 bg-[var(--danger)]/8 text-[var(--danger)]',
    icon: 'M12 8v5m0 3h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
    label: 'Error',
  },
  success: {
    wrap: 'border-emerald-600/35 bg-emerald-600/8 text-emerald-700 dark:text-emerald-400',
    icon: 'M20 6 9 17l-5-5',
    label: 'Success',
  },
  info: {
    wrap: 'border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--text)]',
    icon: 'M12 16v-5m0-3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    label: 'Note',
  },
}

export function Alert({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone]
  return (
    <div
      // Errors interrupt; success and info wait for a pause in speech.
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-[var(--radius-sm)] border px-3.5 py-3 text-[var(--font-size-sm)] ${t.wrap}`}
    >
      <svg
        className="mt-0.5 size-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={t.icon} />
      </svg>
      <span className="sr-only">{t.label}: </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
