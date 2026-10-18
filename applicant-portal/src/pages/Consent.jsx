import { useState } from 'react'
import { call, config } from '@shared/lib/api.js'
import { useI18n } from '@shared/lib/i18n.jsx'
import { PRIVACY_VERSION } from '@shared/lib/constants.js'
import Brand from '@shared/components/Brand.jsx'
import AccessMenu from '@shared/components/AccessMenu.jsx'
import LangToggle from '@shared/components/LangToggle.jsx'

export default function Consent({ onDone }) {
  const { t } = useI18n()
  const [agree, setAgree] = useState(false)
  const [minor, setMinor] = useState(false)
  const [guardian, setGuardian] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const landing = (config().landingUrl || '').replace(/\/$/, '')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await call('consent.give', { is_minor: minor, guardian_name: guardian, version: PRIVACY_VERSION })
      await onDone()
    } catch (ex) {
      setError(ex.message)
      setBusy(false)
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">{t('skip')}</a>
      <header className="topbar">
        <div className="wrap">
          <Brand title={t('appName')} href={landing || '/'} />
          <div className="nav"><AccessMenu /><LangToggle /></div>
        </div>
      </header>
      <main id="main" className="narrow" tabIndex={-1}>
        <form className="card" onSubmit={submit}>
          <h1 style={{ fontSize: '1.7rem' }}>{t('consentTitle')}</h1>
          <p>{t('consentBody')}</p>
          <p><a href={`${landing}/privacy.html`} target="_blank" rel="noreferrer">{t('readNotice')}</a></p>
          <label className="check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>{t('consentAgree')}</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={minor} onChange={(e) => setMinor(e.target.checked)} />
            <span>{t('consentMinor')}</span>
          </label>
          {minor && (
            <div className="field" style={{ marginTop: '.75rem' }}>
              <label htmlFor="guardian">{t('guardianName')} <span className="req" aria-hidden="true">*</span></label>
              <input id="guardian" required value={guardian} onChange={(e) => setGuardian(e.target.value)} />
            </div>
          )}
          {error && <p className="alert error" role="alert">{error}</p>}
          <button className="btn block" disabled={!agree || busy}>{t('continue')}</button>
        </form>
      </main>
    </>
  )
}
