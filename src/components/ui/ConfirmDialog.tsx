/**
 * Confirmation gate for destructive actions.
 *
 * Portaled to document.body on purpose: the sticky header and card surfaces use
 * backdrop-filter, and any such ancestor becomes the containing block for
 * position:fixed, which would trap this overlay inside the header.
 */
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  /** What exactly is about to happen, including anything that cannot be undone. */
  body: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Styles the confirm button as destructive. */
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const restoreFocusTo = useRef<HTMLElement | null>(null)

  // Focus starts on Cancel, not Confirm: a stray Enter should never destroy data.
  useEffect(() => {
    if (!open) return
    restoreFocusTo.current = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    return () => restoreFocusTo.current?.focus?.()
  }, [open])

  // The page behind must not scroll while the dialog owns the screen.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCancel()
        return
      }
      if (event.key !== 'Tab') return
      // Keep focus inside the dialog.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onCancel],
  )

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/45 p-4 backdrop-blur-[2px] sm:items-center"
      onMouseDown={(e) => {
        // Only a click that both starts and ends on the backdrop dismisses,
        // so a drag that ends outside the panel does not cancel by accident.
        if (e.target === e.currentTarget) onCancel()
      }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        className="surface w-full max-w-md p-5 shadow-[0_24px_64px_rgba(0,0,0,0.28)]"
      >
        <h2 id="confirm-title" className="m-0 text-lg font-bold text-[var(--text)]">
          {title}
        </h2>
        <div id="confirm-body" className="mt-2 text-[var(--font-size-sm)] leading-relaxed text-[var(--muted)]">
          {body}
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
