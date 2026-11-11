import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { call } from '@shared/lib/api.js'
import { STATUS } from '@shared/lib/constants.js'
import { useLoad } from './useLoad.js'
import { Done, ErrorNote, Select, downloadText, toCsv, useAction } from './ui.jsx'
import { EventForm } from './Events.jsx'

const REPLY = { none: 'No reply', attending: 'Attending', not_attending: 'Not attending', online: 'Online' }
const INTERVIEW = [['scheduled', 'Scheduled'], ['done', 'Done'], ['not_done', 'Not done'], ['rescheduled', 'Rescheduled']]

function InviteBox({ event, reload }) {
  const [status, setStatus] = useState('')
  const [year, setYear] = useState('')
  const [st, run] = useAction()
  async function invite(e) {
    e.preventDefault()
    const r = await run(() => call('event.invite', { event_id: event.id, filter: { status, scheme_year: year } }))
    if (r) {
      await reload()
      window.alert(`${r.created} invited (${r.emailed} emailed). ${r.skipped} were already invited.`)
    }
  }
  return (
    <form className="card flat row" onSubmit={invite} style={{ alignItems: 'flex-end' }}>
      <Select id="inv-st" label="Invite everyone with status" value={status} onChange={setStatus} options={Object.entries(STATUS).map(([k, v]) => [k, v.en])} />
      <div className="field mb-0"><label htmlFor="inv-yr">and scheme year (optional)</label><input id="inv-yr" value={year} onChange={(e) => setYear(e.target.value)} placeholder="for example 2027" /></div>
      <button className="btn small" disabled={st.busy || (!status && !year)}>Invite</button>
      <span className="muted small">You can also pick people on the Applications page and invite them from there.</span>
      <ErrorNote>{st.error}</ErrorNote>
    </form>
  )
}

function WalkIn({ event, reload }) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])
  const [st, run] = useAction()
  async function search(e) {
    e.preventDefault()
    const r = await run(() => call('event.search', { event_id: event.id, q }))
    if (r) setRows(r.rows)
  }
  async function checkin(row) {
    const r = await run(() => call('event.checkin', { id: row.id }), '')
    if (r) {
      window.alert(`Token ${r.token}${r.already ? ' (already checked in)' : ''}`)
      setRows([])
      setQ('')
      await reload()
    }
  }
  return (
    <section className="card" aria-labelledby="ci-h">
      <h2 id="ci-h">Check-in desk</h2>
      <form className="row" onSubmit={search} style={{ alignItems: 'flex-end' }}>
        <div className="field grow mb-0"><label htmlFor="ci-q">Find an invited person</label><input id="ci-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, number or mobile" /></div>
        <button className="btn small" disabled={q.trim().length < 2 || st.busy}>Search</button>
      </form>
      {rows.length > 0 && (
        <ul className="plain mini">
          {rows.map((r) => (
            <li key={r.id}><span><b>{r.name}</b><span className="muted small"> {r.application_no} · {r.phone}</span></span><button className="btn small" onClick={() => checkin(r)}>{r.checked_in_at ? `Token ${r.token}` : 'Check in'}</button></li>
          ))}
        </ul>
      )}
      <ErrorNote>{st.error}</ErrorNote>
    </section>
  )
}

