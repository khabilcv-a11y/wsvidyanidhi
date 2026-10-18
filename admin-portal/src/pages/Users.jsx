import { useState } from 'react'
import { call } from '@shared/lib/api.js'
import { DISTRICTS } from '@shared/lib/constants.js'
import { useLoad } from './useLoad.js'

const ROLE_NAME = { admin: 'Admin', verifier: 'Field verifier', master: 'Master admin' }
const EMPTY = { email: '', role: 'admin', finance: false, district_scope: [] }

export default function Users() {
  const { data, error, loading, reload } = useLoad('admin.users')
  const [form, setForm] = useState(EMPTY)
  const [actionError, setActionError] = useState(null)
  const [done, setDone] = useState(null)

  async function act(fn, message) {
    setActionError(null)
    setDone(null)
    try {
      await fn()
      if (message) setDone(message)
      await reload()
    } catch (e) {
      setActionError(e.message)
    }
  }

  const invite = (e) => {
    e.preventDefault()
    act(async () => {
      await call('admin.invite', form)
      setForm(EMPTY)
    }, 'Saved. They get access the first time they sign in with that Google account.')
  }

  if (loading) return <p role="status"><span className="spinner" />Loading…</p>
  if (error) return <p className="alert error" role="alert">{error}</p>

  return (
    <div className="stack">
      <div className="page-title"><h1>Staff access</h1></div>
      <p className="muted mt-0">Add a person's Google email and role. An empty district list means all districts. Add a second master admin so access is never lost.</p>
      {actionError && <p className="alert error" role="alert">{actionError}</p>}
      {done && <p className="alert success" role="status">{done}</p>}

      <form className="card" onSubmit={invite}>
        <h2>Add or update</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="ie">Google email</label>
            <input id="ie" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="ir">Role</label>
            <select id="ir" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {Object.entries(ROLE_NAME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="id">Districts</label>
            <select id="id" multiple size={5} value={form.district_scope} aria-describedby="id-h"
              onChange={(e) => setForm({ ...form, district_scope: [...e.target.selectedOptions].map((o) => o.value) })}>
              {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <p className="hint" id="id-h">Hold Ctrl (or Cmd) to choose several.</p>
          </div>
          <div className="field">
            <span className="label">Permissions</span>
            <label className="check">
              <input type="checkbox" checked={form.finance} onChange={(e) => setForm({ ...form, finance: e.target.checked })} />
              <span>Finance: bank details and payments</span>
            </label>
          </div>
        </div>
        <button className="btn">Save</button>
      </form>

      {data.invites.length > 0 && (
        <section className="card" aria-labelledby="wait-h">
          <h2 id="wait-h">Waiting for first sign-in</h2>
          <ul className="mb-0">{data.invites.map((i) => <li key={i.email}>{i.email} · {ROLE_NAME[i.role]}{i.district_scope.length ? ` · ${i.district_scope.join(', ')}` : ''}</li>)}</ul>
        </section>
      )}

      <section className="card" aria-labelledby="ppl-h">
        <h2 id="ppl-h">People</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Districts</th><th scope="col">Finance</th><th scope="col">Active</th></tr></thead>
            <tbody>
              {data.people.map((p) => (
                <tr key={p.id}>
                  <td>{p.email}</td>
                  <td>{ROLE_NAME[p.role]}</td>
                  <td>{p.district_scope.length ? p.district_scope.join(', ') : 'All'}</td>
                  <td>
                    <input type="checkbox" checked={p.finance} aria-label={`Finance permission for ${p.email}`}
                      onChange={(e) => act(() => call('admin.userupdate', { id: p.id, finance: e.target.checked }))} />
                  </td>
                  <td>
                    <input type="checkbox" checked={p.active} aria-label={`Active: ${p.email}`}
                      onChange={(e) => act(() => call('admin.userupdate', { id: p.id, active: e.target.checked }))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
