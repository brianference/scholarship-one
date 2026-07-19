/**
 * Account session state: who is signed in, and the magic-link actions.
 * Signed out, the app is unaffected (localStorage only). Signing in enables
 * the AccountSync layer, which mirrors the workspace to the server.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  getAccountSession,
  loginWithPassword,
  registerAccount,
  requestMagicLink,
  resetPassword,
  signOut,
  verifyToken,
} from '../lib/accountApi'

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
  /** Create a password account and sign in. Throws ApiError on failure. */
  register: (email: string, password: string) => Promise<void>
  /** Sign in with a password. Throws ApiError on failure. */
  login: (email: string, password: string) => Promise<void>
  /** Finish a password reset and sign in. Throws ApiError on failure. */
  completeReset: (token: string, password: string) => Promise<void>
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

  // These deliberately let ApiError propagate: the forms need the per-field
  // messages and the 429 retry hint, which a boolean return would discard.
  const register = useCallback(async (addr: string, password: string) => {
    const r = await registerAccount(addr, password)
    setEmail(r.email)
    setStatus('signed-in')
  }, [])

  const login = useCallback(async (addr: string, password: string) => {
    const r = await loginWithPassword(addr, password)
    setEmail(r.email)
    setStatus('signed-in')
  }, [])

  const completeReset = useCallback(async (token: string, password: string) => {
    const r = await resetPassword(token, password)
    setEmail(r.email)
    setStatus('signed-in')
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

  const value: AccountContextValue = {
    status,
    email,
    enabled,
    requestLink,
    verify,
    register,
    login,
    completeReset,
    signOut: doSignOut,
  }
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used within AccountProvider')
  return ctx
}
