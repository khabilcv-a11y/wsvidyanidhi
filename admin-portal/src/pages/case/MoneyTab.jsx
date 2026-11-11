import { useState } from 'react'
import { call } from '@shared/lib/api.js'
import { rupees } from '@shared/lib/labels.js'
import { Done, ErrorNote, Input, useAction } from '../ui.jsx'

const BANK_TEXT = { submitted: 'Entered, waiting to be checked', verified: 'Verified', change_requested: 'Scholar asked to change it', '': 'Not entered yet' }

function AmountForm({ app, reload }) {
  const [amount, setAmount] = useState(app.monthly_amount ?? '')
  const [reason, setReason] = useState('')
  const [st, run] = useAction()
  async function save(e) {
    e.preventDefault()
    if (await run(() => call('admin.amount', { id: app.id, monthly_amount: amount, reason }), 'Amount saved.')) {
      setReason('')
      await reload()
    }
  }
  return (
    <form className="row" onSubmit={save} style={{ alignItems: 'flex-end' }}>
      <Input id="amt" label="Monthly amount (₹)" type="number" min="0" value={amount} onChange={setAmount} required />
      <Input id="amt-why" label="Reason for the change" value={reason} onChange={setReason} required />
      <button className="btn small" disabled={st.busy}>Save amount</button>
      <ErrorNote>{st.error}</ErrorNote>
      <Done>{st.done}</Done>
    </form>
  )
}

// Finance staff see the full account details; every view is recorded in the audit log.
function BankBox({ data, reload }) {
  const { application: app } = data
  const [bank, setBank] = useState(null)
  const [note, setNote] = useState('')
  const [st, run] = useAction()
  async function show() {
    const r = await run(() => call('admin.bank.get', { application_id: app.id }))
    if (r) setBank(r.bank || false)
  }
  async function decide(decision) {
    if (await run(() => call('admin.bank.verify', { application_id: app.id, decision, note }), decision === 'verify' ? 'Verified.' : 'Sent back to the scholar.')) {
      setBank(null)
      setNote('')
      await reload()
    }
  }
  return (
    <section className="card" aria-labelledby="bank-h">
      <h2 id="bank-h">Bank details</h2>
      <p>Status: <strong>{BANK_TEXT[data.bank_status] ?? data.bank_status}</strong></p>
      {bank === null && data.bank_status && <button className="btn outline small" onClick={show} disabled={st.busy}>Show account details (recorded in the log)</button>}
      {bank && (
        <>
          <div className="table-wrap"><table className="kv"><tbody>
            <tr><th scope="row">Account holder</th><td>{bank.holder}</td></tr>
            <tr><th scope="row">Bank and branch</th><td>{bank.bank}{bank.branch ? `, ${bank.branch}` : ''}</td></tr>
            <tr><th scope="row">Account number</th><td>{bank.account_no}</td></tr>
            <tr><th scope="row">IFSC</th><td>{bank.ifsc}</td></tr>
          </tbody></table></div>
          {bank.status !== 'verified' && (
            <div className="row" style={{ marginTop: '.8rem', alignItems: 'flex-end' }}>
              <button className="btn small" onClick={() => decide('verify')} disabled={st.busy}>Mark as verified</button>
              <Input id="bank-note" label="If something is wrong, say what" value={note} onChange={setNote} />
              <button className="btn danger small" onClick={() => decide('reject')} disabled={st.busy || !note.trim()}>Send back</button>
            </div>
          )}
        </>
      )}
      <ErrorNote>{st.error}</ErrorNote>
      <Done>{st.done}</Done>
    </section>
  )
}

export default function MoneyTab({ data, reload, finance }) {
  const { application: app, payments, renewals } = data
  return (
    <div className="stack">
      <section className="card" aria-labelledby="amt-h">
        <h2 id="amt-h">Scholarship amount</h2>
        <p className="muted mt-0">Fund: {app.fund_type === 'zakat' ? 'Zakat' : app.fund_type === 'non_zakat' ? 'Non-zakat' : 'not set yet (set when the interview decision is recorded)'}</p>
        <AmountForm app={app} reload={reload} />
      </section>
      {finance && <BankBox data={data} reload={reload} />}
      <section className="card" aria-labelledby="pay-h">
        <h2 id="pay-h">Payments</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Period</th><th scope="col">Months</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col">Paid on</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}><td>{String(p.note).replace('period:', '').replace(' retried', '')}</td><td>{p.months}</td><td>{rupees(p.amount)}</td><td><span className={`badge ${p.status === 'paid' ? 'ok' : p.status === 'failed' ? 'danger' : 'warn'}`}>{p.status}</span></td><td>{p.paid_on || '—'}</td></tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={5} className="muted">No payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card" aria-labelledby="ren-h">
        <h2 id="ren-h">Renewals</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Period</th><th scope="col">Status</th><th scope="col">Decision</th><th scope="col">Sent</th></tr></thead>
            <tbody>
              {renewals.map((r) => (
                <tr key={r.id}><td>{r.period}</td><td>{r.status}</td><td>{r.decision ? r.decision.replace(/_/g, ' ') : '—'}</td><td>{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-IN') : '—'}</td></tr>
              ))}
              {renewals.length === 0 && <tr><td colSpan={4} className="muted">No renewals yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
