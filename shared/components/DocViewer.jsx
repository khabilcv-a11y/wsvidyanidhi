import { useEffect, useRef, useState } from 'react'
import { base64ToBlobUrl } from '../lib/api.js'

// Shows a private document. `load()` returns { mime, data (base64) }; nothing is ever a public link.
export default function DocViewer({ title, load, onClose }) {
  const [state, setState] = useState({ url: null, mime: '', error: null })
  const closeRef = useRef(null)

  useEffect(() => {
    let url
    let alive = true
    load()
      .then((f) => {
        url = base64ToBlobUrl(f.data, f.mime)
        if (alive) setState({ url, mime: f.mime, error: null })
      })
      .catch((e) => alive && setState({ url: null, mime: '', error: e.message }))
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [load])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="box" onClick={(e) => e.stopPropagation()}>
        <div className="row spread">
          <h2 className="mb-0" style={{ fontSize: '1.2rem' }}>{title}</h2>
          <button ref={closeRef} className="btn outline small" onClick={onClose}>Close</button>
        </div>
        <div style={{ marginTop: '1rem' }}>
          {state.error && <p className="alert error" role="alert">{state.error}</p>}
          {!state.url && !state.error && <p className="muted" role="status"><span className="spinner" />Loading…</p>}
          {state.url && (state.mime === 'application/pdf'
            ? <iframe src={state.url} title={title} />
            : <img src={state.url} alt={title} />)}
        </div>
      </div>
    </div>
  )
}
