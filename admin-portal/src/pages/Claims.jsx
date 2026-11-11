import { call } from '@shared/lib/api.js'
import { useLoad } from './useLoad.js'
import { Done, ErrorNote, useAction } from './ui.jsx'

export default function Claims() {
  const { data, error, loading, reload } = useLoad('admin.claims')
  const [st, run] = useAction()
  async function decide(id, decision) {
    if (await run(() => call('admin.claim.decide', { id, decision }), decision === 'approve' ? 'Linked.' : 'Rejected.')) await reload()
  }
  return (
    <div className="stack">
      <div className="page-title"><div><h1>Record links</h1><p className="muted mb-0">Scholars from earlier years ask to link their old record to a login. Approve only when the details match.</p></div></div>
      <ErrorNote>{error || st.error}</ErrorNote><Done>{st.done}</Done>
      {loading ? <p role="status"><span className="spinner" />Loading…</p> : (
        <div className="stack" style={{ gap: '.7rem' }}>
          {data.claims.map((c) => (
            <section key={c.id} className="card">
              <div className="row spread">
                <div>
                  <b>{c.claimant || c.claimant_email}</b> <span className="muted small">{c.claimant_email} · asked {new Date(c.created_at).toLocaleDateString('en-IN')}</span>
                  <p className="mb-0" style={{ marginTop: '.4rem' }}>
                    Wants to link number <b>{c.application_no}</b>{c.found ? <> belonging to <b>{c.record_name}</b></> : ' (no such record)'}
                  </p>
                  <p className="mb-0 small" style={{ marginTop: '.3rem' }}>
                    <span className={`badge ${c.found ? 'ok' : 'danger'}`}>{c.found ? 'Number found' : 'Number not found'}</span>{' '}
                    <span className={`badge ${c.mobile_matches ? 'ok' : 'warn'}`}>{c.mobile_matches ? 'Mobile matches' : 'Mobile does not match'}</span>{' '}
                    {c.imported && <span className="badge info">Imported record</span>}
                    {c.note ? <> · "{c.note}"</> : null}
                  </p>
                </div>
                <div className="row">
                  <button className="btn small" disabled={!c.found || !c.imported || st.busy} onClick={() => decide(c.id, 'approve')}>Approve</button>
                  <button className="btn danger small" disabled={st.busy} onClick={() => decide(c.id, 'reject')}>Reject</button>
                </div>
              </div>
            </section>
          ))}
          {data.claims.length === 0 && <p className="muted">No requests are waiting.</p>}
        </div>
      )}
    </div>
  )
}
