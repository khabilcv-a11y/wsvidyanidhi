import { isDemo } from '../lib/demo.js'
import { setToken } from '../lib/api.js'

// A thin strip shown only in demo mode, so nobody mistakes sample data for real records.
export default function DemoBanner() {
  if (!isDemo()) return null
  const exit = () => {
    setToken(null)
    window.location.href = window.location.pathname + '?demo=off'
  }
  return (
    <div role="note" style={{ background: '#fff3cd', color: '#3b2a00', fontSize: '.85rem', padding: '.4rem 1rem', textAlign: 'center', borderBottom: '1px solid #ecd58a' }}>
      <strong>Demo mode.</strong> Sample data only, nothing is saved or sent. <button className="link-btn" onClick={exit} style={{ color: '#3b2a00' }}>Exit demo</button>
    </div>
  )
}
