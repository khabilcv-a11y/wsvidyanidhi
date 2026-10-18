import { useLoad } from './useLoad.js'

export default function AuditLog() {
  const { data, error, loading } = useLoad('admin.audit')
  if (loading) return <p role="status"><span className="spinner" />Loading…</p>
  if (error) return <p className="alert error" role="alert">{error}</p>
  return (
    <div className="stack">
      <div className="page-title"><h1>Audit log</h1></div>
      <p className="muted mt-0">The latest 300 changes and document views.</p>
      <div className="table-wrap">
        <table>
          <caption className="visually-hidden">Audit log</caption>
          <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">Details</th></tr></thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={i}>
                <td>{new Date(r.at).toLocaleString()}</td>
                <td>{r.who || '—'}</td>
                <td>{r.action}</td>
                <td className="small muted">{r.entity} {r.detail}</td>
              </tr>
            ))}
            {data.rows.length === 0 && <tr><td colSpan={4} className="muted">Nothing yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
