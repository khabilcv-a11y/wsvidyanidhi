import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { call, config } from '@shared/lib/api.js'
import { useAuth } from '@shared/lib/auth.jsx'
import Brand from '@shared/components/Brand.jsx'
import AccessMenu from '@shared/components/AccessMenu.jsx'
import { Help, PrepareList } from '../components/form.jsx'

// First page for a new applicant: what to keep ready, then name + mobile number. No account needed.
export default function ApplyStart() {
  const { start } = useAuth()
  const nav = useNavigate()
  const landing = config().landingUrl || '/'
  const [info, setInfo] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', agree: false })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    call('public.info').then(setInfo).catch(() => setInfo({ open: true, doc_types: [] }))
  }, [])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const session = await call('apply.begin', {
        name: form.name, phone: form.phone, email: form.email, agree: form.agree,
      })
      start(session)
      nav('/application')
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
      <main id="main" className="apply-start" tabIndex={-1}>
        <section className="apply-intro">
          <h1>Apply for the scholarship</h1>
          <p className="lead">No account or password is needed. Tell us your name and mobile number, fill in the form at your own pace, and add your documents at the end.</p>
          <h2 style={{ fontSize: '1.15rem' }}>What to keep ready</h2>
          <p className="muted mt-0">Open each part to see what the form asks for.</p>
          <PrepareList docs={info?.doc_types || []} />
        </section>

        <section className="card apply-card" aria-labelledby="begin-h">
          <h2 id="begin-h" style={{ fontSize: '1.4rem' }}>Start your application</h2>
          {info && !info.open ? (
            <p className="alert warn">Applications are not open right now. Please check back later.</p>
          ) : (
            <form onSubmit={submit}>
              <div className="field">
                <div className="q-head"><label htmlFor="s_name">Your full name <span className="req" aria-hidden="true">*</span></label><Help name="start_name" id="s_name" /></div>
                <input id="s_name" required autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className="field">
                <div className="q-head"><label htmlFor="s_phone">Mobile number <span className="req" aria-hidden="true">*</span></label><Help name="start_phone" id="s_phone" /></div>
                <input id="s_phone" required type="tel" inputMode="numeric" autoComplete="tel" maxLength={14} aria-describedby="s_phone_h"
                  value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                <p className="hint" id="s_phone_h">You will need this number to see your application later.</p>
              </div>
              <div className="field">
                <label htmlFor="s_email">Email address (optional)</label>
                <input id="s_email" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} aria-describedby="s_email_h" />
                <p className="hint" id="s_email_h">If you give one, we email you your application number and these details so you can keep them.</p>
              </div>
              <label className="check">
                <input type="checkbox" checked={form.agree} onChange={(e) => set('agree', e.target.checked)} />
                <span>I have read the <a href={`${landing}/privacy.html`} target="_blank" rel="noreferrer">privacy notice</a> and I agree.</span>
              </label>
              {error && <p className="alert error" role="alert">{error}</p>}
              <button className="btn accent block" disabled={busy || !form.agree}>{busy && <span className="spinner" />}Start application</button>
            </form>
          )}
          <p className="small" style={{ marginTop: '1.2rem' }}>
            Already started or applied? <Link to="/status">Continue or check status</Link><br />
            Scholarship holders: <Link to="/login">sign in here</Link>
          </p>
        </section>
      </main>
    </>
  )
}
