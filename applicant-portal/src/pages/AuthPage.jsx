import { useCallback, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { call, config } from '@shared/lib/api.js'
import { useAuth } from '@shared/lib/auth.jsx'
import { useI18n } from '@shared/lib/i18n.jsx'
import { isDemo } from '@shared/lib/demo.js'
import Brand from '@shared/components/Brand.jsx'
import AccessMenu from '@shared/components/AccessMenu.jsx'
import GoogleButton from '@shared/components/GoogleButton.jsx'

export default function AuthPage({ mode }) {
  const { t } = useI18n()
  const { user, start } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '', code: '' })
  const [step, setStep] = useState('form') // form | code
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [devCode, setDevCode] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const finish = useCallback((session) => {
    start(session)
    nav(loc.state?.from || '/', { replace: true })
  }, [start, nav, loc.state])

  const run = useCallback(async (fn) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }, [])

  const onGoogle = useCallback((credential) => run(async () => finish(await call('auth.google', { credential }))), [run, finish])

  if (user) return <Navigate to="/" replace />

  const submit = (e) => {
    e.preventDefault()
    run(async () => {
      if (mode === 'login') {
        finish(await call('auth.login', { email: form.email, password: form.password }))
      } else if (mode === 'register') {
        if (step === 'form') {
          const r = await call('auth.register', { email: form.email, password: form.password, name: form.name })
          setDevCode(r.dev_code || null)
          setNotice(t('codeSent'))
          setStep('code')
        } else {
          finish(await call('auth.verify', { email: form.email, code: form.code }))
        }
      } else if (step === 'form') {
        const r = await call('auth.forgot', { email: form.email })
        setDevCode(r.dev_code || null)
        setNotice(t('codeSent'))
        setStep('code')
      } else {
        finish(await call('auth.reset', { email: form.email, code: form.code, password: form.password }))
      }
    })
  }

  const title = mode === 'login' ? t('welcomeBack') : mode === 'register' ? t('signUp') : t('resetTitle')
  const lead = mode === 'login' ? t('signInLead') : mode === 'register' ? t('createLead') : t('resetLead')
  const landing = config().landingUrl || '/'

  return (
    <>
      <a className="skip-link" href="#main">{t('skip')}</a>
      <header className="topbar">
        <div className="wrap">
          <Brand sub={t('appName')} href={landing} />
          <div className="nav">
            <AccessMenu />
          </div>
        </div>
      </header>
      <div className="auth-shell">
      <main id="main" className="narrow" tabIndex={-1}>
        <div className="card">
          <h1 style={{ fontSize: '1.9rem' }}>{title}</h1>
          <p className="muted">{lead}</p>

          {error && <p className="alert error" role="alert">{error}</p>}
          {notice && step === 'code' && <p className="alert success" role="status">{notice}</p>}
          {devCode && <p className="alert warn"><span>Dev only: your code is <strong>{devCode}</strong></span></p>}

          {mode !== 'forgot' && step === 'form' && (isDemo() || config().googleClientId || import.meta.env.DEV) && (
            <>
              <GoogleButton onCredential={onGoogle} disabled={busy} />
              <div className="divider">{t('or')}</div>
            </>
          )}

          <form onSubmit={submit} noValidate={false}>
            {mode === 'register' && step === 'form' && (
              <div className="field">
                <label htmlFor="name">{t('fullName')}</label>
                <input id="name" required autoComplete="name" value={form.name} onChange={set('name')} />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">{t('email')}</label>
              <input id="email" type="email" required autoComplete="email" inputMode="email"
                value={form.email} onChange={set('email')} readOnly={step === 'code'} />
            </div>
            {(mode === 'login' || (mode === 'register' && step === 'form') || (mode === 'forgot' && step === 'code')) && (
              <div className="field">
                <label htmlFor="password">{mode === 'forgot' ? t('newPassword') : t('password')}</label>
                <input id="password" type="password" required minLength={mode === 'login' ? undefined : 8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  aria-describedby={mode !== 'login' ? 'pw-hint' : undefined}
                  value={form.password} onChange={set('password')} />
                {mode !== 'login' && <p className="hint" id="pw-hint">{t('passwordHint')}</p>}
              </div>
            )}
            {step === 'code' && (
              <div className="field">
                <label htmlFor="code">{t('code')}</label>
                <input id="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}"
                  maxLength={6} value={form.code} onChange={set('code')} />
              </div>
            )}
            <button className="btn block" disabled={busy}>
              {busy && <span className="spinner" />}
              {mode === 'login' ? t('signIn')
                : mode === 'register' ? (step === 'form' ? t('signUp') : t('verify'))
                  : step === 'form' ? t('sendCode') : t('setPassword')}
            </button>
          </form>

          <p style={{ marginTop: '1.25rem' }} className="mb-0">
            {mode === 'login' && (
              <>
                <Link to="/forgot">{t('forgot')}</Link><br />
                <Link to="/register">{t('noAccount')}</Link>
              </>
            )}
            {mode === 'register' && <Link to="/login">{t('haveAccount')}</Link>}
            {mode === 'forgot' && <Link to="/login">{t('backToSignIn')}</Link>}
          </p>
        </div>
      </main>
      </div>
    </>
  )
}
