import { STATUS } from '@shared/lib/constants.js'
import { rupees } from '@shared/lib/labels.js'
import { useLoad } from './useLoad.js'
import { downloadText, toCsv } from './ui.jsx'

function Bars({ title, rows, label = (k) => k }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <section className="card" aria-label={title}>
      <h2>{title}</h2>
      {rows.length === 0 ? <p className="muted mb-0">No data yet.</p> : (
        <ul className="bar-chart">
          {rows.map((r) => (
            <li key={r.key}><span>{label(r.key)}</span><span className="b"><i style={{ width: `${(r.count / max) * 100}%` }} /></span><b>{r.count}</b></li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function Reports() {
  const { data, error, loading } = useLoad('report.summary')
  if (loading) return <p role="status"><span className="spinner" />Loading…</p>
  if (error) return <p className="alert error" role="alert">{error}</p>
  const years = data.years

  function exportDistricts() {
    downloadText('scholars-by-district.csv', toCsv(
      ['District', ...years, 'Total'],
      data.by_district.map((d) => [d.district, ...years.map((y) => d[y] || 0), d.total]),
    ))
  }

  return (
    <div className="stack">
      <div className="page-title"><div><h1>Reports</h1><p className="muted mb-0">Scholars only unless stated. Figures follow your district access.</p></div></div>
      <div className="stat-row">
        <div className="card"><b>{data.money.scholars}</b>Scholars</div>
        <div className="card"><b>{rupees(data.money.per_month)}</b>Committed each month</div>
        <div className="card"><b>{rupees(data.money.by_fund.zakat?.per_month || 0)}</b>from Zakat ({data.money.by_fund.zakat?.scholars || 0})</div>
        <div className="card"><b>{rupees(data.money.by_fund.non_zakat?.per_month || 0)}</b>from non-zakat ({data.money.by_fund.non_zakat?.scholars || 0})</div>
        <div className="card"><b>{rupees(data.payments.paid)}</b>Paid so far</div>
        <div className="card"><b>{rupees(data.payments.pending)}</b>Payments waiting</div>
      </div>

      <section className="card" aria-labelledby="dist-h">
        <div className="row spread"><h2 id="dist-h" className="mb-0">Scholars by district and scheme year</h2><button className="btn outline small" onClick={exportDistricts} disabled={!data.by_district.length}>Export (CSV)</button></div>
        <div className="table-wrap" style={{ marginTop: '.8rem' }}>
          <table>
            <thead><tr><th scope="col">District</th>{years.map((y) => <th key={y} scope="col">{y}</th>)}<th scope="col">Total</th></tr></thead>
            <tbody>
              {data.by_district.map((d) => <tr key={d.district}><td>{d.district}</td>{years.map((y) => <td key={y}>{d[y] || 0}</td>)}<td><b>{d.total}</b></td></tr>)}
              {data.by_district.length === 0 && <tr><td colSpan={years.length + 2} className="muted">No scholars yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid cols-2">
        <Bars title="All applications by status" rows={data.by_status} label={(k) => STATUS[k]?.en || k} />
        <Bars title="Scholars by field of study" rows={data.by_stream} />
        <Bars title="Scholars by course level" rows={data.by_category} />
        <Bars title="Scholars by gender" rows={data.by_gender} />
        <Bars title="Interview grades" rows={data.by_grade} />
        <Bars title="Most common courses" rows={data.by_course.slice(0, 12)} />
      </div>
    </div>
  )
}
