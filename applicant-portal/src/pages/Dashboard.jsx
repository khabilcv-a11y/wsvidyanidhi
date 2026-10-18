import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { call } from '@shared/lib/api.js'
import { useAuth } from '@shared/lib/auth.jsx'
import { useI18n } from '@shared/lib/i18n.jsx'
import { STAGES, STATUS } from '@shared/lib/constants.js'
import { EDITABLE, useAppData } from './AppData.jsx'

export default function Dashboard() {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const nav = useNavigate()
  const { data, reload } = useAppData()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const app = data.application

  async function start() {
    setBusy(true)
    setError(null)
    try {
      await call('app.start')
      await reload()
      nav('/application')
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const stageIdx = app ? STAGES.findIndex((s) => s.statuses.includes(app.status)) : -1
  const st = app ? STATUS[app.status] : null

  return (
    <div className="stack">
      <div className="page-title">
        <h1>{user.name ? `${lang === 'ml' ? '' : 'Hello, '}${user.name.split(' ')[0]}` : t('dashboard')}</h1>
        {app?.application_no && <span className="badge sun">{t('applicationNo')}: {app.application_no}</span>}
      </div>

      {!app && (
        <div className="card tint">
          {data.open_cycle ? (
            <>
              <h2>{data.open_cycle.name}</h2>
              <p>{t('startLead')}</p>
              <button className="btn accent" onClick={start} disabled={busy}>{t('startApplication')}</button>
            </>
          ) : (
            <p className="mb-0">{t('closed')}</p>
          )}
          {error && <p className="alert error" role="alert" style={{ marginTop: '1rem' }}>{error}</p>}
        </div>
      )}

      {app && (
        <>
          <section className="card" aria-labelledby="status-h">
            <div className="row spread">
              <div>
                <p className="muted small mb-0" id="status-h">{t('progress')}</p>
                <h2 className="mb-0">{st[lang]}</h2>
              </div>
              {EDITABLE.includes(app.status) && <Link className="btn accent" to="/application">{t('continueApplication')}</Link>}
            </div>
            <ol className="tracker" aria-label={t('progress')}>
              {STAGES.map((s, i) => (
                <li key={s.key} className={i < stageIdx ? 'done' : i === stageIdx ? 'now' : ''} aria-current={i === stageIdx ? 'step' : undefined}>
                  {s[lang]}
                </li>
              ))}
            </ol>
          </section>

          <section className="card" aria-labelledby="todo-h">
            <h2 id="todo-h">{t('pending')}</h2>
            {data.pending.length === 0 && <p className="muted mb-0">{t('nothingPending')}</p>}
            {data.pending.map((p) => (
              <div key={p.id} className="row spread" style={{ padding: '.7rem 0', borderTop: '1px solid var(--line)' }}>
                <div>
                  <strong>{p.title}</strong>
                  {p.due_on && <div className="muted small">{t('due')}: {p.due_on}</div>}
                </div>
                <Link className="btn outline small" to="/documents">{t('upload')}</Link>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
