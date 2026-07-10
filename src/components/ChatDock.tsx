import { useEffect, useRef, useState } from 'react'

export type ChatMessage = { role: 'user' | 'assistant'; text: string }

export type ChatDockProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: string
  product: string
  greeting?: string
}

/**
 * Floating grounded assistant.
 * Networking is isolated here so pages never call fetch themselves.
 */
export function ChatDock({
  open,
  onOpenChange,
  context,
  product,
  greeting = 'Hi — ask about this product. I use on-page data and docs, not invented facts.',
}: ChatDockProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: greeting }])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }])
    setDraft('')
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, context, product }),
      })
      const body = (await res.json()) as { message?: string; error?: string }
      if (!res.ok) throw new Error(body.error || 'Chat failed')
      setMessages((prev) => [...prev, { role: 'assistant', text: body.message || 'No response.' }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'I could not reach the AI API. The rest of the app still works with on-page data.',
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {!open && (
        <button type="button" className="chat-fab" onClick={() => onOpenChange(true)}>
          Ask AI
        </button>
      )}
      <aside className={`chat-dock${open ? ' chat-dock--open' : ''}`} aria-hidden={!open}>
        <header className="chat-header">
          <div>
            <p className="kicker">Assistant</p>
            <h2>Grounded chat</h2>
          </div>
          <button type="button" className="icon-btn" onClick={() => onOpenChange(false)} aria-label="Close chat">
            ×
          </button>
        </header>
        <div className="chat-log" role="log" aria-live="polite">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`bubble bubble--${message.role}`}>
              {message.text}
            </div>
          ))}
          {busy && <div className="bubble bubble--assistant">Thinking…</div>}
          <div ref={endRef} />
        </div>
        {error && (
          <p className="chat-error" role="alert">
            {error}
          </p>
        )}
        <form
          className="chat-form"
          onSubmit={(event) => {
            event.preventDefault()
            void send(draft)
          }}
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            placeholder="Ask about features, stack, or next steps…"
            disabled={busy}
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !draft.trim()}>
            Send
          </button>
        </form>
      </aside>
    </>
  )
}
