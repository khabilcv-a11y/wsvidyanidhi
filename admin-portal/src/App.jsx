import { useCallback, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { call, config } from '@shared/lib/api.js'
import { isDemo } from '@shared/lib/demo.js'
import { useAuth } from '@shared/lib/auth.jsx'
import NotReady from '@shared/components/NotReady.jsx'
import Brand from '@shared/components/Brand.jsx'
import AccessMenu from '@shared/components/AccessMenu.jsx'
import GoogleButton from '@shared/components/GoogleButton.jsx'
import AdminShell from './pages/AdminShell.jsx'

function Centered({ children }) {
  return <main id="main" className="narrow" tabIndex={-1}>{children}</main>
}

function Login() {
  const { user, start } = useAuth()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const onCredential = useCallback(async (credential) => {
    setBusy(true)
    setError(null)
    try {
      start(await call('auth.google', { credential }))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }, [start])
  if (user) return <Navigate to="/" replace />
  return (
    <>
      <header className="topbar"><div className="wrap"><Brand sub="Committee portal" /><div className="nav"><AccessMenu /></div></div></header>
      <div className="auth-shell"><Centered>
        <div className="card">
          <h1 style={{ fontSize: '1.8rem' }}>Committee sign in</h1>
          <p className="muted">For scholarship committee members. Use the Google account the master admin added, and keep 2-step verification on for it.</p>
          {error && <p className="alert error" role="alert">{error}</p>}
          <GoogleButton onCredential={onCredential} disabled={busy} />
        </div>
      </Centered></div>
    </>
  )
}

function Gate() {
  const { user, loading, error, retry, signOut, isStaff } = useAuth()
  if (loading) return <Centered><p role="status"><span className="spinner" />Loading…</p></Centered>
  if (error) {
    return (
      <Centered>
        <div className="card">
          <p className="alert error" role="alert">{error.message}</p>
          <button className="btn" onClick={retry}>Try again</button>
        </div>
      </Centered>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!isStaff) {
    return (
      <Centered>
        <div className="card">
          <h1 style={{ fontSize: '1.6rem' }}>No admin access</h1>
          <p>{user.email} has not been given access to the committee portal. Ask the master admin to add this Google email.</p>
          <button className="btn outline" onClick={signOut}>Sign out</button>
        </div>
      </Centered>
    )
  }
  return <AdminShell />
}

export default function App() {
  if (!config().apiUrl && !isDemo()) return <NotReady name="Committee portal" />
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<Gate />} />
    </Routes>
  )
}
