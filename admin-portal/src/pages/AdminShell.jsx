import { NavLink, Route, Routes } from 'react-router-dom'
import { useAuth } from '@shared/lib/auth.jsx'
import Brand from '@shared/components/Brand.jsx'
import AccessMenu from '@shared/components/AccessMenu.jsx'
import Dashboard from './Dashboard.jsx'
import ApplicationList from './ApplicationList.jsx'
import ApplicationDetail from './ApplicationDetail.jsx'
import Users from './Users.jsx'
import AuditLog from './AuditLog.jsx'

export default function AdminShell() {
  const { user, signOut } = useAuth()
  const master = user.role === 'master'
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="topbar">
        <div className="wrap">
          <Brand title="Vidyanidhi" sub="Committee portal" />
          <nav className="nav" aria-label="Main">
            <NavLink to="/" end>Dashboard</NavLink>
            <NavLink to="/applications">Applications</NavLink>
            {master && <NavLink to="/users">Staff</NavLink>}
            {master && <NavLink to="/audit">Audit log</NavLink>}
          </nav>
          <div className="row" style={{ gap: '.4rem' }}>
            <AccessMenu />
            <span className="small muted" title={user.email}>{user.role === 'master' ? 'Master admin' : 'Admin'}</span>
            <button className="btn ghost small" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </header>
      <main id="main" className="wrap page" tabIndex={-1}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="applications" element={<ApplicationList />} />
          <Route path="applications/:id" element={<ApplicationDetail />} />
          {master && <Route path="users" element={<Users />} />}
          {master && <Route path="audit" element={<AuditLog />} />}
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
    </>
  )
}
