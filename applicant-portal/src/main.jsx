import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@shared/styles.css'
import { applyPrefs } from '@shared/a11y.js'
import { I18nProvider } from '@shared/lib/i18n.jsx'
import { AuthProvider } from '@shared/lib/auth.jsx'
import App from './App.jsx'

applyPrefs()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  </StrictMode>,
)
