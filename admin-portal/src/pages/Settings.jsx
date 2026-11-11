import { useEffect, useState } from 'react'
import { call } from '@shared/lib/api.js'
import { useLoad } from './useLoad.js'
import { Done, ErrorNote, Input, useAction } from './ui.jsx'

function Cycles() {
  const { data, error, loading, reload } = useLoad('admin.cycles')
  const [year, setYear] = useState('')
  const [st, run] = useAction()
  async function patch(id, body, msg) {
    if (await run(() => call('admin.cycle.save', { id, ...body }), msg)) await reload()
  }
  async function create(e) {
    e.preventDefault()
    if (await run(() => call('admin.cycle.create', { year }), 'Scheme year added.')) {
      setYear('')
      await reload()
    }
  }
  return (
    <section className="card" aria-labelledby="cy-h">
      <h2 id="cy-h">Scheme years</h2>
      <p className="muted mt-0">A scheme year is named for the academic year and numbered by the year it ends: 2027 is the 2026-27 scheme, and its application numbers start with 27. Only one year can take new applications at a time.</p>
      <ErrorNote>{error || st.error}</ErrorNote><Done>{st.done}</Done>
      {loading ? <p role="status"><span className="spinner" />Loading…</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Scheme year</th><th scope="col">Number starts with</th><th scope="col">Next number</th><th scope="col">Applications</th><th scope="col">Closes on</th></tr></thead>
            <tbody>
              {data.cycles.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td>{c.code}</td>
                  <td>{c.code}{String(c.next_serial).padStart(4, '0')}</td>
                  <td>
                    <button className={`btn small ${c.is_open ? '' : 'outline'}`} onClick={() => patch(c.id, { is_open: !c.is_open }, c.is_open ? 'Closed to new applications.' : 'Open for applications.')}>
                      {c.is_open ? 'Open: click to close' : 'Closed: click to open'}
                    </button>
                  </td>
                  <td><input type="date" aria-label={`Closing date for ${c.name}`} value={c.closes_on || ''} onChange={(e) => patch(c.id, { closes_on: e.target.value }, 'Date saved.')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form className="row" onSubmit={create} style={{ alignItems: 'flex-end', marginTop: '1rem' }}>
        <Input id="ny" label="Add a scheme year (the year it ends)" type="number" min="2020" max="2100" value={year} onChange={setYear} required hint="For example 2028 for the 2027-28 scheme" />
        <button className="btn small" disabled={st.busy}>Add</button>
      </form>
    </section>
  )
}

function Districts() {
  const { data, reload } = useLoad('admin.settings')
  const [text, setText] = useState('')
  const [st, run] = useAction()
  useEffect(() => { if (data) setText(data.wisdom_districts.join('\n')) }, [data])
  async function save(e) {
    e.preventDefault()
    if (await run(() => call('admin.settings.save', { wisdom_districts: text.split('\n').map((x) => x.trim()).filter(Boolean) }), 'Saved.')) await reload()
  }
  return (
    <section className="card" aria-labelledby="wd-h">
      <h2 id="wd-h">Wisdom districts</h2>
      <p className="muted mt-0">The organisation's own districts, one on each line. Committee members can be limited to these when you add them under Staff.</p>
      <form onSubmit={save}>
        <div className="field"><label htmlFor="wd">Districts</label><textarea id="wd" rows={8} value={text} onChange={(e) => setText(e.target.value)} /></div>
        <button className="btn" disabled={st.busy}>Save</button>
        <ErrorNote>{st.error}</ErrorNote><Done>{st.done}</Done>
      </form>
    </section>
  )
}

export default function Settings() {
  return (
    <div className="stack">
      <div className="page-title"><div><h1>Scheme years and settings</h1><p className="muted mb-0">Only the master admin can change these.</p></div></div>
      <Cycles />
      <Districts />
    </div>
  )
}
