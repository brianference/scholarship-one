import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ChatDock } from './ChatDock'
import { ThemeToggle } from './ThemeToggle'
import type { SiteConfig } from '../config/site'
import type { Profile } from '../lib/profile'

export type ShellProps = {
  config: SiteConfig
  children: ReactNode
  profile: Profile
  onProfileChange: (profile: Profile) => void
  chatPrompt?: string | null
  onChatPromptConsumed?: () => void
  onPinMatches?: (ids: string[], saveToList?: boolean) => void
  /** Force-open match panel (e.g. after onboarding). */
  forceChatOpen?: boolean
}

function preferChatOpen(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const stored = localStorage.getItem('scholarship-one-chat-open')
    if (stored === '0') return false
    if (stored === '1') return true
  } catch {
    /* ignore */
  }
  return window.innerWidth > 900
}

/**
 * App chrome with collapsible Scholarship match panel.
 */
export function Shell({
  config,
  children,
  profile,
  onProfileChange,
  chatPrompt = null,
  onChatPromptConsumed,
  onPinMatches,
  forceChatOpen = false,
}: ShellProps) {
  const [panelOpen, setPanelOpen] = useState(preferChatOpen)

  useEffect(() => {
    if (forceChatOpen) setPanelOpen(true)
  }, [forceChatOpen])

  useEffect(() => {
    if (chatPrompt) setPanelOpen(true)
  }, [chatPrompt])

  function handlePanelChange(open: boolean) {
    setPanelOpen(open)
    try {
      localStorage.setItem('scholarship-one-chat-open', open ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={`shell shell--chat${panelOpen ? ' shell--chat-open' : ' shell--chat-collapsed'}`}>
      <header className="topbar glass-bar">
        <Link to="/" className="brand">
          {config.productName}
        </Link>
        <nav className="nav" aria-label="Primary">
          {config.nav.map((item) =>
            item.to.includes('#') ? (
              <a key={item.to} href={item.to.startsWith('/') ? item.to.slice(1) : item.to}>
                {item.label}
              </a>
            ) : (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
        <button
          type="button"
          className="btn btn-ghost topbar-match-btn"
          onClick={() => handlePanelChange(!panelOpen)}
          aria-expanded={panelOpen}
          aria-controls="scholarship-match-panel"
        >
          {panelOpen ? 'Hide match' : 'Match'}
        </button>
        <ThemeToggle />
      </header>
      <main id="main-content">{children}</main>
      <ChatDock
        alwaysVisible
        panelOpen={panelOpen}
        onPanelOpenChange={handlePanelChange}
        product={config.productId}
        profile={profile}
        onProfileChange={onProfileChange}
        pendingPrompt={chatPrompt}
        onPendingConsumed={onChatPromptConsumed}
        onPinMatches={onPinMatches}
      />
      <footer className="footer">
        <p>
          {config.footerLine}{' '}
          <a href={config.githubUrl} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </p>
        <p className="recruiter-strip">{config.stackStrip}</p>
        {config.finePrint ? <p className="fine">{config.finePrint}</p> : null}
      </footer>
    </div>
  )
}
