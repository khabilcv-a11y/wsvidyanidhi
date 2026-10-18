import { NavLink, Route, Routes } from 'react-router-dom'
import { useAuth } from '@shared/lib/auth.jsx'
import Brand from '@shared/components/Brand.jsx'
import AccessMenu from '@shared/components/AccessMenu.jsx'
import Dashboard from './Dashboard.jsx'
import ApplicationList from './ApplicationList.jsx'
import ApplicationDetail from './ApplicationDetail.jsx'
import Users from './Users.jsx'
import AuditLog from './AuditLog.jsx'

const Icon = ({ d }) => <svg viewBox="0 0 24 24" aria-hidden="true">{d}</svg>
const ICONS = {
  home: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  files: <><path d="M8 3h8l4 4v14H8z" /><path d="M16 3v4h4M5 7v14h11" /></>,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14c2.8 0 5 2 5 5" /></>,
  log: <><path d="M5 4h14v16H5z" /><path d="M9 9h6M9 13h6M9 17h3" /></>,
}

export default function AdminShell() {
  const { user, signOut } = useAuth()
  const master = user.role === 'master'
  return (
    <div className="admin">
      <a className="skip-link" href="#main">Skip to main content</a>
      <aside className="side">
        <Brand sub="Committee portal" />
        <nav aria-label="Main">
          <span className="group">Work</span>
          <NavLink to="/" end><Icon d={ICONS.home} />Dashboard</NavLink>
          <NavLink to="/applications"><Icon d={ICONS.files} />Applications</NavLink>
          {master && <span className="group">Administration</span>}
          {master && <NavLink to="/users"><Icon d={ICONS.people} />Staff</NavLink>}
          {master && <NavLink to="/audit"><Icon d={ICONS.log} />Audit log</NavLink>}
        </nav>
        <div className="foot">
          <div>{user.name || user.email}<br /><span className="small">{master ? 'Master admin' : 'Admin'}</span></div>
          <div className="row" style={{ gap: '.4rem', marginTop: '.6rem' }}>
            <AccessMenu />
            <button className="btn outline small" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </aside>
      <div className="admin-main">
        <main id="main" className="wrap page" tabIndex={-1} style={{ width: 'min(100% - 2.5rem, 1120px)' }}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="applications" element={<ApplicationList />} />
            <Route path="applications/:id" element={<ApplicationDetail />} />
            {master && <Route path="users" element={<Users />} />}
            {master && <Route path="audit" element={<AuditLog />} />}
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
