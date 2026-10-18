import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DISTRICTS, STATUS } from '@shared/lib/constants.js'
import { rupees } from '@shared/lib/labels.js'
import { useLoad } from './useLoad.js'

// Cells starting with = + - @ can run as formulas when a CSV is opened in a spreadsheet.
const csvCell = (v) => {
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return `"${s.replaceAll('"', '""')}"`
}

export default function ApplicationList() {
  const [params, setParams] = useSearchParams()
  const { data, error, loading } = useLoad('admin.apps')
  const [q, setQ] = useState('')
  const status = params.get('status') ?? ''
  const district = params.get('district') ?? ''

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (data?.rows ?? []).filter((r) => {
      if (status && r.status !== status) return false
      if (district && r.district !== district) return false
      return !needle || [r.application_no, r.name, r.phone, r.course, r.college].some((v) => v?.toLowerCase().includes(needle))
    })
  }, [data, q, status, district])

  const setParam = (k, v) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    setParams(p, { replace: true })
  }

  function exportCsv() {
    const head = ['Application no', 'Name', 'District', 'Phone', 'Course', 'College', 'Status']
    const body = rows.map((r) => [r.application_no, r.name, r.district, r.phone, r.course, r.college, STATUS[r.status]?.en].map(csvCell).join(','))
    const url = URL.createObjectURL(new Blob(['﻿' + [head.join(','), ...body].join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'applications.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="stack">
      <div className="page-title">
        <h1>Applications</h1>
        <button className="btn outline" onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
      </div>
      <div className="card flat row" role="search">
        <div className="field grow mb-0">
          <label htmlFor="q">Search</label>
          <input id="q" placeholder="Name, number, phone, course…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="field grow mb-0">
          <label htmlFor="st">Status</label>
          <select id="st" value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">All</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.en}</option>)}
          </select>
        </div>
        <div className="field grow mb-0">
          <label htmlFor="di">District</label>
          <select id="di" value={district} onChange={(e) => setParam('district', e.target.value)}>
            <option value="">All</option>
            {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="alert error" role="alert">{error}</p>}
      {loading ? <p role="status"><span className="spinner" />Loading…</p> : (
        <div className="table-wrap">
          <table>
            <caption className="visually-hidden">Applications</caption>
            <thead><tr><th scope="col">Applicant</th><th scope="col">Course</th><th scope="col">District</th><th scope="col">Status</th><th scope="col">Grade</th><th scope="col">Monthly</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link className="who" to={`/applications/${r.id}`} style={{ textDecoration: 'none' }}>
                      <span className="avatar" aria-hidden="true">{(r.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>
                      <span><b>{r.name || 'Unnamed'}</b><span className="s">{r.application_no || 'Draft'}</span></span>
                    </Link>
                  </td>
                  <td>{r.course || '—'}<div className="muted small">{r.college || ''}</div></td>
                  <td>{r.district || '—'}</td>
                  <td><span className={`badge ${STATUS[r.status]?.tone}`}>{STATUS[r.status]?.en}</span></td>
                  <td>{r.grade || <span className="muted">—</span>}</td>
                  <td>{r.monthly_amount ? rupees(r.monthly_amount) : <span className="muted">—</span>}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="muted">Nothing matches.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
