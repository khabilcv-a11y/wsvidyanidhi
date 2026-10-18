import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@shared/lib/auth.jsx'
import { useI18n } from '@shared/lib/i18n.jsx'
import NotReady from '@shared/components/NotReady.jsx'
import { config } from '@shared/lib/api.js'
import { isDemo } from '@shared/lib/demo.js'
import AuthPage from './pages/AuthPage.jsx'
import Portal from './pages/Portal.jsx'

function Centered({ children }) {
  return <main id="main" className="narrow" tabIndex={-1}>{children}</main>
}

function Gate() {
  const { user, loading, error, retry, signOut, isStaff } = useAuth()
  const { t } = useI18n()
  const loc = useLocation()

  if (loading) return <Centered><p role="status"><span className="spinner" />{t('loading')}</p></Centered>
  if (error) {
    return (
      <Centered>
        <div className="card">
          <p className="alert error" role="alert">{error.message}</p>
          <button className="btn" onClick={retry}>{t('retry')}</button>
        </div>
      </Centered>
    )
  }
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (isStaff) {
    return (
      <Centered>
        <div className="card">
          <h1 style={{ fontSize: '1.6rem' }}>Committee account</h1>
          <p>Committee members use the admin portal, not the applicant portal.</p>
          <button className="btn outline" onClick={signOut}>{t('signOut')}</button>
        </div>
      </Centered>
    )
  }
  if (user.role === 'verifier') {
    return (
      <Centered>
        <div className="card">
          <h1 style={{ fontSize: '1.6rem' }}>Field verification</h1>
          <p className="muted">Your assigned visits will appear here in a later update.</p>
          <button className="btn outline" onClick={signOut}>{t('signOut')}</button>
        </div>
      </Centered>
    )
  }
  return <Portal />
}

export default function App() {
  if (!config().apiUrl && !isDemo()) return <NotReady name="Vidyanidhi Scholarship" />
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/forgot" element={<AuthPage mode="forgot" />} />
      <Route path="/*" element={<Gate />} />
    </Routes>
  )
}