export default function EventDetail() {
  const { id } = useParams()
  const { data, error, loading, reload } = useLoad('event.get', { id })
  const [editing, setEditing] = useState(false)
  const [filter, setFilter] = useState('')
  const [st, run] = useAction()
  if (loading) return <p role="status"><span className="spinner" />Loading…</p>
  if (error) return <p className="alert error" role="alert">{error}</p>
  const { event, invitations, counts } = data
  const rows = invitations.filter((r) => {
    if (filter === 'absent') return !r.checked_in_at
    if (filter === 'present') return Boolean(r.checked_in_at)
    if (filter) return r.reply === filter
    return true
  })

  const mark = (row, patch) => run(() => call('event.mark', { id: row.id, ...patch })).then(reload)
  const checkin = async (row) => {
    const r = await run(() => call('event.checkin', { id: row.id }))
    if (r) await reload()
  }

  return (
    <div className="stack">
      <p className="mb-0"><Link to="/events">← Meets and interviews</Link></p>
      <div className="page-title">
        <div>
          <h1>{event.name}</h1>
          <p className="muted mb-0">{new Date(event.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{event.venue ? ` · ${event.venue}` : ''} · {event.status}</p>
        </div>
        <div className="row">
          <button className="btn outline" onClick={() => setEditing(!editing)}>{editing ? 'Close' : 'Edit'}</button>
          <button className="btn outline" onClick={() => downloadText(`${event.name.replace(/\W+/g, '_')}.csv`, toCsv(
            ['Token', 'Application no', 'Name', 'District', 'Phone', 'Reply', 'Attendance', 'Interview', 'Companions', 'Remarks'],
            invitations.map((r) => [r.token || '', r.application_no, r.name, r.district, r.phone, REPLY[r.reply], r.attendance, r.interview_status, r.companions, r.remarks]),
          ))}>Export list (CSV)</button>
        </div>
      </div>
      {editing && <EventForm initial={event} onSaved={async () => { setEditing(false); await reload() }} onCancel={() => setEditing(false)} />}

      <div className="stat-row">
        <div className="card"><b>{counts.invited}</b>Invited</div>
        <div className="card"><b>{counts.attending + counts.online}</b>Attending</div>
        <div className="card"><b>{counts.not_attending}</b>Not attending</div>
        <div className="card"><b>{counts.no_reply}</b>No reply yet</div>
        <div className="card"><b>{counts.present}</b>Checked in</div>
      </div>

      <InviteBox event={event} reload={reload} />
      <WalkIn event={event} reload={reload} />

      <div className="chips-row" role="group" aria-label="Show">
        {[['', 'Everyone'], ['attending', 'Attending'], ['not_attending', 'Not attending'], ['none', 'No reply'], ['present', 'Checked in'], ['absent', 'Not checked in']].map(([k, text]) => (
          <button key={k} className={filter === k ? 'on' : ''} aria-pressed={filter === k} onClick={() => setFilter(k)}>{text}</button>
        ))}
      </div>
      <ErrorNote>{st.error}</ErrorNote><Done>{st.done}</Done>
      <div className="table-wrap">
        <table>
          <caption className="visually-hidden">Invitations</caption>
          <thead><tr><th scope="col">Token</th><th scope="col">Applicant</th><th scope="col">Reply</th><th scope="col">Check-in</th><th scope="col">Interview</th><th scope="col">Remarks</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.token || '—'}</b></td>
                <td><Link to={`/applications/${r.application_id}`}><b>{r.name}</b></Link><div className="muted small">{r.application_no} · {r.district} · {r.phone}</div></td>
                <td>{REPLY[r.reply]}{r.reply === 'not_attending' && r.reason ? <div className="muted small">{String(r.reason).replace(/_/g, ' ')}</div> : null}{r.companions ? <div className="muted small">+{r.companions} with them</div> : null}</td>
                <td>
                  {r.checked_in_at ? <span className="badge ok">{r.attendance === 'online' ? 'Online' : 'Present'}</span> : (
                    <div className="row" style={{ gap: '.3rem' }}>
                      <button className="btn small" onClick={() => checkin(r)}>Check in</button>
                      <button className="btn ghost small" onClick={() => mark(r, { attendance: 'absent' })}>{r.attendance === 'absent' ? 'Absent' : 'Mark absent'}</button>
                    </div>
                  )}
                </td>
                <td>
                  <select aria-label={`Interview status for ${r.name}`} value={r.interview_status || 'scheduled'} onChange={(e) => mark(r, { interview_status: e.target.value })}>
                    {INTERVIEW.map(([k, text]) => <option key={k} value={k}>{text}</option>)}
                  </select>
                </td>
                <td className="small">{STATUS[r.status]?.en}{r.remarks ? ` · ${r.remarks}` : ''}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="muted">Nobody here yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
