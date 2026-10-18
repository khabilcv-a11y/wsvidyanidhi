import { Link } from 'react-router-dom'
import { STATUS } from '@shared/lib/constants.js'
import { useLoad } from './useLoad.js'

export default function Dashboard() {
  const { data, error, loading } = useLoad('admin.dashboard')
  if (loading) return <p role="status"><span className="spinner" />Loading…</p>
  if (error) return <p className="alert error" role="alert">{error}</p>
  return (
    <div className="stack">
      <div className="page-title"><h1>Dashboard</h1></div>
      <div className="grid cols-4">
        <div className="card stat"><b>{data.total}</b>Applications</div>
        <div className="card stat"><b>{data.docs_to_review}</b>Documents to review</div>
        <div className="card stat"><b>{data.pending_items}</b>Waiting on applicants</div>
        <div className="card stat"><b>{data.needs_call}</b>Need a phone call</div>
      </div>
      <section className="card" aria-labelledby="bs">
        <h2 id="bs">By status</h2>
        {Object.keys(data.counts).length === 0 && <p className="muted mb-0">No applications yet.</p>}
        <div className="table-wrap" hidden={Object.keys(data.counts).length === 0}>
          <table>
            <thead><tr><th scope="col">Status</th><th scope="col">Applications</th></tr></thead>
            <tbody>
              {Object.keys(STATUS).filter((s) => data.counts[s]).map((s) => (
                <tr key={s}>
                  <td><Link to={`/applications?status=${s}`}>{STATUS[s].en}</Link></td>
                  <td>{data.counts[s]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
