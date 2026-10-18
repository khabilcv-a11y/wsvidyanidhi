import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { call } from '@shared/lib/api.js'
import { DOC_STATUS, STATUS } from '@shared/lib/constants.js'
import DocViewer from '@shared/components/DocViewer.jsx'
import { useLoad } from './useLoad.js'

function DocRow({ doc, onChanged }) {
  const [viewing, setViewing] = useState(false)
  const [asking, setAsking] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState(null)
  const load = useCallback(() => call('admin.docfile', { id: doc.id }), [doc.id])

  async function review(decision) {
    setError(null)
    try {
      await call('admin.review', { id: doc.id, decision, reason })
      setAsking(false)
      setReason('')
      await onChanged()
    } catch (e) {
      setError(e.message)
    }
  }
  const st = DOC_STATUS[doc.status]
  return (
    <tr>
      <td>
        <strong>{doc.label}</strong> <span className="muted">v{doc.version}</span>
        <div className="muted small">{new Date(doc.uploaded_at).toLocaleString()}</div>
        {doc.reason && <div className="small" style={{ color: 'var(--danger)' }}>{doc.reason}</div>}
      </td>
      <td><span className={`badge ${st.tone}`}>{st.en}</span></td>
      <td>
        <div className="row" style={{ gap: '.4rem' }}>
          <button className="btn outline small" onClick={() => setViewing(true)}>View</button>
          {doc.status !== 'accepted' && <button className="btn small" onClick={() => review('accepted')}>Accept</button>}
          {doc.status !== 'reupload' && <button className="btn danger small" onClick={() => setAsking(true)}>Ask to re-upload</button>}
        </div>
        {asking && (
          <div style={{ marginTop: '.75rem' }}>
            <label htmlFor={`r_${doc.id}`} className="label">Reason (sent to the applicant)</label>
            <input id={`r_${doc.id}`} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="row" style={{ marginTop: '.5rem' }}>
              <button className="btn small" disabled={!reason.trim()} onClick={() => review('reupload')}>Send request</button>
              <button className="btn ghost small" onClick={() => setAsking(false)}>Cancel</button>
            </div>
          </div>
        )}
        {error && <p className="alert error" role="alert" style={{ marginTop: '.5rem' }}>{error}</p>}
        {viewing && <DocViewer title={`${doc.label} · v${doc.version}`} load={load} onClose={() => setViewing(false)} />}
      </td>
    </tr>
  )
}

const kv = (obj, keys) => keys.map((k) => (
  <tr key={k}><th scope="row">{k.replaceAll('_', ' ')}</th><td>{obj[k] === '' || obj[k] == null ? <span className="muted">—</span> : String(obj[k])}</td></tr>
))

export default function ApplicationDetail() {
  const { id } = useParams()
  const { data, error, loading, reload } = useLoad('admin.app', { id })
  const [statusError, setStatusError] = useState(null)

  async function setStatus(status) {
    setStatusError(null)
    try {
      await call('admin.status', { id, status })
      await reload()
    } catch (e) {
      setStatusError(e.message)
    }
  }

  if (loading) return <p role="status"><span className="spinner" />Loading…</p>
  if (error) return <p className="alert error" role="alert">{error}</p>
  const { application: app, applicant: ap, docs, pending } = data

  return (
    <div className="stack">
      <p className="mb-0"><Link to="/applications">← Applications</Link></p>
      <div className="page-title">
        <h1>{ap.full_name || 'Applicant'} <span className="muted" style={{ fontSize: '1.1rem' }}>{app.application_no || 'Draft'}</span></h1>
        <div className="field mb-0">
          <label htmlFor="status">Status</label>
          <select id="status" value={app.status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.en}</option>)}
          </select>
        </div>
      </div>
      {statusError && <p className="alert error" role="alert">{statusError}</p>}

      <section className="card" aria-labelledby="docs-h">
        <h2 id="docs-h">Documents</h2>
        <div className="table-wrap">
          <table>
            <caption className="visually-hidden">Uploaded documents</caption>
            <thead><tr><th scope="col">Document</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {docs.map((d) => <DocRow key={d.id} doc={d} onChanged={reload} />)}
              {docs.length === 0 && <tr><td colSpan={3} className="muted">Nothing uploaded yet.</td></tr>}
            </tbody>
          </table>
        </div>
        {pending.length > 0 && (
          <p className="small muted" style={{ marginTop: '.75rem' }}>
            Waiting on the applicant: {pending.map((p) => `${p.title}${p.flag === 'call' ? ' (phone call needed)' : ''}`).join(', ')}
          </p>
        )}
      </section>

      <div className="grid cols-2">
        <section className="card" aria-labelledby="ap-h">
          <h2 id="ap-h">Applicant</h2>
          <div className="table-wrap"><table className="kv"><tbody>
            {kv(ap, ['gender', 'dob', 'district', 'address', 'phone', 'whatsapp', 'guardian_name', 'guardian_phone', 'guardian_occupation', 'family_income'])}
          </tbody></table></div>
        </section>
        <section className="card" aria-labelledby="co-h">
          <h2 id="co-h">Course</h2>
          <div className="table-wrap"><table className="kv"><tbody>
            {kv(app, ['course', 'subject', 'course_type', 'stream', 'duration_years', 'year_of_study', 'completion_month', 'university', 'college', 'last_exam', 'last_exam_year', 'last_percentage'])}
          </tbody></table></div>
        </section>
      </div>
    </div>
  )
}
