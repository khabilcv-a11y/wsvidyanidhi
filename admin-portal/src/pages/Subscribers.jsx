import { useState } from 'react'
import { call } from '@shared/lib/api.js'
import { useAuth } from '@shared/lib/auth.jsx'
import { useLoad } from './useLoad.js'
import { Done, ErrorNote, downloadText, toCsv, useAction } from './ui.jsx'

const APPLY_URL = 'https://wsvidyanidhi-apply.pages.dev'

// People who asked on the home page to be told when applications open.
export default function Subscribers() {
  const { user } = useAuth()
  const { data, error, loading, reload } = useLoad('admin.subscribers')
  const [show, setShow] = useState('waiting')
  const [st, run] = useAction()
  if (loading) return <p role="status"><span className="spinner" />Loading…</p>
  if (error) return <p className="alert error" role="alert">{error}</p>
  const rows = data.rows
  const waiting = rows.filter((r) => !r.notified_for)
  const shown = show === 'waiting' ? waiting : rows
  const text = (r) => `Assalamu alaikum ${r.name}. Applications for the WISDOM Students Vidyanidhi scholarship${data.open_cycle ? ` ${data.open_cycle}` : ''} are now open. You can apply at ${APPLY_URL} with just your mobile number.`

  async function emailAll() {
    const r = await run(() => call('admin.subscribers.notify'))
    if (r) {
      window.alert(`${r.queued} emails queued. People without an email need a WhatsApp message from this list.`)
      await reload()
    }
  }
  async function mark(r) {
    if (await run(() => call('admin.subscribers.mark', { id: r.id }))) await reload()
  }

  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <h1>Notify list</h1>
          <p className="muted mb-0">People who asked on the home page to be told when applications open. {data.open_cycle ? `Open now: ${data.open_cycle}.` : 'No scheme year is open now.'}</p>
        </div>
        <div className="row">
          <button className="btn outline" disabled={!rows.length} onClick={() => downloadText('notify-list.csv', toCsv(['Name', 'Mobile', 'Email', 'Asked on', 'Told for'], rows.map((r) => [r.name, r.phone, r.email, r.created_at.slice(0, 10), r.notified_for])))}>Export (CSV)</button>
          {user.role === 'master' && <button className="btn" disabled={st.busy || !data.open_cycle} onClick={emailAll}>Email everyone with an email</button>}
        </div>
      </div>
      <p className="alert"><span>Those with an email are emailed automatically when a scheme year is opened. For the others, use the WhatsApp link and then mark them as told.</span></p>
      <div className="chips-row" role="group" aria-label="Show">
        <button className={show === 'waiting' ? 'on' : ''} aria-pressed={show === 'waiting'} onClick={() => setShow('waiting')}>Not told yet ({waiting.length})</button>
        <button className={show === 'all' ? 'on' : ''} aria-pressed={show === 'all'} onClick={() => setShow('all')}>Everyone ({rows.length})</button>
      </div>
      <ErrorNote>{st.error}</ErrorNote><Done>{st.done}</Done>
      <div className="table-wrap">
        <table>
          <caption className="visually-hidden">Notify list</caption>
          <thead><tr><th scope="col">Name</th><th scope="col">Mobile</th><th scope="col">Email</th><th scope="col">Asked on</th><th scope="col">Told</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td><b>{r.name}</b></td>
                <td>{r.phone}</td>
                <td>{r.email || <span className="muted">—</span>}</td>
                <td>{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td>{r.notified_for ? <span className="badge ok">{r.notified_for}</span> : <span className="badge warn">Not yet</span>}</td>
                <td>
                  <div className="row" style={{ gap: '.4rem' }}>
                    <a className="btn outline small" href={`https://wa.me/91${r.phone}?text=${encodeURIComponent(text(r))}`} target="_blank" rel="noopener">WhatsApp</a>
                    {!r.notified_for && <button className="btn ghost small" onClick={() => mark(r)} disabled={st.busy}>Mark as told</button>}
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={6} className="muted">Nobody here.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
