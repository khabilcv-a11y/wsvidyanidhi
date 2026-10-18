import { NavLink, Route, Routes } from 'react-router-dom'
import { config } from '@shared/lib/api.js'
import { useAuth } from '@shared/lib/auth.jsx'
import { useI18n } from '@shared/lib/i18n.jsx'
import Brand from '@shared/components/Brand.jsx'
import AccessMenu from '@shared/components/AccessMenu.jsx'
import LangToggle from '@shared/components/LangToggle.jsx'
import { AppDataProvider, useAppData } from './AppData.jsx'
import Consent from './Consent.jsx'
import Dashboard from './Dashboard.jsx'
import ApplicationForm from './ApplicationForm.jsx'
import Documents from './Documents.jsx'

function Shell() {
  const { signOut, user } = useAuth()
  const { t } = useI18n()
  return (
    <>
      <a className="skip-link" href="#main">{t('skip')}</a>
      <header className="topbar">
        <div className="wrap">
          <Brand sub={t('appName')} href={config().landingUrl || '/'} />
          <nav className="nav" aria-label="Main">
            <NavLink to="/" end>{t('dashboard')}</NavLink>
            <NavLink to="/application">{t('application')}</NavLink>
            <NavLink to="/documents">{t('documents')}</NavLink>
          </nav>
          <div className="row" style={{ gap: '.4rem' }}>
            <AccessMenu />
            <LangToggle />
            <button className="btn ghost small" onClick={signOut} title={user.email}>{t('signOut')}</button>
          </div>
        </div>
      </header>
      <main id="main" className="wrap page" tabIndex={-1}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="application" element={<ApplicationForm />} />
          <Route path="documents" element={<Documents />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
    </>
  )
}

function Body() {
  const { t } = useI18n()
  const { loading, data, error, reload } = useAppData()
  if (loading) return <main className="narrow" id="main"><p role="status"><span className="spinner" />{t('loading')}</p></main>
  if (error && !data) {
    return (
      <main className="narrow" id="main">
        <div className="card">
          <p className="alert error" role="alert">{error.message}</p>
          <button className="btn" onClick={reload}>{t('retry')}</button>
        </div>
      </main>
    )
  }
  if (!data.consented) return <Consent onDone={reload} />
  return <Shell />
}

export default function Portal() {
  return (
    <AppDataProvider>
      <Body />
    </AppDataProvider>
  )
}
