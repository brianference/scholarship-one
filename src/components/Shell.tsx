import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ChatDock } from './ChatDock'
import { SkipLink } from './SkipLink'
import { ThemeToggle } from './ThemeToggle'
import type { SiteConfig } from '../config/site'
import { buildChatContext } from '../lib/seedContext'

export type ShellProps = {
  config: SiteConfig
  children: ReactNode
}

/**
 * App chrome shared by every page.
 * Swap product branding via SiteConfig — do not fork this component per page.
 */
export function Shell({ config, children }: ShellProps) {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <>
      <SkipLink />
      <div id="main-content" className={`shell${chatOpen ? ' shell--chat' : ''}`}>
        <header className="topbar">
          <Link to="/" className="brand">
            {config.productName}
          </Link>
          <nav className="nav" aria-label="Primary">
            {config.nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
        </header>
        <main>{children}</main>
        <ChatDock
          open={chatOpen}
          onOpenChange={setChatOpen}
          context={buildChatContext()}
          product={config.productId}
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
    </>
  )
}
