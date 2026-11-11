const FIELD_NAMES = { monthly_amount: 'Monthly amount', status: 'Status' }

export default function HistoryTab({ data }) {
  const { revisions, invitations } = data
  return (
    <div className="stack">
      <section className="card" aria-labelledby="rev-h">
        <h2 id="rev-h">Changes made by the committee</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">When</th><th scope="col">What</th><th scope="col">From</th><th scope="col">To</th><th scope="col">Reason</th><th scope="col">By</th></tr></thead>
            <tbody>
              {revisions.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>{FIELD_NAMES[r.field] || r.field.replace('applicant.', '').replace(/_/g, ' ')}</td>
                  <td>{r.old_value || '—'}</td>
                  <td>{r.new_value || '—'}</td>
                  <td>{r.reason}</td>
                  <td>{r.by}</td>
                </tr>
              ))}
              {revisions.length === 0 && <tr><td colSpan={6} className="muted">No changes yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card" aria-labelledby="inv-h">
        <h2 id="inv-h">Meets and interview days</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Event</th><th scope="col">Reply</th><th scope="col">Attendance</th><th scope="col">Interview</th></tr></thead>
            <tbody>
              {invitations.map((i) => (
                <tr key={i.id}><td>{i.event}</td><td>{String(i.reply).replace(/_/g, ' ')}</td><td>{i.attendance || '—'}</td><td>{String(i.interview_status).replace(/_/g, ' ')}</td></tr>
              ))}
              {invitations.length === 0 && <tr><td colSpan={4} className="muted">Not invited to anything yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
