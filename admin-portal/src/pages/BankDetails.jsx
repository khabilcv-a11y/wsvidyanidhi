import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLoad } from './useLoad.js'
import { ErrorNote } from './ui.jsx'

const TEXT = { submitted: 'Waiting to be checked', verified: 'Verified', change_requested: 'Change requested', rejected: 'Sent back' }
const TONE = { submitted: 'warn', verified: 'ok', change_requested: 'danger', rejected: 'danger' }

export default function BankDetails() {
  const { data, error, loading } = useLoad('admin.bank.list')
  const [filter, setFilter] = useState('submitted')
  const rows = useMemo(() => (data?.rows ?? []), [data])
  const shown = rows.filter((r) => !filter || r.status === filter)
  const count = (s) => rows.filter((r) => r.status === s).length
  return (
    <div className="stack">
      <div className="page-title"><div><h1>Bank details</h1><p className="muted mb-0">Account numbers are not shown here. Open a case to check the details; each view is recorded.</p></div></div>
      <div className="chips-row" role="group" aria-label="Show">
        {[['submitted', `To check (${count('submitted')})`], ['change_requested', `Change requested (${count('change_requested')})`], ['verified', `Verified (${count('verified')})`], ['', 'All']].map(([k, label]) => (
          <button key={k} className={filter === k ? 'on' : ''} aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
        ))}
      </div>
      <ErrorNote>{error}</ErrorNote>
      {loading ? <p role="status"><span className="spinner" />Loading…</p> : (
        <div className="table-wrap">
          <table>
            <caption className="visually-hidden">Bank details</caption>
            <thead><tr><th scope="col">Scholar</th><th scope="col">Bank</th><th scope="col">District</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col"><span className="visually-hidden">Open</span></th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.application_id}>
                  <td><b>{r.name}</b><div className="muted small">{r.application_no}</div></td>
                  <td>{r.bank}</td>
                  <td>{r.district}</td>
                  <td><span className={`badge ${TONE[r.status] || ''}`}>{TEXT[r.status] || r.status}</span></td>
                  <td>{r.updated_at ? new Date(r.updated_at).toLocaleDateString('en-IN') : '—'}</td>
                  <td><Link className="btn small outline" to={`/applications/${r.application_id}?tab=money`}>Open</Link></td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={6} className="muted">Nothing here.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
