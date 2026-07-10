import { useEffect, useRef, useState } from 'react'
import {
  buildClosestFitMessage,
  buildPreviewMessage,
  filterValidMatches,
  isSpecificQuery,
  matchCatalog,
  mergeMatches,
  type MatchHit,
} from '../lib/matchCatalog'
import { ChatMessageView } from './ChatMessageView'
import { CHAT_OPTION_GROUPS } from '../lib/profileOptions'
import type { Profile } from '../lib/profile'
import { applyChipToProfile } from '../lib/applyChipToProfile'
import { buildChatContext } from '../lib/seedContext'

export type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
  stage?: 'clarify' | 'preview' | 'confirmed'
  questions?: string[]
  matches?: MatchHit[]
  showOptionGroups?: boolean
}

export type ChatDockProps = {
  open?: boolean
  /** When false, panel is collapsed (mobile FAB / desktop toggle). */
  panelOpen?: boolean
  onPanelOpenChange?: (open: boolean) => void
  alwaysVisible?: boolean
  onOpenChange?: (open: boolean) => void
  product: string
  profile: Profile
  onProfileChange?: (profile: Profile) => void
  greeting?: string
  pendingPrompt?: string | null
  onPendingConsumed?: () => void
  onPinMatches?: (ids: string[], saveToList?: boolean) => void
}

const DEFAULT_GREETING =
  'Tell me your school level, major or field, and any background or needs. I will suggest real scholarships you can save to your list.'

const CONFIRM_RE =
  /^(yes|yep|yeah|confirm|save|pin|show( them)?|looks good|do it|ok|okay|please save|save these|save to my list)\b/i

/**
 * Always-visible Scholarship match panel (LLM-backed).
 */
