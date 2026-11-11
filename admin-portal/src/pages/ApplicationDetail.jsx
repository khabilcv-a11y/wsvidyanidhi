import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { call } from '@shared/lib/api.js'
import { useAuth } from '@shared/lib/auth.jsx'
import { STATUS } from '@shared/lib/constants.js'
import { rupees } from '@shared/lib/labels.js'
import { useLoad } from './useLoad.js'
import { ErrorNote, useAction, useMeta } from './ui.jsx'
import OverviewTab from './case/OverviewTab.jsx'
import DocumentsTab from './case/DocumentsTab.jsx'
import VerificationTab from './case/VerificationTab.jsx'
import InterviewTab from './case/InterviewTab.jsx'
import MoneyTab from './case/MoneyTab.jsx'
import HistoryTab from './case/HistoryTab.jsx'

const NEEDS_REASON = ['on_hold', 'discontinued', 'completed', 'not_selected']

// Change the status, asking for a reason where the committee needs one on record.
function StatusChange({ app, reload }) {
  const [next, setNext] = useState('')
  const [reason, setReason] = useState('')
  const [st, run] = useAction()
  async function save(e) {
    e.preventDefault()
    if (await run(() => call('admin.status', { id: app.id, status: next, reason }))) {
      setNext('')
      setReason('')
      await reload()
    }
  }
  return (
    <form className="row" onSubmit={save} style={{ alignItems: 'flex-end' }}>
      <div className="field mb-0">
        <label htmlFor="st-new">Change status</label>
        <select id="st-new" value={next} onChange={(e) => setNext(e.target.value)}>
          <option value="">Keep as it is</option>
          {Object.entries(STATUS).filter(([k]) => k !== app.status).map(([k, v]) => <option key={k} value={k}>{v.en}</option>)}
        </select>
      </div>
      {NEEDS_REASON.includes(next) && (
        <div className="field mb-0 grow"><label htmlFor="st-why">Reason (kept on record)</label><input id="st-why" required value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      )}
      {next && <button className="btn small" disabled={st.busy}>Save</button>}
      <ErrorNote>{st.error}</ErrorNote>
    </form>
  )
}

export default function ApplicationDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const meta = useMeta()
  const [params, setParams] = useSearchParams()
  const { data, error, loading, reload } = useLoad('admin.app', { id })
  if (loading) return <p role="status"><span className="spinner" />Loading…</p>
  if (error) return <p className="alert error" role="alert">{error}</p>
  const { application: app, applicant: ap, docs, pending } = data
  const finance = user.role === 'master' || user.finance
  const toReview = docs.filter((d) => d.status === 'under_review').length

  const tabs = [
    ['overview', 'Details'],
    ['documents', `Documents${toReview ? ` (${toReview} to review)` : ''}`],
    ['verification', 'Field verification'],
    ['interview', 'Interview'],
    ['money', 'Money'],
    ['history', 'History'],
  ]
  const tab = tabs.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'overview'
  const props = { data, reload, meta, me: user, finance }

  return (
    <div className="stack">
      <p className="mb-0"><Link to="/applications">← Applications</Link></p>
      <section className="card case-head">
        <div className="row spread" style={{ alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0 }}>{ap.full_name || 'Applicant'}</h1>
            <p className="muted mb-0">
              {app.application_no || 'Draft'} · {app.course || 'no course yet'}{app.college ? `, ${app.college}` : ''} · {ap.district || 'no district'}
            </p>
            <p className="mb-0" style={{ marginTop: '.5rem' }}>
              <span className={`badge ${STATUS[app.status]?.tone}`}>{STATUS[app.status]?.en}</span>{' '}
              {app.grade && <span className="badge">Grade {app.grade}</span>}{' '}
              {app.monthly_amount ? <span className="badge ok">{rupees(app.monthly_amount)} a month</span> : null}{' '}
              {pending.some((p) => p.flag === 'call') && <span className="badge danger">Phone call needed</span>}
            </p>
          </div>
          <div className="row" style={{ gap: '.5rem' }}>
            {ap.phone && <a className="btn outline small" href={`tel:${ap.phone}`}>Call {ap.phone}</a>}
            {ap.phone && <a className="btn outline small" href={`https://wa.me/91${String(ap.phone).replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noopener">WhatsApp</a>}
          </div>
        </div>
        <hr />
        <StatusChange app={app} reload={reload} />
        {pending.length > 0 && (
          <p className="small muted" style={{ marginTop: '.8rem', marginBottom: 0 }}>
            Waiting on the applicant: {pending.map((p) => p.title).join(', ')}
          </p>
        )}
      </section>

      <div className="tabs" role="tablist" aria-label="Case file">
        {tabs.map(([k, text]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setParams({ tab: k }, { replace: true })}>{text}</button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'overview' && <OverviewTab {...props} />}
        {tab === 'documents' && <DocumentsTab {...props} />}
        {tab === 'verification' && <VerificationTab {...props} />}
        {tab === 'interview' && <InterviewTab {...props} />}
        {tab === 'money' && <MoneyTab {...props} />}
        {tab === 'history' && <HistoryTab {...props} />}
      </div>
    </div>
  )
}
