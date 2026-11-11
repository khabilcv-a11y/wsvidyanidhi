import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { call } from '@shared/lib/api.js'
import { DISTRICTS, STATUS } from '@shared/lib/constants.js'
import { rupees } from '@shared/lib/labels.js'
import { useLoad } from './useLoad.js'
import { Done, ErrorNote, downloadText, toCsv, useAction } from './ui.jsx'

const PAGE = 40
// Quick filters people use all day
const QUICK = [
  ['', 'All'], ['submitted', 'Review'], ['documents_requested', 'Documents asked'], ['under_verification', 'Field visit'],
  ['interview_scheduled', 'Interview'], ['decision_pending', 'Decision'], ['active', 'Scholars'], ['renewal_due', 'Renewal due'],
]

function InviteBar({ ids, clear }) {
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState('')
  const [st, run] = useAction()
  useEffect(() => {
    call('event.list').then((r) => setEvents(r.events.filter((e) => e.status !== 'closed'))).catch(() => {})
  }, [])
  async function invite() {
    const r = await run(() => call('event.invite', { event_id: eventId, application_ids: [...ids] }))
    if (r) clear(`${r.created} invited${r.skipped ? `, ${r.skipped} already invited` : ''}.`)
  }
  return (
    <div className="sticky-bar" role="region" aria-label="Selected applications">
      <strong>{ids.size} selected</strong>
      <select aria-label="Meet or interview day" value={eventId} onChange={(e) => setEventId(e.target.value)}>
        <option value="">Invite to…</option>
        {events.map((e) => <option key={e.id} value={e.id}>{e.name}, {e.date}</option>)}
      </select>
      <button className="btn small" disabled={!eventId || st.busy} onClick={invite}>Send invitation</button>
      <button className="btn ghost small" onClick={() => clear()}>Clear</button>
      <ErrorNote>{st.error}</ErrorNote>
    </div>
  )
}

export default function ApplicationList() {
  const [params, setParams] = useSearchParams()
  const { data, error, loading } = useLoad('admin.apps')
  const status = params.get('status') ?? ''
  const district = params.get('district') ?? ''
  const year = params.get('year') ?? ''
  const q = params.get('q') ?? ''
  const [page, setPage] = useState(0)
  const [picked, setPicked] = useState(new Set())
  const [note, setNote] = useState(null)

  const setParam = (k, v) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    setParams(p, { replace: true })
    setPage(0)
  }

  const all = useMemo(() => data?.rows ?? [], [data])
  const years = useMemo(() => [...new Set(all.map((r) => r.scheme_year).filter(Boolean))].sort().reverse(), [all])
  const counts = useMemo(() => {
    const c = {}
    all.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1 })
    return c
  }, [all])
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all.filter((r) => {
      if (status && r.status !== status) return false
      if (district && r.district !== district) return false
      if (year && r.scheme_year !== year) return false
      return !needle || [r.application_no, r.name, r.phone, r.course, r.college].some((v) => String(v || '').toLowerCase().includes(needle))
    })
  }, [all, q, status, district, year])
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE)

  function exportCsv() {
    downloadText('applications.csv', toCsv(
      ['Application no', 'Name', 'District', 'Phone', 'Course', 'College', 'Status', 'Grade', 'Monthly amount', 'Scheme year'],
      rows.map((r) => [r.application_no, r.name, r.district, r.phone, r.course, r.college, STATUS[r.status]?.en, r.grade, r.monthly_amount, r.scheme_year]),
    ))
  }
  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allShownPicked = shown.length > 0 && shown.every((r) => picked.has(r.id))

  return (
    <div className="stack">
      <div className="page-title">
        <div><h1>Applications</h1><p className="muted mb-0">{rows.length} of {all.length}</p></div>
        <button className="btn outline" onClick={exportCsv} disabled={!rows.length}>Export list (CSV)</button>
      </div>

      <div className="chips-row" role="group" aria-label="Quick filters">
        {QUICK.map(([k, text]) => (
          <button key={k} className={status === k ? 'on' : ''} aria-pressed={status === k} onClick={() => setParam('status', k)}>
            {text}{k ? ` (${counts[k] || 0})` : ` (${all.length})`}
          </button>
        ))}
      </div>

      <div className="card flat row" role="search">
        <div className="field grow mb-0">
          <label htmlFor="q">Search</label>
          <input id="q" placeholder="Name, number, mobile, course, college…" value={q} onChange={(e) => setParam('q', e.target.value)} />
        </div>
        <div className="field mb-0">
          <label htmlFor="st">Status</label>
          <select id="st" value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">All</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.en}</option>)}
          </select>
        </div>
        <div className="field mb-0">
          <label htmlFor="di">District</label>
          <select id="di" value={district} onChange={(e) => setParam('district', e.target.value)}>
            <option value="">All</option>
            {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="field mb-0">
          <label htmlFor="yr">Scheme year</label>
          <select id="yr" value={year} onChange={(e) => setParam('year', e.target.value)}>
            <option value="">All</option>
            {years.map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <Done>{note}</Done>
      {loading ? <p role="status"><span className="spinner" />Loading…</p> : (
        <div className="table-wrap">
          <table>
            <caption className="visually-hidden">Applications</caption>
            <thead>
              <tr>
                <th scope="col" style={{ width: '2rem' }}>
                  <input type="checkbox" aria-label="Select everyone on this page" checked={allShownPicked}
                    onChange={() => setPicked((s) => { const n = new Set(s); shown.forEach((r) => (allShownPicked ? n.delete(r.id) : n.add(r.id))); return n })} />
                </th>
                <th scope="col">Applicant</th><th scope="col">Course</th><th scope="col">District</th><th scope="col">Status</th><th scope="col">Grade</th><th scope="col">Monthly</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td><input type="checkbox" aria-label={`Select ${r.name || r.application_no}`} checked={picked.has(r.id)} onChange={() => toggle(r.id)} /></td>
                  <td>
                    <Link className="who" to={`/applications/${r.id}`} style={{ textDecoration: 'none' }}>
                      <span className="avatar" aria-hidden="true">{(r.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>
                      <span><b>{r.name || 'Unnamed'}</b><span className="s">{r.application_no || 'Draft'} · {r.phone || 'no phone'}</span></span>
                    </Link>
                  </td>
                  <td>{r.course || '—'}<div className="muted small">{r.college || ''}</div></td>
                  <td>{r.district || '—'}</td>
                  <td><span className={`badge ${STATUS[r.status]?.tone}`}>{STATUS[r.status]?.en}</span></td>
                  <td>{r.grade || <span className="muted">—</span>}</td>
                  <td>{r.monthly_amount ? rupees(r.monthly_amount) : <span className="muted">—</span>}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="muted">Nothing matches.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > PAGE && (
        <div className="row spread">
          <span className="muted small">{page * PAGE + 1} to {Math.min(rows.length, page * PAGE + PAGE)} of {rows.length}</span>
          <div className="row">
            <button className="btn outline small" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <button className="btn outline small" disabled={(page + 1) * PAGE >= rows.length} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      )}
      {picked.size > 0 && <InviteBar ids={picked} clear={(msg) => { setPicked(new Set()); setNote(msg || null) }} />}
    </div>
  )
}