export function ChatDock({
  open = true,
  panelOpen = true,
  onPanelOpenChange,
  alwaysVisible = false,
  product,
  profile,
  onProfileChange,
  greeting = DEFAULT_GREETING,
  pendingPrompt = null,
  onPendingConsumed,
  onPinMatches,
}: ChatDockProps) {
  const isOpen = alwaysVisible || open
  const expanded = panelOpen
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: greeting, stage: 'clarify', showOptionGroups: true },
  ])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingPin, setPendingPin] = useState<MatchHit[]>([])
  const endRef = useRef<HTMLDivElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pendingHandled = useRef<string | null>(null)
  const profileRef = useRef(profile)
  const hasUserMessages = useRef(false)
  profileRef.current = profile

  // Keep scroll at top on first paint; only auto-scroll after the user has messaged
  useEffect(() => {
    const log = logRef.current
    if (!log) return
    if (!hasUserMessages.current) {
      log.scrollTop = 0
      // Second pass after layout so tall option lists never stick at the bottom
      requestAnimationFrame(() => {
        if (logRef.current && !hasUserMessages.current) logRef.current.scrollTop = 0
      })
      return
    }
    log.scrollTop = log.scrollHeight
  }, [messages, busy])

  useEffect(() => {
    if (!pendingPrompt || !isOpen) return
    if (pendingHandled.current === pendingPrompt) return
    pendingHandled.current = pendingPrompt
    onPanelOpenChange?.(true)
    void send(pendingPrompt)
    onPendingConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt, isOpen])

  function userTranscript(extra = ''): string {
    return [...messages.filter((m) => m.role === 'user').map((m) => m.text), extra].join(' \n ')
  }

  function pinMatches(hits: MatchHit[], userAck?: string) {
    const valid = filterValidMatches(hits)
    if (!valid.length) return
    onPinMatches?.(valid.map((h) => h.id), true)
    setMessages((prev) => [
      ...prev,
      ...(userAck ? [{ role: 'user' as const, text: userAck }] : []),
      {
        role: 'assistant' as const,
        text: 'Saved to your scholarship list. Open **Official website** on each card to apply on the program’s own page.',
        stage: 'confirmed' as const,
        matches: valid,
      },
    ])
    setPendingPin([])
  }

  async function send(text: string, _fromChip = false) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setError(null)

    if (CONFIRM_RE.test(trimmed) && pendingPin.length) {
      setDraft('')
      pinMatches(pendingPin, trimmed)
      return
    }

    // Free-text and chips both update the on-page profile so ranking + LLM stay in sync
    if (onProfileChange) {
      onProfileChange(applyChipToProfile(profileRef.current, trimmed))
    }

    hasUserMessages.current = true
    const nextUser: ChatMessage = { role: 'user', text: trimmed }
    setMessages((prev) => [...prev, nextUser])
    setDraft('')
    setBusy(true)

    const historyForApi = [...messages, nextUser]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.text }))

    const context = buildChatContext(profileRef.current)
    const local = matchCatalog(userTranscript(trimmed), 6)
    const localIsStrong = local.length >= 1 && (local[0]?.score ?? 0) >= 28

    // Optimistic path: show catalog matches immediately, pin the main list, then refine with the LLM
    let usedOptimistic = false
    if (localIsStrong) {
      usedOptimistic = true
      setPendingPin(local)
      onPinMatches?.(local.map((h) => h.id), false)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: buildClosestFitMessage(trimmed, local),
          stage: 'preview',
          matches: local,
          questions: ['Need-based aid', "I'm a high school senior", 'Student athlete', 'Student with a disability'],
          showOptionGroups: false,
        },
      ])
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          context,
          product,
          history: historyForApi.slice(0, -1),
        }),
      })
      const body = (await res.json()) as {
        message?: string
        error?: string
        stage?: 'clarify' | 'preview' | 'confirmed'
        questions?: string[]
        matches?: { id: string; reason?: string }[]
        useOptionGroups?: boolean
      }
      if (!res.ok) throw new Error(body.error || 'Chat failed')

      let stage = body.stage || 'clarify'
      const aiHits: MatchHit[] = filterValidMatches(
        (body.matches || []).map((m) => ({
          id: m.id,
          reason: m.reason || '',
          score: 55,
        })),
      )

      let matches = mergeMatches(aiHits, local, 5)
      const modelGaveUp =
        /don'?t have|do not have|no specific|none in (the )?catalog|couldn'?t find|no scholarships|i do not have/i.test(
          body.message || '',
        )
      const modelSaysOffTopic =
        /only (assist|help) with scholarship|scholarship-related|not able to (help|answer)|unrelated|off[-\s]?topic/i.test(
          body.message || '',
        )
      const offTopic = modelSaysOffTopic && local.length === 0 && aiHits.length === 0
      const shouldShowLocal =
        localIsStrong &&
        (modelGaveUp ||
          modelSaysOffTopic ||
          stage === 'clarify' ||
          aiHits.length === 0 ||
          isSpecificQuery(trimmed))

      if (shouldShowLocal) {
        matches = mergeMatches(aiHits, local, 5)
        if (matches.length === 0) matches = local
        stage = 'preview'
      }

      if (aiHits.length >= 2 && !modelGaveUp && !modelSaysOffTopic) {
        matches = mergeMatches(aiHits, local, 5)
        stage = stage === 'clarify' ? 'preview' : stage
      }

      if (stage === 'confirmed' && matches.length) {
        stage = 'preview'
      }

      // If we already showed a strong local preview, keep it unless AI improves the set
      if (usedOptimistic && stage !== 'preview') {
        stage = 'preview'
        matches = local
      }

      let message =
        body.message ||
        'Tell me your school level, major or field, and any background or aid needs that matter.'
      let questions = (body.questions || []).slice(0, 12)
      let showOptionGroups = stage === 'clarify' || Boolean(body.useOptionGroups) || offTopic

      if (stage === 'preview' && matches.length) {
        const usedLocalFallback =
          modelGaveUp || modelSaysOffTopic || (aiHits.length === 0 && local.length > 0) || shouldShowLocal
        message = usedLocalFallback
          ? buildClosestFitMessage(trimmed, matches)
          : buildPreviewMessage(matches, body.message?.split('\n')[0])
        if (modelSaysOffTopic || /only (assist|help) with scholarship/i.test(message)) {
          message = buildClosestFitMessage(trimmed, matches)
        }
        questions = questions.filter((q) => !/confirm|save these|pin to shortlist/i.test(q)).slice(0, 4)
        if (!questions.length) {
          questions = ['Need-based aid', "I'm a high school senior", 'Student athlete']
        }
        showOptionGroups = false
        setPendingPin(matches)
        onPinMatches?.(matches.map((h) => h.id), false)
      } else if (!usedOptimistic) {
        matches = []
        showOptionGroups = true
        if (!questions.length) {
          questions = CHAT_OPTION_GROUPS.flatMap((g) => g.chips).slice(0, 12)
        }
      }

      // Replace optimistic message, or append if we never showed one
      setMessages((prev) => {
        if (usedOptimistic && stage === 'preview' && matches.length) {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant' && last.stage === 'preview') {
            next[next.length - 1] = {
              role: 'assistant',
              text: message,
              stage,
              questions,
              matches,
              showOptionGroups: false,
            }
            return next
          }
        }
        if (usedOptimistic && stage !== 'preview') {
          // Keep the optimistic cards; do not replace with empty clarify
          return prev
        }
        return [
          ...prev,
          {
            role: 'assistant',
            text: message,
            stage,
            questions,
            matches,
            showOptionGroups,
          },
        ]
      })
    } catch {
      setError(null)
      if (usedOptimistic) {
        // Local cards already visible
      } else if (local.length >= 1 && isSpecificQuery(trimmed)) {
        setPendingPin(local)
        onPinMatches?.(local.map((h) => h.id), false)
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: buildPreviewMessage(
              local,
              'The online assistant is temporarily unavailable. Here are the closest programs from our list. Save any you want, or refine your search.',
            ),
            stage: 'preview',
            matches: local,
            questions: ['Need-based aid', "I'm a high school senior", "I'm an undergrad"],
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: 'The online assistant is temporarily unavailable. Choose a school level, major, or need below, or use the filters on the scholarship list.',
            stage: 'clarify',
            showOptionGroups: true,
            questions: CHAT_OPTION_GROUPS.flatMap((g) => g.chips).slice(0, 12),
          },
        ])
      }
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (pendingPrompt) inputRef.current?.focus()
  }, [pendingPrompt])

  return (
    <>
      {!expanded ? (
        <button
          type="button"
          className="chat-fab"
          onClick={() => onPanelOpenChange?.(true)}
          aria-expanded={false}
          aria-controls="scholarship-match-panel"
        >
          Scholarship match
        </button>
      ) : null}
      <aside
        id="scholarship-match-panel"
        className={`chat-dock${expanded ? ' chat-dock--open chat-dock--persistent' : ' chat-dock--collapsed'}${alwaysVisible ? ' chat-dock--shell' : ''}`}
        aria-label="Scholarship match"
        hidden={!expanded}
      >
        <header className="chat-header">
          <div>
            <p className="kicker">Assistant</p>
            <h2>Scholarship match</h2>
          </div>
          <div className="chat-header__actions">
            <span className="chat-live-pill" aria-hidden="true">
              Ready
            </span>
            <button
              type="button"
              className="btn btn-ghost chat-collapse-btn"
              onClick={() => onPanelOpenChange?.(false)}
              aria-label="Collapse Scholarship match panel"
            >
              Collapse
            </button>
          </div>
        </header>
        <div className="chat-log" ref={logRef} role="log" aria-live="polite">
          {messages.map((message, index) => (
            <ChatMessageView
              key={`${message.role}-${index}`}
              role={message.role}
              text={message.text}
              matches={message.matches}
              stage={message.stage}
              questions={message.questions}
              optionGroups={message.showOptionGroups ? CHAT_OPTION_GROUPS : undefined}
              optionsStartCollapsed
              showConfirm={message.stage === 'preview' && Boolean(message.matches?.length)}
              onQuestion={(q) => {
                void send(q, true)
              }}
              onConfirm={() => pinMatches(message.matches?.length ? message.matches : pendingPin, 'Save these')}
            />
          ))}
          {busy && <div className="bubble bubble--assistant">Looking through scholarships…</div>}
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
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            placeholder="School level, major, background, needs…"
            disabled={busy}
            aria-label="Message for Scholarship match"
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !draft.trim()}>
            Send
          </button>
        </form>
      </aside>
    </>
  )
}
