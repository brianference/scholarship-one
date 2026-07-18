/** Topbar account control: "Sign in" when signed out; email + sign out when in. */
import { useEffect, useRef, useState } from 'react'
import { useAccount } from '../state/account'
import { SignInModal } from './SignInModal'

export function AccountButton() {
  const account = useAccount()
  const [modal, setModal] = useState(false)
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menu])

  // Hide entirely until accounts are usable (email delivery configured server-side).
  if (account.status === 'loading' || !account.enabled) return null

  if (account.status === 'signed-out') {
    return (
      <>
        <button type="button" className="btn btn-ghost topbar-account-btn" onClick={() => setModal(true)}>
          Sign in
        </button>
        {modal ? <SignInModal onClose={() => setModal(false)} /> : null}
      </>
    )
  }

  const short = (account.email || '').split('@')[0]
  return (
    <div className="topbar__more" ref={ref}>
      <button
        type="button"
        className={`btn btn-ghost topbar-account-btn${menu ? ' is-open' : ''}`}
        aria-expanded={menu}
        aria-haspopup="menu"
        onClick={() => setMenu((v) => !v)}
        title={account.email || 'Account'}
      >
        ✓ {short}
      </button>
      {menu ? (
        <ul className="topbar__more-menu" role="menu">
          <li role="none">
            <span className="topbar__account-email" aria-hidden="true">
              {account.email}
            </span>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="topbar__more-action"
              onClick={() => {
                void account.signOut()
                setMenu(false)
              }}
            >
              Sign out
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  )
}
