/**
 * Account session state: who is signed in, and the magic-link actions.
 * Signed out, the app is unaffected (localStorage only). Signing in enables
 * the AccountSync layer, which mirrors the workspace to the server.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getAccountSession, requestMagicLink, signOut, verifyToken } from '../lib/accountApi'

type AccountStatus = 'loading' | 'signed-out' | 'signed-in'

type AccountContextValue = {
  status: AccountStatus
  email: string | null
  /** Whether accounts are usable (email delivery configured on the server). */
  enabled: boolean
  /** Send a magic link; returns devLink in local dev only. */
  requestLink: (email: string) => Promise<{ ok: boolean; devLink?: string }>
  /** Redeem a token (from the /auth route). */
  verify: (token: string) => Promise<boolean>
  signOut: () => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AccountStatus>('loading')
  const [email, setEmail] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let alive = true
    getAccountSession()
      .then((s) => {
        if (!alive) return
        setEmail(s.email)
        setEnabled(s.enabled !== false)
        setStatus(s.email ? 'signed-in' : 'signed-out')
      })
      .catch(() => {
        if (!alive) return
        setStatus('signed-out')
      })
    return () => {
      alive = false
    }
  }, [])

  const requestLink = useCallback((addr: string) => requestMagicLink(addr), [])

  const verify = useCallback(async (token: string) => {
    try {
      const r = await verifyToken(token)
      if (r.ok) {
        setEmail(r.email)
        setStatus('signed-in')
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  const doSignOut = useCallback(async () => {
    try {
      await signOut()
    } catch {
      /* ignore */
    }
    setEmail(null)
    setStatus('signed-out')
  }, [])

  const value: AccountContextValue = { status, email, enabled, requestLink, verify, signOut: doSignOut }
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used within AccountProvider')
  return ctx
}
