import { useState } from 'react'
import { Link } from 'react-router-dom'
import { call } from '@shared/lib/api.js'
import { useLoad } from './useLoad.js'
import { Done, ErrorNote, Input, Select, useAction } from './ui.jsx'

const MODES = [['in_person', 'In person'], ['online', 'Online'], ['hybrid', 'In person and online']]
const KINDS = [['both', 'Interview and renewal'], ['admission', 'New applicants (interview)'], ['renewal', 'Renewal of scholars']]
const STATUSES = [['planned', 'Planned'], ['open', 'Open (replies and check-in)'], ['closed', 'Closed']]

export function EventForm({ initial, onSaved, onCancel }) {
  const [f, setF] = useState({ name: '', date: '', venue: '', mode: 'in_person', kind: 'both', status: 'planned', notes: '', ...initial })
  const [st, run] = useAction()
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  async function save(e) {
    e.preventDefault()
    const r = await run(() => call('event.save', { ...f, id: initial?.id }), 'Saved.')
    if (r) onSaved(r)
  }
  return (
    <form className="card" onSubmit={save}>
      <h2>{initial?.id ? 'Edit meet' : 'Plan a meet or interview day'}</h2>
      <div className="form-grid">
        <Input id="ev-name" label="Name" value={f.name} onChange={set('name')} required hint="For example: State Intellectual Meet, Calicut" />
        <Input id="ev-date" label="Date" type="date" value={f.date} onChange={set('date')} required />
        <Input id="ev-venue" label="Venue" value={f.venue} onChange={set('venue')} />
        <Select id="ev-mode" label="Mode" value={f.mode} onChange={set('mode')} options={MODES} blank={null} />
        <Select id="ev-kind" label="For" value={f.kind} onChange={set('kind')} options={KINDS} blank={null} />
        <Select id="ev-status" label="Status" value={f.status} onChange={set('status')} options={STATUSES} blank={null} />
        <div className="field full"><label htmlFor="ev-notes">Notes for the team</label><textarea id="ev-notes" rows={2} value={f.notes} onChange={(e) => set('notes')(e.target.value)} /></div>
      </div>
      <div className="row"><button className="btn" disabled={st.busy}>Save</button>{onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}</div>
      <ErrorNote>{st.error}</ErrorNote><Done>{st.done}</Done>
    </form>
  )
}

export default function Events() {
  const { data, error, loading, reload } = useLoad('event.list')
  const [adding, setAdding] = useState(false)
  if (loading) return <p role="status"><span className="spinner" />Loading…</p>
  return (
    <div className="stack">
      <div className="page-title">
        <div><h1>Meets and interviews</h1><p className="muted mb-0">Intellectual Meets and interview days: invitations, replies, check-in and tokens.</p></div>
        {!adding && <button className="btn accent" onClick={() => setAdding(true)}>Plan a meet</button>}
      </div>
      <ErrorNote>{error}</ErrorNote>
      {adding && <EventForm onSaved={async () => { setAdding(false); await reload() }} onCancel={() => setAdding(false)} />}
      <div className="table-wrap">
        <table>
          <caption className="visually-hidden">Meets and interview days</caption>
          <thead><tr><th scope="col">Meet</th><th scope="col">Date</th><th scope="col">Invited</th><th scope="col">Attending</th><th scope="col">Not attending</th><th scope="col">No reply</th><th scope="col">Present</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {data.events.map((e) => (
              <tr key={e.id}>
                <td><Link to={`/events/${e.id}`}><b>{e.name}</b></Link><div className="muted small">{e.venue || ''}</div></td>
                <td>{new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td>{e.counts.invited}</td><td>{e.counts.attending + e.counts.online}</td><td>{e.counts.not_attending}</td><td>{e.counts.no_reply}</td><td>{e.counts.present}</td>
                <td><span className={`badge ${e.status === 'open' ? 'ok' : e.status === 'closed' ? '' : 'info'}`}>{e.status}</span></td>
              </tr>
            ))}
            {data.events.length === 0 && <tr><td colSpan={8} className="muted">No meets yet. Use "Plan a meet" to start one.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
