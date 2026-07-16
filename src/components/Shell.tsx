/**
 * App chrome: brand, search, horizontal nav, More menu, theme, chat.
 * Primary nav stays ≤4 items so mobile stays one row.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ChatDock } from './ChatDock'
import { ThemeToggle } from './ThemeToggle'
import { HeaderSearch } from './HeaderSearch'
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
  forceChatOpen?: boolean
  onHeaderSearch?: (query: string) => void
  headerSearchValue?: string
  showWorkspaceNav?: boolean
  /** Re-open welcome onboarding (level / major / background). */
  onStartOver?: () => void
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

export function Shell({
  config,
  children,
  profile,
  onProfileChange,
  chatPrompt = null,
  onChatPromptConsumed,
  onPinMatches,
  forceChatOpen = false,
  onHeaderSearch,
  headerSearchValue = '',
  showWorkspaceNav = false,
  onStartOver,
}: ShellProps) {
  const [panelOpen, setPanelOpen] = useState(preferChatOpen)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (forceChatOpen) setPanelOpen(true)
  }, [forceChatOpen])

  useEffect(() => {
    if (chatPrompt) setPanelOpen(true)
  }, [chatPrompt])

  useEffect(() => {
    if (!moreOpen) return
    function onDoc(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  function handlePanelChange(open: boolean) {
    setPanelOpen(open)
    try {
      localStorage.setItem('scholarship-one-chat-open', open ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  const moreNav = config.moreNav || []

  return (
    <div className={`shell shell--chat${panelOpen ? ' shell--chat-open' : ' shell--chat-collapsed'}`}>
      <header className="topbar glass-bar topbar--search">
        <div className="topbar__row topbar__row--primary">
          <Link to="/" className="brand">
            {config.productName}
          </Link>

          {onHeaderSearch ? (
            <div className="topbar__search">
              <HeaderSearch value={headerSearchValue} onSearch={onHeaderSearch} />
            </div>
          ) : (
            <div className="topbar__search topbar__search--spacer" />
          )}

          <div className="topbar__actions">
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
          </div>
        </div>

        <nav className="topbar__nav" aria-label="Primary">
          {showWorkspaceNav ? (
            <>
              {config.nav.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end ?? item.to === '/'}>
                  {item.label}
                </NavLink>
              ))}
              {moreNav.length > 0 ? (
                <div className="topbar__more" ref={moreRef}>
                  <button
                    type="button"
                    className={`topbar__more-btn${moreOpen ? ' is-open' : ''}`}
                    aria-expanded={moreOpen}
                    aria-haspopup="menu"
                    aria-controls="topbar-more-menu"
                    onClick={() => setMoreOpen((v) => !v)}
                  >
                    More
                  </button>
                  {moreOpen ? (
                    <ul id="topbar-more-menu" className="topbar__more-menu" role="menu">
                      {moreNav.map((item) => (
                        <li key={item.to} role="none">
                          <NavLink
                            role="menuitem"
                            to={item.to}
                            end={item.end}
                            onClick={() => setMoreOpen(false)}
                          >
                            {item.label}
                          </NavLink>
                        </li>
                      ))}
                      {onStartOver ? (
                        <li role="none">
                          <button
                            type="button"
                            role="menuitem"
                            className="topbar__more-action"
                            onClick={() => {
                              setMoreOpen(false)
                              onStartOver()
                            }}
                          >
                            Start over
                          </button>
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              {onStartOver ? (
                <button
                  type="button"
                  className="topbar__start-over"
                  onClick={onStartOver}
                  title="Re-run welcome setup (school level, major, background)"
                >
                  Start over
                </button>
              ) : null}
            </>
          ) : (
            <>
              <NavLink to="/" end>
                How it works
              </NavLink>
              {onStartOver ? (
                <button
                  type="button"
                  className="topbar__start-over"
                  onClick={onStartOver}
                  title="Re-run welcome setup"
                >
                  Start over
                </button>
              ) : null}
            </>
          )}
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>

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
