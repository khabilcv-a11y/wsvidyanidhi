import { Link } from 'react-router-dom'
import { useAuth } from '@shared/lib/auth.jsx'
import { STATUS } from '@shared/lib/constants.js'
import { useLoad } from './useLoad.js'

const Ico = ({ children }) => <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>

// Pipeline order, grouped so the bar reads left to right as the work happens.
const PIPELINE = [
  ['submitted', 'documents_requested', 'under_verification'],
  ['interview_scheduled', 'decision_pending'],
  ['selected', 'active', 'renewal_due', 'renewal_review'],
  ['on_hold', 'waitlisted', 'not_selected', 'discontinued', 'completed'],
]
const GROUP_NAME = ['Review', 'Interview', 'Scholars', 'Closed or paused']
const TONE = { warn: 'var(--warn)', info: 'var(--info)', ok: 'var(--ok)', danger: 'var(--red)', '': 'var(--line-strong)' }

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data, error, loading } = useLoad('admin.dashboard')
  if (loading) return <p role="status"><span className="spinner" />Loading…</p>
  if (error) return <p className="alert error" role="alert">{error}</p>

  const first = (user.name || user.email).split(/[ @]/)[0]
  const total = data.total || 1
  const attention = [
    { n: data.docs_to_review, text: 'documents waiting for review', to: '/applications?status=submitted', tone: 'warn' },
    { n: data.verifications_due, text: 'field visits not yet reported', to: '/applications?status=under_verification', tone: 'info' },
    { n: data.claims, text: 'record links to approve', to: '/applications', tone: 'info' },
    { n: data.needs_call, text: 'applicants who need a phone call', to: '/applications?status=documents_requested', tone: 'danger' },
  ].filter((a) => a.n)

  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <p className="small muted mb-0">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>{greeting()}, {first}</h1>
        </div>
        <Link className="btn accent" to="/applications">Open applications <span className="arr" aria-hidden="true">→</span></Link>
      </div>

      <div className="kpis">
        <div className="card kpi"><span className="ic"><Ico><path d="M8 3h8l4 4v14H8z" /><path d="M16 3v4h4" /></Ico></span><b>{data.total}</b><span>Applications</span></div>
        <div className="card kpi"><span className="ic warn"><Ico><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Ico></span><b>{data.docs_to_review}</b><span>Documents to review</span></div>
        <div className="card kpi"><span className="ic info"><Ico><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M17 11l2 2 3-4" /></Ico></span><b>{data.pending_items}</b><span>Waiting on applicants</span></div>
        <div className="card kpi"><span className="ic bad"><Ico><path d="M5 4l3 3-1.5 2.5a11 11 0 0 0 5.5 5.5L14 13.5l3 3-1 3c-8 0-14-6-14-14z" /></Ico></span><b>{data.needs_call}</b><span>Need a phone call</span></div>
      </div>

      <div className="grid cols-2" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }}>
        <section className="card" aria-labelledby="pipe-h">
          <h2 id="pipe-h">Pipeline</h2>
          {data.total === 0 && <p className="muted mb-0">No applications yet.</p>}
          {PIPELINE.map((group, gi) => {
            const items = group.filter((s) => data.counts[s])
            if (items.length === 0) return null
            const sum = items.reduce((s, k) => s + data.counts[k], 0)
            return (
              <div key={gi} style={{ marginBottom: '1.25rem' }}>
                <div className="row spread small"><strong>{GROUP_NAME[gi]}</strong><span className="muted">{sum}</span></div>
                <div className="bars" role="img" aria-label={`${GROUP_NAME[gi]}: ${sum} applications`}>
                  {items.map((s) => <span key={s} style={{ flexGrow: data.counts[s], background: TONE[STATUS[s].tone] }} title={`${STATUS[s].en}: ${data.counts[s]}`} />)}
                </div>
                <ul className="legend">
                  {items.map((s) => (
                    <li key={s}><i style={{ background: TONE[STATUS[s].tone] }} /><Link to={`/applications?status=${s}`}>{STATUS[s].en}</Link><b>{data.counts[s]}</b><span className="muted">{Math.round((data.counts[s] / total) * 100)}%</span></li>
                  ))}
                </ul>
              </div>
            )
          })}
        </section>

        <section className="card" aria-labelledby="attn-h">
          <h2 id="attn-h">Needs attention</h2>
          {attention.length === 0 && <p className="muted mb-0">Nothing is waiting. You are up to date.</p>}
          <ul className="attn">
            {attention.map((a) => (
              <li key={a.text}>
                <Link to={a.to}><span className={`badge ${a.tone}`}>{a.n}</span><span>{a.text}</span><span className="arr" aria-hidden="true">→</span></Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
