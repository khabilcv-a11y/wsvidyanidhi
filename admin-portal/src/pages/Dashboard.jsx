import { Link } from 'react-router-dom'
import { useAuth } from '@shared/lib/auth.jsx'
import { STATUS } from '@shared/lib/constants.js'
import { rupees } from '@shared/lib/labels.js'
import { useLoad } from './useLoad.js'

const TONE = { warn: 'var(--warn)', info: 'var(--info)', ok: 'var(--ok)', danger: 'var(--red)', '': 'var(--line-strong)' }
const PIPELINE = [
  ['Applying', ['draft', 'submitted', 'documents_requested']],
  ['Checking', ['under_verification', 'interview_scheduled', 'decision_pending']],
  ['Scholars', ['selected', 'active', 'renewal_due', 'renewal_review', 'on_hold']],
  ['Closed', ['waitlisted', 'not_selected', 'discontinued', 'completed']],
]

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const when = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '')

export default function Dashboard() {
  const { user } = useAuth()
  const { data, error, loading } = useLoad('admin.dashboard')
  if (loading) return <p role="status"><span className="spinner" />Loading…</p>
  if (error) return <p className="alert error" role="alert">{error}</p>
  const finance = user.role === 'master' || user.finance
  // an older backend may not send the newer figures yet
  data.upcoming_events = data.upcoming_events ?? []
  data.recent = data.recent ?? []
  data.scholars = data.scholars ?? 0
  data.drafts = data.drafts ?? (data.counts.draft || 0)
  const first = (user.name || user.email).split(/[ @]/)[0]

  // Everything that waits for someone, most urgent first
  const todo = [
    { n: data.docs_to_review, text: 'Documents to review', to: '/applications?status=submitted', tone: 'warn' },
    { n: data.needs_call, text: 'Applicants who need a phone call', to: '/applications?status=documents_requested', tone: 'danger' },
    { n: data.verifications_due, text: 'Field visits not reported', to: '/applications?status=under_verification', tone: 'info' },
    { n: data.decisions_pending, text: 'Waiting for a decision', to: '/applications?status=decision_pending', tone: 'info' },
    { n: data.renewals_to_decide, text: 'Renewals to decide', to: '/renewals', tone: 'warn' },
    finance && { n: data.bank_to_verify, text: 'Bank details to verify', to: '/bank', tone: 'info' },
    finance && { n: data.payments_pending, text: 'Payments not marked paid', to: '/payments', tone: 'warn' },
    { n: data.claims, text: 'Record links to approve', to: '/claims', tone: 'info' },
  ].filter(Boolean)
  const open = todo.filter((t) => t.n)

  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="small muted mb-0">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>{greeting()}, {first}</h1>
        </div>
        <div className="row">
          <Link className="btn outline" to="/events">Meets</Link>
          <Link className="btn accent" to="/applications">Applications <span className="arr" aria-hidden="true">→</span></Link>
        </div>
      </div>

      <div className="kpis">
        <div className="card kpi"><b>{data.total}</b><span>Applications</span></div>
        <div className="card kpi"><b>{data.scholars}</b><span>Scholars</span></div>
        <div className="card kpi"><b>{data.per_month ? rupees(data.per_month) : '—'}</b><span>Paid each month (active)</span></div>
        <Link className="card kpi" to="/applications?status=draft" style={{ textDecoration: 'none', color: 'inherit' }}><b>{data.drafts}</b><span>Started, not submitted</span></Link>
      </div>

      <section className="card" aria-labelledby="todo-h">
        <div className="row spread"><h2 id="todo-h" className="mb-0">To do</h2><span className="muted small">{open.length ? `${open.length} kinds of work waiting` : 'All clear'}</span></div>
        {open.length === 0 ? <p className="muted mb-0" style={{ marginTop: '.8rem' }}>Nothing is waiting. You are up to date.</p> : (
          <ul className="todo">
            {open.map((t) => (
              <li key={t.text}><Link to={t.to}><span className={`badge ${t.tone}`}>{t.n}</span><span>{t.text}</span><span className="arr" aria-hidden="true">→</span></Link></li>
            ))}
          </ul>
        )}
      </section>

      <div className="two">
        <section className="card" aria-labelledby="pipe-h">
          <h2 id="pipe-h">Where applications are</h2>
          {data.total === 0 && <p className="muted mb-0">No applications yet.</p>}
          {PIPELINE.map(([name, group]) => {
            const items = group.filter((s) => data.counts[s])
            if (!items.length) return null
            const sum = items.reduce((s, k) => s + data.counts[k], 0)
            return (
              <div key={name} style={{ marginBottom: '1.1rem' }}>
                <div className="row spread small"><strong>{name}</strong><span className="muted">{sum}</span></div>
                <div className="bars" role="img" aria-label={`${name}: ${sum}`}>
                  {items.map((s) => <span key={s} style={{ flexGrow: data.counts[s], background: TONE[STATUS[s].tone] }} />)}
                </div>
                <ul className="legend">
                  {items.map((s) => <li key={s}><i style={{ background: TONE[STATUS[s].tone] }} /><Link to={`/applications?status=${s}`}>{STATUS[s].en}</Link><b>{data.counts[s]}</b></li>)}
                </ul>
              </div>
            )
          })}
        </section>

        <div className="stack">
          <section className="card" aria-labelledby="ev-h">
            <div className="row spread"><h2 id="ev-h" className="mb-0">Coming up</h2><Link to="/events" className="small">All meets</Link></div>
            {data.upcoming_events.length === 0 ? <p className="muted" style={{ marginTop: '.8rem' }}>No meets or interview days planned. <Link to="/events">Plan one</Link></p> : (
              <ul className="plain mini">
                {data.upcoming_events.map((e) => (
                  <li key={e.id}><Link to={`/events/${e.id}`}><b>{e.name}</b><span className="muted small">{new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}{e.venue ? ` · ${e.venue}` : ''}</span></Link></li>
                ))}
              </ul>
            )}
          </section>
          <section className="card" aria-labelledby="rec-h">
            <div className="row spread"><h2 id="rec-h" className="mb-0">Latest applications</h2><Link to="/applications" className="small">View all</Link></div>
            {data.recent.length === 0 ? <p className="muted" style={{ marginTop: '.8rem' }}>Nothing submitted yet.</p> : (
              <ul className="plain mini">
                {data.recent.map((r) => (
                  <li key={r.id}>
                    <Link to={`/applications/${r.id}`}>
                      <b>{r.name || 'Unnamed'}</b>
                      <span className="muted small">{r.application_no} · {r.course || 'no course yet'} · {when(r.at)}</span>
                    </Link>
                    <span className={`badge ${STATUS[r.status]?.tone}`}>{STATUS[r.status]?.en}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
