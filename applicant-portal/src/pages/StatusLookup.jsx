import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { call, config } from '@shared/lib/api.js'
import { useAuth } from '@shared/lib/auth.jsx'
import Brand from '@shared/components/Brand.jsx'
import AccessMenu from '@shared/components/AccessMenu.jsx'

// Come back to an application with the mobile number plus the application number or the date of birth.
export default function StatusLookup() {
  const { start } = useAuth()
  const nav = useNavigate()
  const landing = config().landingUrl || '/'
  const [by, setBy] = useState('no')
  const [form, setForm] = useState({ phone: '', application_no: '', dob: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const data = { phone: form.phone }
      if (by === 'no') data.application_no = form.application_no
      else data.dob = form.dob
      start(await call('apply.lookup', data))
      nav('/')
    } catch (ex) {
      setError(ex.message)
      setBusy(false)
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="topbar">
        <div className="wrap">
          <Brand sub="Vidyanidhi Scholarship Programme" href={landing} />
          <div className="nav"><AccessMenu /></div>
        </div>
      </header>
      <div className="auth-shell">
        <main id="main" className="narrow" tabIndex={-1}>
          <form className="card" onSubmit={submit}>
            <h1 style={{ fontSize: '1.7rem' }}>Continue or check status</h1>
            <p className="muted mt-0">Enter your mobile number and either your application number or your date of birth.</p>
            <div className="field">
              <label htmlFor="l_phone">Mobile number</label>
              <input id="l_phone" required type="tel" inputMode="numeric" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field" role="radiogroup" aria-labelledby="l_by">
              <span className="lbl" id="l_by">I will use my</span>
              <div className="choice">
                <button type="button" role="radio" aria-checked={by === 'no'} className={by === 'no' ? 'on' : ''} onClick={() => setBy('no')}>Application number</button>
                <button type="button" role="radio" aria-checked={by === 'dob'} className={by === 'dob' ? 'on' : ''} onClick={() => setBy('dob')}>Date of birth</button>
              </div>
            </div>
            {by === 'no' ? (
              <div className="field">
                <label htmlFor="l_no">Application number</label>
                <input id="l_no" required autoCapitalize="characters" value={form.application_no} onChange={(e) => setForm({ ...form, application_no: e.target.value })} />
                <p className="hint">You received it when you submitted. If you have not submitted yet, use your date of birth.</p>
              </div>
            ) : (
              <div className="field">
                <label htmlFor="l_dob">Date of birth</label>
                <input id="l_dob" required type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              </div>
            )}
            {error && <p className="alert error" role="alert">{error}</p>}
            <button className="btn block" disabled={busy}>{busy && <span className="spinner" />}Continue</button>
            <p className="small" style={{ marginTop: '1.2rem' }}>
              New here? <Link to="/apply">Start an application</Link><br />
              Scholarship holders: <Link to="/login">sign in here</Link>
            </p>
          </form>
        </main>
      </div>
    </>
  )
}
