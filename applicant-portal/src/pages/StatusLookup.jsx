import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { call, config } from '@shared/lib/api.js'
import { useAuth } from '@shared/lib/auth.jsx'
import { STATUS } from '@shared/lib/constants.js'
import Brand from '@shared/components/Brand.jsx'
import AccessMenu from '@shared/components/AccessMenu.jsx'
import { DatePick } from '../components/fields.jsx'

// Come back to an application. The mobile number is needed. Add the application number or the date of birth to open it;
// with the mobile number alone, a short masked status is shown.
export default function StatusLookup() {
  const { start } = useAuth()
  const nav = useNavigate()
  const landing = config().landingUrl || '/'
  const [form, setForm] = useState({ phone: '', application_no: '', dob: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [limited, setLimited] = useState(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setLimited(null)
    try {
      const data = { phone: form.phone }
      if (form.application_no.trim()) data.application_no = form.application_no
      if (/^\d{4}-\d{2}-\d{2}$/.test(form.dob)) data.dob = form.dob
      const r = await call('apply.lookup', data)
      if (r.limited) {
        setLimited(r.items)
        setBusy(false)
        return
      }
      start(r)
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
            <p className="muted mt-0">Enter your mobile number. To open your application, also add your application number or your date of birth.</p>
            <div className="field">
              <label htmlFor="l_phone">Mobile number <span className="req" aria-hidden="true">*</span></label>
              <input id="l_phone" required type="tel" inputMode="numeric" autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="l_no">Application number (optional)</label>
              <input id="l_no" autoCapitalize="characters" value={form.application_no} onChange={(e) => set('application_no', e.target.value)} />
            </div>
            <DatePick form={form} set={set} name="dob" label="Date of birth (optional)" />
            {error && <p className="alert error" role="alert">{error}</p>}
            {limited && (
              <div className="alert" role="status">
                <div>
                  <strong>We found an application with this mobile number:</strong>
                  <ul style={{ margin: '.4rem 0' }}>
                    {limited.map((it, i) => (
                      <li key={i}>{it.name}, number {it.application_no}: {(STATUS[it.status] || {}).en || it.status}</li>
                    ))}
                  </ul>
                  <p className="mb-0">To open it, add your application number or date of birth above and press Continue.</p>
                </div>
              </div>
            )}
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
