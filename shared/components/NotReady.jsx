import { config } from '../lib/api.js'
import Brand from './Brand.jsx'

// Shown while the backend address has not been set yet (before the Google backend is connected).
export default function NotReady({ name }) {
  const landing = config().landingUrl || '/'
  return (
    <div className="auth-shell">
      <main id="main" className="narrow" tabIndex={-1}>
        <div className="card">
          <Brand sub={name} href={landing} />
          <h1 style={{ fontSize: '1.7rem', marginTop: '1.5rem' }}>Opening soon</h1>
          <p>This portal is being set up and is not open yet. Please check back shortly, or contact the scholarship office.</p>
          <p className="mb-0">Phone: <a href="tel:+917560902902">+91 7560902902</a><br />Email: <a href="mailto:wisdomstudentskerala@gmail.com">wisdomstudentskerala@gmail.com</a></p>
          <p className="row" style={{ marginTop: '1.25rem' }}><a className="btn accent" href="/login?demo">Try the demo</a> <a className="btn outline" href={landing}>Back to the scholarship website</a></p>
          <p className="small muted">The demo uses sample data only. Nothing you enter is saved or sent.</p>
        </div>
      </main>
    </div>
  )
}
