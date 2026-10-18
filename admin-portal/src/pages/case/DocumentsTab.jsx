import { useCallback, useState } from 'react'
import { call } from '@shared/lib/api.js'
import { DOC_STATUS } from '@shared/lib/constants.js'
import DocViewer from '@shared/components/DocViewer.jsx'
import { ErrorNote } from '../ui.jsx'

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
        {doc.renewal_id && <span className="badge info" style={{ marginLeft: '.5rem' }}>Renewal</span>}
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
        <ErrorNote>{error}</ErrorNote>
        {viewing && <DocViewer title={`${doc.label} · v${doc.version}`} load={load} onClose={() => setViewing(false)} />}
      </td>
    </tr>
  )
}

export default function DocumentsTab({ data, reload }) {
  const { docs, pending } = data
  return (
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
  )
}
