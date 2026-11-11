import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { call } from '@shared/lib/api.js'
import { rupees } from '@shared/lib/labels.js'
import { useLoad } from './useLoad.js'
import { Done, ErrorNote, Input, Select, downloadText, useAction } from './ui.jsx'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const TONE = { paid: 'ok', failed: 'danger', pending: 'warn' }

function NewBatch({ onCreated }) {
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [months, setMonths] = useState('6')
  const [fund, setFund] = useState('')
  const [name, setName] = useState('')
  const [rows, setRows] = useState(null)
  const [chosen, setChosen] = useState(new Set())
  const [st, run] = useAction()
  const start = `${year}-${month}`

  async function check(e) {
    e.preventDefault()
    const r = await run(() => call('pay.eligible', { start_month: start, months, fund_type: fund || undefined }))
    if (r) {
      setRows(r.rows)
      setChosen(new Set(r.rows.filter((x) => !x.reason).map((x) => x.application_id)))
    }
  }
  async function create() {
    const r = await run(() => call('pay.create', { start_month: start, months, fund_type: fund || undefined, name, application_ids: [...chosen] }))
    if (r) {
      setRows(null)
      await onCreated(r)
    }
  }
  const ok = rows ? rows.filter((r) => !r.reason) : []
  const total = ok.filter((r) => chosen.has(r.application_id)).reduce((s, r) => s + r.amount, 0)
  return (
    <section className="card" aria-labelledby="nb-h">
      <h2 id="nb-h">Make a payment batch</h2>
      <form className="row" onSubmit={check} style={{ alignItems: 'flex-end' }}>
        <div className="field mb-0"><label htmlFor="pm">First month</label>
          <select id="pm" value={month} onChange={(e) => setMonth(e.target.value)}>{MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}</select></div>
        <Input id="py" label="Year" type="number" value={year} onChange={setYear} required />
        <Input id="pn" label="Number of months" type="number" min="1" max="12" value={months} onChange={setMonths} required />
        <Select id="pf" label="Fund" value={fund} onChange={setFund} options={[['zakat', 'Zakat'], ['non_zakat', 'Non-zakat']]} blank="Both funds" />
        <button className="btn small" disabled={st.busy}>Check who is eligible</button>
      </form>
      <ErrorNote>{st.error}</ErrorNote>
      {rows && (
        <>
          <p className="muted small" style={{ marginTop: '.8rem' }}>{ok.length} eligible. The others cannot be paid yet, and the reason is shown.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col" /><th scope="col">Scholar</th><th scope="col">Fund</th><th scope="col">Monthly</th><th scope="col">Months</th><th scope="col">Amount</th><th scope="col">Note</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.application_id} className={r.reason ? 'muted' : ''}>
                    <td><input type="checkbox" aria-label={`Include ${r.name}`} disabled={Boolean(r.reason)} checked={chosen.has(r.application_id)}
                      onChange={() => setChosen((s) => { const n = new Set(s); if (n.has(r.application_id)) n.delete(r.application_id); else n.add(r.application_id); return n })} /></td>
                    <td><Link to={`/applications/${r.application_id}?tab=money`}>{r.name}</Link><div className="small">{r.application_no}</div></td>
                    <td>{r.fund_type === 'zakat' ? 'Zakat' : r.fund_type === 'non_zakat' ? 'Non-zakat' : '—'}</td>
                    <td>{r.monthly_amount ? rupees(r.monthly_amount) : '—'}</td><td>{r.months}</td><td>{rupees(r.amount)}</td>
                    <td className="small">{r.reason || 'Ready'}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} className="muted">No active scholars.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="row" style={{ marginTop: '.8rem', alignItems: 'flex-end' }}>
            <Input id="bn" label="Batch name (optional)" value={name} onChange={setName} />
            <button className="btn" onClick={create} disabled={st.busy || chosen.size === 0}>Create batch of {chosen.size} ({rupees(total)})</button>
          </div>
        </>
      )}
    </section>
  )
}

