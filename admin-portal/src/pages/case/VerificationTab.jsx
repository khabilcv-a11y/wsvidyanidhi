import { useState } from 'react'
import { call } from '@shared/lib/api.js'
import VerifyForm from '@shared/components/VerifyForm.jsx'
import { label } from '@shared/lib/labels.js'
import { Done, ErrorNote, Select, useAction, useLoadOnce } from '../ui.jsx'

function Answers({ v }) {
  const rows = [
    ['Guardian details correct', v.guardian_ok ? 'Yes' : 'No'], ['House', label('house', v.house) + (v.house_note ? ` (${v.house_note})` : '')],
    ['Financial condition', label('fin_condition', v.fin_condition)], ['Eligible for Zakat', label('yesno', v.zakat_eligible)],
    ['Category', label('zakat_category', v.category)], ['Connection with Wisdom', label('connection', v.wisdom_connection)],
    ['Wisdom district', v.wisdom_district || '—'], ['Remarks', v.remarks || '—'],
  ]
  return <div className="table-wrap"><table className="kv"><tbody>{rows.map(([k, x]) => <tr key={k}><th scope="row">{k}</th><td>{x}</td></tr>)}</tbody></table></div>
}

export default function VerificationTab({ data, reload, meta }) {
  const { application: a, verifications } = data
  const verifiers = useLoadOnce('admin.verifiers')
  const [verifierId, setVerifierId] = useState('')
  const [dueOn, setDueOn] = useState('')
  const [onBehalf, setOnBehalf] = useState(false)
  const [st, run] = useAction()

  const assign = (e) => {
    e.preventDefault()
    run(async () => { await call('admin.verify.assign', { application_id: a.id, verifier_id: verifierId, due_on: dueOn || undefined }); await reload() }, 'Assigned. The verifier has been emailed.')
  }

  return (
    <div className="stack">
      <form className="card" onSubmit={assign}>
        <h2>Assign a field verifier</h2>
        <div className="form-grid">
          <Select id="vf" label="Verifier" required value={verifierId} onChange={setVerifierId}
            options={(verifiers?.verifiers || []).map((v) => [v.id, `${v.name}${v.districts.length ? ` (${v.districts.join(', ')})` : ''}`])} />
          <div className="field"><label htmlFor="vd">Due date (optional)</label><input id="vd" type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} /></div>
        </div>
        <ErrorNote>{st.error}</ErrorNote><Done>{st.done}</Done>
        <button className="btn" disabled={st.busy || !verifierId}>Assign visit</button>
        {verifiers && verifiers.verifiers.length === 0 && <p className="hint">No verifiers yet. Add people with the Field verifier role under Staff.</p>}
      </form>

      {verifications.map((v) => (
        <section className="card" key={v.id} aria-label="Verification">
          <div className="row spread">
            <h3>{v.verifier || 'Verifier'}{v.on_behalf ? ' (entered by an admin)' : ''}</h3>
            <span className={`badge ${v.status === 'assigned' ? 'warn' : 'ok'}`}>{v.status === 'assigned' ? `Waiting · due ${v.due_on || '—'}` : v.status === 'reviewed' ? 'Reviewed' : 'Submitted'}</span>
          </div>
          {v.status !== 'assigned' && <Answers v={v} />}
          {v.status === 'submitted' && (
            <button className="btn outline small" style={{ marginTop: '.75rem' }}
              onClick={() => run(async () => { await call('admin.verify.review', { id: v.id }); await reload() })}>Mark reviewed</button>
          )}
        </section>
      ))}

      <section className="card flat">
        <div className="row spread">
          <h3 className="mb-0">Enter a report for a verifier</h3>
          <button className="btn ghost small" onClick={() => setOnBehalf(!onBehalf)}>{onBehalf ? 'Hide' : 'Show form'}</button>
        </div>
        {onBehalf && (
          <div style={{ marginTop: '1rem' }}>
            <VerifyForm districts={meta?.wisdom_districts} busy={st.busy} submitLabel="Save report"
              onSubmit={(fields) => run(async () => { await call('admin.verify.submit', { application_id: a.id, fields }); await reload(); setOnBehalf(false) }, 'Report saved.')} />
          </div>
        )}
      </section>
    </div>
  )
}
