import { useState } from 'react'
import { formatChatText } from '../lib/formatChat'
import { catalogByIds } from '../lib/matchCatalog'
import type { MatchHit } from '../lib/matchCatalog'
import type { CHAT_OPTION_GROUPS } from '../lib/profileOptions'

export type ChatMessageViewProps = {
  role: 'user' | 'assistant'
  text: string
  matches?: MatchHit[]
  stage?: 'clarify' | 'preview' | 'confirmed'
  questions?: string[]
  optionGroups?: typeof CHAT_OPTION_GROUPS
  /** Start option groups collapsed (default true for compact dock). */
  optionsStartCollapsed?: boolean
  onQuestion?: (q: string) => void
  onConfirm?: () => void
  showConfirm?: boolean
}

/** Pretty chat bubble with links, mini scholarship cards, compact option chips. */
export function ChatMessageView({
  role,
  text,
  matches = [],
  stage,
  questions = [],
  optionGroups,
  optionsStartCollapsed = true,
  onQuestion,
  onConfirm,
  showConfirm = false,
}: ChatMessageViewProps) {
  const [optionsExpanded, setOptionsExpanded] = useState(!optionsStartCollapsed)
  const programs = catalogByIds(matches.map((m) => m.id))
  const reasonById = new Map(matches.map((m) => [m.id, m.reason]))
  const refineChips = questions.filter((q) => !/confirm|save these|pin to shortlist|looks good/i.test(q))
  const showGroups = role === 'assistant' && stage === 'clarify' && optionGroups && optionGroups.length > 0

  const collapsedChips =
    optionGroups?.flatMap((group) => group.chips.slice(0, 1)).slice(0, 4) ?? []
  const groupsToShow = optionsExpanded ? optionGroups : null

  return (
    <div className={`bubble bubble--${role}`}>
      <div className="bubble__text">{formatChatText(text)}</div>

      {programs.length > 0 && (
        <ul className="chat-match-list">
          {programs.map((item) => (
            <li key={item.id} className="chat-match-card">
              <div className="chat-match-card__top">
                <strong>{item.name}</strong>
                <span className="chat-match-card__amt">{item.amount}</span>
              </div>
              <p className="chat-match-card__reason">{reasonById.get(item.id) || item.summary}</p>
              <p className="chat-match-card__meta">Deadline · {item.deadline}</p>
              <a
                className="chat-match-card__link"
                href={item.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`${item.name} official website (opens in a new tab)`}
              >
                Official website
              </a>
            </li>
          ))}
        </ul>
      )}

      {showGroups ? (
        <div className="chat-options">
          {optionsExpanded && groupsToShow
            ? groupsToShow.map((group) => (
                <div key={group.title} className="chat-option-group">
                  <p className="chat-option-group__title">{group.title}</p>
                  <div className="chat-quick" aria-label={group.title}>
                    {group.chips.map((chip) => (
                      <button key={chip} type="button" className="canned__chip" onClick={() => onQuestion?.(chip)}>
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            : (
                <div className="chat-quick" aria-label="Quick options">
                  {collapsedChips.map((chip) => (
                    <button key={chip} type="button" className="canned__chip" onClick={() => onQuestion?.(chip)}>
                      {chip}
                    </button>
                  ))}
                </div>
              )}
          <button
            type="button"
            className="chat-options__toggle"
            onClick={() => setOptionsExpanded((open) => !open)}
            aria-expanded={optionsExpanded}
          >
            {optionsExpanded ? 'Show less' : 'Show more options'}
          </button>
        </div>
      ) : null}

      {role === 'assistant' && !showGroups && refineChips.length > 0 && (
        <div className="chat-quick" aria-label="Quick replies">
          {(optionsExpanded ? refineChips : refineChips.slice(0, 4)).map((q) => (
            <button key={q} type="button" className="canned__chip" onClick={() => onQuestion?.(q)}>
              {q}
            </button>
          ))}
          {refineChips.length > 4 ? (
            <button
              type="button"
              className="chat-options__toggle"
              onClick={() => setOptionsExpanded((open) => !open)}
              aria-expanded={optionsExpanded}
            >
              {optionsExpanded ? 'Show less' : 'Show more options'}
            </button>
          ) : null}
        </div>
      )}

      {role === 'assistant' && showConfirm && stage === 'preview' && programs.length > 0 && (
        <div className="chat-confirm-row">
          <button type="button" className="btn btn-primary chat-confirm-btn" onClick={onConfirm}>
            Save to my list
          </button>
        </div>
      )}
    </div>
  )
}