function Batch({ id, onBack }) {
  const { data, error, loading, reload } = useLoad('pay.batch', { id })
  const [chosen, setChosen] = useState(new Set())
  const [ref, setRef] = useState('')
  const [paidOn, setPaidOn] = useState('')
  const [st, run] = useAction()
  if (loading) return <p role="status"><span className="spinner" />Loading…</p>
  if (error) return <p className="alert error" role="alert">{error}</p>
  const { batch, items } = data
  async function exportFile() {
    const r = await run(() => call('pay.export', { id }))
    if (r) {
      downloadText(r.filename, r.csv)
      await reload()
    }
  }
  async function mark(status) {
    if (await run(() => call('pay.mark', { ids: [...chosen], status, reference: ref, paid_on: paidOn || undefined }), 'Updated.')) {
      setChosen(new Set())
      await reload()
    }
  }
  async function retry() {
    const r = await run(() => call('pay.retry', { batch_id: id }))
    if (r) window.alert(`A new batch with ${r.count} failed payments was made. Find it in the list.`)
  }
  const toggle = (pid) => setChosen((s) => { const n = new Set(s); if (n.has(pid)) n.delete(pid); else n.add(pid); return n })
  return (
    <div className="stack">
      <p className="mb-0"><button className="link-btn" onClick={onBack}>← All batches</button></p>
      <div className="page-title">
        <div><h1>{batch.name}</h1><p className="muted mb-0">From {batch.start_month} for {batch.months} months · {batch.status}</p></div>
        <div className="row">
          <button className="btn" onClick={exportFile} disabled={st.busy}>Download bank file (CSV)</button>
          {batch.failed > 0 && <button className="btn outline" onClick={retry}>Retry failed ({batch.failed})</button>}
        </div>
      </div>
      <p className="alert warn"><span>Open the bank file in a text editor or import it into the bank site directly. Opening it in a spreadsheet can damage long account numbers.</span></p>
      <div className="stat-row">
        <div className="card"><b>{rupees(batch.total)}</b>Batch total</div>
        <div className="card"><b>{rupees(batch.paid)}</b>Paid</div>
        <div className="card"><b>{batch.pending}</b>Not yet paid</div>
        <div className="card"><b>{batch.failed}</b>Failed</div>
        <div className="card"><b>{rupees(batch.zakat)}</b>Zakat</div>
        <div className="card"><b>{rupees(batch.non_zakat)}</b>Non-zakat</div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col"><input type="checkbox" aria-label="Select all" checked={items.length > 0 && chosen.size === items.length} onChange={() => setChosen(chosen.size === items.length ? new Set() : new Set(items.map((i) => i.id)))} /></th><th scope="col">Scholar</th><th scope="col">Amount</th><th scope="col">Fund</th><th scope="col">Status</th><th scope="col">Reference</th><th scope="col">Paid on</th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td><input type="checkbox" aria-label={`Select ${p.name}`} checked={chosen.has(p.id)} onChange={() => toggle(p.id)} /></td>
                <td><b>{p.name}</b><div className="muted small">{p.application_no}</div></td>
                <td>{rupees(p.amount)}</td>
                <td>{p.fund_type === 'zakat' ? 'Zakat' : 'Non-zakat'}</td>
                <td><span className={`badge ${TONE[p.status]}`}>{p.status}</span></td>
                <td>{p.reference || '—'}</td><td>{p.paid_on || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {chosen.size > 0 && (
        <div className="sticky-bar">
          <strong>{chosen.size} selected</strong>
          <input aria-label="Bank reference" placeholder="Bank reference (optional)" value={ref} onChange={(e) => setRef(e.target.value)} />
          <input aria-label="Paid on" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          <button className="btn small" onClick={() => mark('paid')} disabled={st.busy}>Mark paid</button>
          <button className="btn danger small" onClick={() => mark('failed')} disabled={st.busy}>Mark failed</button>
          <button className="btn ghost small" onClick={() => mark('pending')} disabled={st.busy}>Back to pending</button>
        </div>
      )}
      <ErrorNote>{st.error}</ErrorNote><Done>{st.done}</Done>
    </div>
  )
}

export default function Payments() {
  const [params, setParams] = useSearchParams()
  const { data, error, loading, reload } = useLoad('pay.batches')
  const batch = params.get('batch')
  if (batch) return <Batch id={batch} onBack={() => { setParams({}); reload() }} />
  return (
    <div className="stack">
      <div className="page-title"><div><h1>Payments</h1><p className="muted mb-0">Build a batch for a period, download the bank file, then mark each payment paid or failed.</p></div></div>
      <NewBatch onCreated={async (r) => { await reload(); setParams({ batch: r.id }) }} />
      <ErrorNote>{error}</ErrorNote>
      {loading ? <p role="status"><span className="spinner" />Loading…</p> : (
        <div className="table-wrap">
          <table>
            <caption className="visually-hidden">Payment batches</caption>
            <thead><tr><th scope="col">Batch</th><th scope="col">Period</th><th scope="col">People</th><th scope="col">Total</th><th scope="col">Paid</th><th scope="col">Waiting</th><th scope="col">Failed</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {data.batches.map((b) => (
                <tr key={b.id}>
                  <td><button className="link-btn" onClick={() => setParams({ batch: b.id })}><b>{b.name}</b></button></td>
                  <td>{b.start_month}, {b.months} months</td><td>{b.count}</td><td>{rupees(b.total)}</td><td>{rupees(b.paid)}</td><td>{b.pending}</td><td>{b.failed}</td><td>{b.status}</td>
                </tr>
              ))}
              {data.batches.length === 0 && <tr><td colSpan={8} className="muted">No batches yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
