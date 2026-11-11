import { useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from '@shared/lib/auth.jsx'
import Brand from '@shared/components/Brand.jsx'
import AccessMenu from '@shared/components/AccessMenu.jsx'
import Dashboard from './Dashboard.jsx'
import ApplicationList from './ApplicationList.jsx'
import ApplicationDetail from './ApplicationDetail.jsx'
import Events from './Events.jsx'
import EventDetail from './EventDetail.jsx'
import Renewals from './Renewals.jsx'
import BankDetails from './BankDetails.jsx'
import Payments from './Payments.jsx'
import Reports from './Reports.jsx'
import Claims from './Claims.jsx'
import Settings from './Settings.jsx'
import Users from './Users.jsx'
import AuditLog from './AuditLog.jsx'

const Icon = ({ d }) => <svg viewBox="0 0 24 24" aria-hidden="true">{d}</svg>
const ICONS = {
  home: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  files: <><path d="M8 3h8l4 4v14H8z" /><path d="M16 3v4h4M5 7v14h11" /></>,
  event: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  renew: <><path d="M20 12a8 8 0 1 1-2.5-5.8" /><path d="M20 4v5h-5" /></>,
  bank: <path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />,
  pay: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14c2.8 0 5 2 5 5" /></>,
  log: <><path d="M5 4h14v16H5z" /><path d="M9 9h6M9 13h6M9 17h3" /></>,
}

function Item({ to, icon, end, children }) {
  return <NavLink to={to} end={end}><Icon d={ICONS[icon]} />{children}</NavLink>
}

function QuickFind() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  return (
    <form className="quickfind" role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/applications?q=${encodeURIComponent(q.trim())}`) }}>
      <label htmlFor="qf" className="visually-hidden">Find an applicant</label>
      <input id="qf" placeholder="Find an applicant: number, name or mobile" value={q} onChange={(e) => setQ(e.target.value)} />
      <button className="btn small" type="submit">Find</button>
    </form>
  )
}

export default function AdminShell() {
  const { user, signOut } = useAuth()
  const master = user.role === 'master'
  const finance = master || user.finance
  return (
    <div className="admin">
      <a className="skip-link" href="#main">Skip to main content</a>
      <aside className="side">
        <Brand sub="Committee portal" />
        <nav aria-label="Main">
          <span className="group">Work</span>
          <Item to="/" end icon="home">Dashboard</Item>
          <Item to="/applications" icon="files">Applications</Item>
          <Item to="/events" icon="event">Meets and interviews</Item>
          <Item to="/renewals" icon="renew">Renewals</Item>
          {finance && <span className="group">Money</span>}
          {finance && <Item to="/bank" icon="bank">Bank details</Item>}
          {finance && <Item to="/payments" icon="pay">Payments</Item>}
          <span className="group">Insights</span>
          <Item to="/reports" icon="chart">Reports</Item>
          <span className="group">Administration</span>
          <Item to="/claims" icon="link">Record links</Item>
          {master && <Item to="/settings" icon="gear">Scheme years and settings</Item>}
          {master && <Item to="/users" icon="people">Staff</Item>}
          {master && <Item to="/audit" icon="log">Audit log</Item>}
        </nav>
        <div className="foot">
          <div>{user.name || user.email}<br /><span className="small">{master ? 'Master admin' : finance ? 'Admin, finance' : 'Admin'}</span></div>
          <div className="row" style={{ gap: '.4rem', marginTop: '.6rem' }}>
            <AccessMenu />
            <button className="btn outline small" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </aside>
      <div className="admin-main">
        <div className="topbar-admin"><QuickFind /></div>
        <main id="main" className="page" tabIndex={-1}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="applications" element={<ApplicationList />} />
            <Route path="applications/:id" element={<ApplicationDetail />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="renewals" element={<Renewals />} />
            {finance && <Route path="bank" element={<BankDetails />} />}
            {finance && <Route path="payments" element={<Payments />} />}
            <Route path="reports" element={<Reports />} />
            <Route path="claims" element={<Claims />} />
            {master && <Route path="settings" element={<Settings />} />}
            {master && <Route path="users" element={<Users />} />}
            {master && <Route path="audit" element={<AuditLog />} />}
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
