import { useEffect, useRef, useState } from 'react'

type Msg = { role: 'user' | 'assistant'; text: string }

export function ChatDock({
  open,
  onOpenChange,
  context,
  product,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  context: string
  product: string
}) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      text: 'Hi — ask me anything about this product. I answer from the on-page data and docs, not invented facts.',
    },
  ])
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
    setMessages((m) => [...m, { role: 'user', text: trimmed }])
    setDraft('')
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, context, product }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Chat failed')
      setMessages((m) => [...m, { role: 'assistant', text: body.message }])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Chat failed'
      setError(msg)
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'I could not reach the AI API just now. Browse the App tab — all core data is still available offline in the UI.',
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
          {messages.map((m, i) => (
            <div key={i} className={`bubble bubble--${m.role}`}>
              {m.text}
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
          onSubmit={(e) => {
            e.preventDefault()
            void send(draft)
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Ask about features, data, or next steps…"
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
