/** App-wide transient messages. Portaled so no transformed ancestor can trap them. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Tone = 'success' | 'error' | 'info'
type Toast = { id: number; tone: Tone; message: string }

const DEFAULT_MS = 4500
/** Errors linger: they usually carry something the reader must act on. */
const ERROR_MS = 8000

type ToastContextValue = {
  notify: (message: string, tone?: Tone) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const notify = useCallback(
    (message: string, tone: Tone = 'info') => {
      const id = nextId.current++
      setToasts((list) => [...list.slice(-2), { id, tone, message }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), tone === 'error' ? ERROR_MS : DEFAULT_MS),
      )
    },
    [dismiss],
  )

  // Clear every pending timer on unmount so nothing fires into a dead tree.
  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      pending.clear()
    }
  }, [])

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[1100] flex flex-col items-center gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
          aria-live="polite"
          aria-atomic="false"
        >
          {toasts.map((t) => (
            <ToastRow key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

const TONE_CLASS: Record<Tone, string> = {
  success: 'border-emerald-600/40 bg-emerald-600 text-white',
  error: 'border-[var(--danger)]/40 bg-[var(--danger)] text-white',
  info: 'border-[var(--border-strong)] bg-[var(--bg-solid)] text-[var(--text)]',
}

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-sm)] border px-4 py-3 text-[var(--font-size-sm)] font-medium shadow-[0_12px_32px_rgba(0,0,0,0.22)] motion-safe:animate-[toast-in_180ms_ease-out] ${TONE_CLASS[toast.tone]}`}
    >
      <span className="min-w-0 flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-my-1 -mr-1 shrink-0 rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
