import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@shared/styles.css'
import { applyPrefs } from '@shared/a11y.js'
import { I18nProvider } from '@shared/lib/i18n.jsx'
import { AuthProvider } from '@shared/lib/auth.jsx'
import App from './App.jsx'
import DemoBanner from '@shared/components/DemoBanner.jsx'

if (import.meta.env.DEV) {
  // local development: talk to the local backend and the other local sites
  window.__CONFIG__ = {
    ...window.__CONFIG__, apiUrl: 'http://localhost:8787', googleClientId: '', landingUrl: 'http://localhost:5170',
    applicantUrl: 'http://localhost:5173', adminUrl: 'http://localhost:5174',
  }
}

applyPrefs()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <DemoBanner />
          <App />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  </StrictMode>,
)
