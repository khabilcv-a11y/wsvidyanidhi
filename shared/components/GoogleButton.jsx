import { useEffect, useRef, useState } from 'react'
import { config } from '../lib/api.js'
import { useI18n } from '../lib/i18n.jsx'
import { isDemo } from '../lib/demo.js'

// Real Google button when a client ID is configured. Otherwise a developer sign-in that only works
// against the local dev backend (the production backend rejects it).
export default function GoogleButton({ onCredential, disabled }) {
  const { t, lang } = useI18n()
  const clientId = config().googleClientId
  const host = useRef(null)
  const [dev, setDev] = useState({ email: '', name: '' })

  useEffect(() => {
    if (!clientId) return undefined
    let timer
    const init = () => {
      if (!window.google?.accounts?.id) {
        timer = setTimeout(init, 250)
        return
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (r) => onCredential(r.credential),
      })
      host.current.innerHTML = ''
      window.google.accounts.id.renderButton(host.current, {
        theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 320, locale: lang,
      })
    }
    init()
    return () => clearTimeout(timer)
  }, [clientId, lang, onCredential])

  if (isDemo()) {
    return <button type="button" className="btn accent block" disabled={disabled} onClick={() => onCredential('demo')}>Enter the demo</button>
  }
  if (clientId) return <div ref={host} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />
  if (!import.meta.env.DEV) return null // no Google sign-in configured yet: only email sign-in is offered

  return (
    <form
      className="card flat"
      onSubmit={(e) => {
        e.preventDefault()
        onCredential(`dev:${dev.email.trim()}|${dev.name.trim()}`)
      }}
    >
      <p className="small muted mt-0"><strong>{t('devNote')}</strong></p>
      <div className="field">
        <label htmlFor="dev-email">{t('email')}</label>
        <input id="dev-email" type="email" required value={dev.email} onChange={(e) => setDev({ ...dev, email: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="dev-name">{t('fullName')}</label>
        <input id="dev-name" value={dev.name} onChange={(e) => setDev({ ...dev, name: e.target.value })} />
      </div>
      <button className="btn outline block" disabled={disabled}>{t('continueGoogle')}</button>
    </form>
  )
}
