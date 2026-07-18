/** /auth?token=… — redeem a magic link, set the session, then go to Matches. */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAccount } from '../state/account'

export function AuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const account = useAccount()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setFailed(true)
      return
    }
    account.verify(token).then((ok) => {
      if (ok) navigate('/matches', { replace: true })
      else setFailed(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="page-stack" style={{ padding: '48px 16px', textAlign: 'center' }}>
      {failed ? (
        <>
          <h1 className="h2-section">This sign-in link didn't work</h1>
          <p className="lede">It may have expired or already been used. Request a new one from any page.</p>
          <Link className="btn btn-primary" to="/">
            Back to Scholarship One
          </Link>
        </>
      ) : (
        <p className="lede" role="status">
          Signing you in…
        </p>
      )}
    </div>
  )
}
