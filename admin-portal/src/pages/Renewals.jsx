import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { call } from '@shared/lib/api.js'
import { rupees } from '@shared/lib/labels.js'
import { useLoad } from './useLoad.js'
import { Done, ErrorNote, Input, useAction, useMeta } from './ui.jsx'

const text = (k) => String(k || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
const NEEDS_AMOUNT = ['continue_increase', 'continue_reduce']
const NEEDS_REMARKS = ['continue_reduce', 'on_hold', 'removed', 'closed', 'not_attending', 'call_back', 'file_missing']

function OpenRound({ onDone }) {
  const [period, setPeriod] = useState('')
  const [due, setDue] = useState('')
  const [st, run] = useAction()
  async function open(e) {
    e.preventDefault()
    const r = await run(() => call('renewal.open', { period, due_on: due || undefined }))
    if (r) {
      window.alert(`Renewal opened for ${r.created} active scholars.`)
      await onDone()
    }
  }
  return (
    <form className="card flat row" onSubmit={open} style={{ alignItems: 'flex-end' }}>
      <Input id="rp" label="Open a renewal round for all active scholars" value={period} onChange={setPeriod} required hint="Name it, for example 2026-H2" />
      <Input id="rd" label="Due date (optional)" type="date" value={due} onChange={setDue} />
      <button className="btn small" disabled={st.busy}>Open round</button>
      <ErrorNote>{st.error}</ErrorNote>
    </form>
  )
}

function Decide({ row, meta, onDone }) {
  const [decision, setDecision] = useState('')
  const [remarks, setRemarks] = useState('')
  const [amount, setAmount] = useState('')
  const [st, run] = useAction()
  async function save(e) {
    e.preventDefault()
    if (await run(() => call('renewal.decide', { id: row.id, decision, remarks, new_amount: amount || undefined }))) await onDone()
  }
  return (
    <form onSubmit={save} className="row" style={{ alignItems: 'flex-end', marginTop: '.6rem' }}>
      <div className="field mb-0">
        <label htmlFor={`d_${row.id}`}>Decision</label>
        <select id={`d_${row.id}`} value={decision} onChange={(e) => setDecision(e.target.value)} required>
          <option value="">Choose…</option>
          {(meta?.renewal_decisions || []).map((d) => <option key={d} value={d}>{text(d)}</option>)}
        </select>
      </div>
      {NEEDS_AMOUNT.includes(decision) && <Input id={`a_${row.id}`} label="New monthly amount (₹)" type="number" min="0" value={amount} onChange={setAmount} required />}
      <Input id={`r_${row.id}`} label={NEEDS_REMARKS.includes(decision) ? 'Remark (needed)' : 'Remark (optional)'} value={remarks} onChange={setRemarks} required={NEEDS_REMARKS.includes(decision)} />
      <button className="btn small" disabled={st.busy || !decision}>Save decision</button>
      <ErrorNote>{st.error}</ErrorNote>
    </form>
  )
}

export default function Renewals() {
  const meta = useMeta()
  const { data, error, loading, reload } = useLoad('renewal.list')
  const [status, setStatus] = useState('submitted')
  const [period, setPeriod] = useState('')
  const rows = useMemo(() => data?.rows ?? [], [data])
  const periods = useMemo(() => [...new Set(rows.map((r) => r.period))].sort().reverse(), [rows])
  const shown = rows.filter((r) => (!status || r.status === status) && (!period || r.period === period))
  const count = (s) => rows.filter((r) => r.status === s).length

  return (
    <div className="stack">
      <div className="page-title"><div><h1>Renewals</h1><p className="muted mb-0">Six-monthly renewal: scholars send their result and fee receipt, the committee decides.</p></div></div>
      <OpenRound onDone={reload} />
      <div className="row">
        <div className="chips-row" role="group" aria-label="Show">
          {[['submitted', `To decide (${count('submitted')})`], ['open', `Waiting for scholar (${count('open')})`], ['decided', `Decided (${count('decided')})`], ['', 'All']].map(([k, label]) => (
            <button key={k} className={status === k ? 'on' : ''} aria-pressed={status === k} onClick={() => setStatus(k)}>{label}</button>
          ))}
        </div>
        <div className="field mb-0">
          <label htmlFor="pf" className="visually-hidden">Period</label>
          <select id="pf" value={period} onChange={(e) => setPeriod(e.target.value)}><option value="">All periods</option>{periods.map((p) => <option key={p}>{p}</option>)}</select>
        </div>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {loading ? <p role="status"><span className="spinner" />Loading…</p> : (
        <div className="stack" style={{ gap: '.7rem' }}>
          {shown.map((r) => (
            <section key={r.id} className="card" aria-label={`Renewal of ${r.name}`}>
              <div className="row spread">
                <div>
                  <Link to={`/applications/${r.application_id}?tab=money`}><b>{r.name}</b></Link>
                  <span className="muted small"> {r.application_no} · {r.district} · {rupees(r.monthly_amount || 0)} a month · {r.period}</span>
                </div>
                <span className={`badge ${r.status === 'decided' ? 'ok' : r.status === 'submitted' ? 'warn' : 'info'}`}>{r.status === 'open' ? 'Waiting for scholar' : text(r.status)}</span>
              </div>
              {r.submitted_at && (
                <p className="small mb-0" style={{ marginTop: '.5rem' }}>
                  {r.course} {r.college ? `at ${r.college}` : ''} · year {r.current_year || '?'} · ends {r.completion_month || '?'} · last exam {r.last_exam || '?'} {r.result_percentage ? `(${r.result_percentage}%)` : ''}
                  {r.note ? <><br />Note from the scholar: {r.note}</> : null}
                </p>
              )}
              {r.status === 'decided' && <p className="small mb-0" style={{ marginTop: '.5rem' }}>Decision: <b>{text(r.decision)}</b>{r.remarks ? ` · ${r.remarks}` : ''}</p>}
              {(r.status === 'submitted') && <Decide row={r} meta={meta} onDone={reload} />}
            </section>
          ))}
          {shown.length === 0 && <p className="muted">Nothing here.</p>}
        </div>
      )}
      <Done>{null}</Done>
    </div>
  )
}
