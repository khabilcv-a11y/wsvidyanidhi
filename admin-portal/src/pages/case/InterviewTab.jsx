import { useMemo, useState } from 'react'
import { call } from '@shared/lib/api.js'
import { label, options } from '@shared/lib/labels.js'
import { Done, ErrorNote, Input, Select, useAction } from '../ui.jsx'

const OPTION_TEXT = (k) => k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

export default function InterviewTab({ data, reload, meta, me }) {
  const { application: a, interviews } = data
  const mine = interviews.find((i) => i.interviewer_id === me.id && i.round === 'initial')
  const [scores, setScores] = useState(mine?.scores || {})
  const [f, setF] = useState({
    mode: mine?.mode || 'in_person', grade: mine?.grade || '', recommended_amount: mine?.recommended_amount ?? '',
    fund_type: mine?.fund_type || '', remarks: mine?.remarks || '',
  })
  const [st, run] = useAction()
  const total = useMemo(() => (meta?.criteria || []).reduce((sum, c) => {
    const v = scores[c.key]
    if (v === undefined || v === '') return sum
    if (c.range) return sum + Number(v)
    const opt = c.options.find(([k]) => k === v)
    return sum + (opt ? opt[1] : 0)
  }, 0), [scores, meta])

  const initial = interviews.filter((i) => i.round === 'initial')
  const avg = initial.length ? (initial.reduce((s, i) => s + (i.total || 0), 0) / initial.length).toFixed(1) : null

  const save = (e) => {
    e.preventDefault()
    run(async () => {
      await call('interview.save', { application_id: a.id, round: 'initial', scores, ...f, recommended_amount: f.recommended_amount === '' ? '' : Number(f.recommended_amount) })
      await reload()
    }, 'Saved.')
  }
  if (!meta) return <p role="status"><span className="spinner" />Loading…</p>

  return (
    <div className="stack">
      <form className="card" onSubmit={save}>
        <div className="row spread">
          <h2 className="mb-0">Score sheet</h2>
          <span className="badge sun" aria-live="polite">Total {total} / 70</span>
        </div>
        <p className="muted">Your own record. Each panel member saves a separate one, and the average is shown below.</p>
        <div className="form-grid">
          {meta.criteria.map((c) => (c.range ? (
            <Input key={c.key} id={`s_${c.key}`} label={`${c.label} (0 to ${c.max})`} type="number" min="0" max={c.max} step="0.5"
              value={scores[c.key]} onChange={(v) => setScores({ ...scores, [c.key]: v })} />
          ) : (
            <Select key={c.key} id={`s_${c.key}`} label={`${c.label} (max ${c.max})`} value={scores[c.key]}
              onChange={(v) => setScores({ ...scores, [c.key]: v })}
              options={c.options.map(([k, pts]) => [k, `${OPTION_TEXT(k)} (${pts})`])} />
          )))}
        </div>
        <h3 style={{ marginTop: '1rem' }}>Outcome</h3>
        <div className="form-grid">
          <Select id="i_mode" label="Interview mode" blank={null} value={f.mode} onChange={(v) => setF({ ...f, mode: v })} options={[['in_person', 'In person'], ['online', 'Online']]} />
          <Select id="i_grade" label="Grade" value={f.grade} onChange={(v) => setF({ ...f, grade: v })} options={meta.grades.map((g) => [g, g])} />
          <Select id="i_amt" label="Recommended monthly amount" value={String(f.recommended_amount)} onChange={(v) => setF({ ...f, recommended_amount: v })}
            options={[[0, '₹0 (not recommended)'], [1000, '₹1,000'], [1500, '₹1,500'], [2000, '₹2,000']].map(([v, t]) => [String(v), t])} />
          <Select id="i_fund" label="Fund" value={f.fund_type} onChange={(v) => setF({ ...f, fund_type: v })} options={options('fund')} />
          <div className="full"><label htmlFor="i_rem" className="label">Remarks</label><textarea id="i_rem" rows={3} value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} /></div>
        </div>
        <ErrorNote>{st.error}</ErrorNote><Done>{st.done}</Done>
        <button className="btn" disabled={st.busy}>Save my score sheet</button>
      </form>

      <section className="card" aria-labelledby="iv-h">
        <h2 id="iv-h">Panel records{avg !== null && <span className="muted"> · average {avg}</span>}</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Interviewer</th><th scope="col">Round</th><th scope="col">Total</th><th scope="col">Grade</th><th scope="col">Amount</th><th scope="col">Fund</th><th scope="col">Remarks</th></tr></thead>
            <tbody>
              {interviews.map((i) => (
                <tr key={i.id}><td>{i.interviewer || '—'}</td><td>{i.round}</td><td>{i.total}</td><td>{i.grade || '—'}</td>
                  <td>{i.recommended_amount ?? '—'}</td><td>{i.fund_type ? label('fund', i.fund_type) : '—'}</td><td>{i.remarks || '—'}</td></tr>
              ))}
              {interviews.length === 0 && <tr><td colSpan={7} className="muted">No interview records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
